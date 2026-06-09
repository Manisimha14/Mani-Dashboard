import { PARSE_SYSTEM_PROMPT, WEEKLY_MENU_SYSTEM_PROMPT } from "../prompts.ts";

const GEMINI_TIMEOUT_MS = 3000;
const MENU_PARSE_TIMEOUT_MS = 25000;  // Menus need more time
const MODEL = "gemini-1.5-flash";

export async function parseWithGemini(
    input: string, 
    apiKey: string, 
    image?: { data: string; mimeType: string }
): Promise<{ data?: unknown; latency: number; error?: string }> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

    try {
        const url = `https://generativelanguage.googleapis.com/v1/models/${MODEL}:generateContent?key=${apiKey}`;
        
        const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
            { text: input || "Identify the food in this image and estimate the nutritional content." }
        ];

        if (image) {
            parts.push({
                inlineData: {
                    mimeType: image.mimeType,
                    data: image.data
                }
            });
        }

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: PARSE_SYSTEM_PROMPT }]
                },
                contents: [
                    { parts }
                ],
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.2
                }
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const json = await response.json() as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const content = json.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!content) {
            throw new Error("No content returned from Gemini");
        }

        return {
            data: JSON.parse(content),
            latency: Date.now() - startTime
        };
    } catch (e: unknown) {
        clearTimeout(timeoutId);
        const message = e instanceof Error ? e.message : String(e);
        return {
            error: message === 'AbortError' ? 'Gemini timeout exceeded' : message,
            latency: Date.now() - startTime
        };
    }
}

// ─── Weekly Menu Parser ───────────────────────────────────────────────────────



export async function parseWeeklyMenuWithGemini(
    menuText: string,
    apiKey: string,
    image?: { data: string; mimeType: string }
): Promise<{ weeklyMenu?: unknown[]; latency: number; error?: string }> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MENU_PARSE_TIMEOUT_MS);

    try {
        const url = `https://generativelanguage.googleapis.com/v1/models/${MODEL}:generateContent?key=${apiKey}`;

        // Build the content parts — image takes priority, text is supplementary
        const userParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

        if (image) {
            userParts.push({
                inlineData: {
                    mimeType: image.mimeType,
                    data: image.data
                }
            });
            userParts.push({
                text: menuText || 'This is a weekly meal plan. Extract all days, meals (breakfast/lunch/dinner), and dishes with quantities.'
            });
        } else {
            userParts.push({
                text: `Parse the following weekly meal plan:\n\n${menuText.slice(0, 15000)}`
            });
        }

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: WEEKLY_MENU_SYSTEM_PROMPT }]
                },
                contents: [{ parts: userParts }],
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.1,
                    maxOutputTokens: 4096
                }
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errBody = await response.text().catch(() => '');
            throw new Error(`Gemini API error ${response.status}: ${errBody}`);
        }

        const json = await response.json() as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const content = json.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!content) throw new Error("No content returned from Gemini for menu parse");

        const parsed = JSON.parse(content);
        const weeklyMenu = parsed?.weeklyMenu;

        if (!Array.isArray(weeklyMenu) || weeklyMenu.length === 0) {
            throw new Error("AI could not detect any days or meals in the menu.");
        }

        return { weeklyMenu, latency: Date.now() - startTime };
    } catch (e: unknown) {
        clearTimeout(timeoutId);
        const message = e instanceof Error ? e.message : String(e);
        return {
            error: message.includes('AbortError') ? 'Menu parse timed out — file may be too large' : message,
            latency: Date.now() - startTime
        };
    }
}

