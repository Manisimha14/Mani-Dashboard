import { PARSE_SYSTEM_PROMPT } from "../prompts.ts";

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
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
        
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

const WEEKLY_MENU_SYSTEM_PROMPT = `You are a meal plan parser. Given raw text extracted from a PDF, Excel, or document that contains a weekly meal plan, extract a structured JSON object.

RULES:
1. Identify each day (Monday through Sunday, or Day 1–7, or by date).
2. For each day, identify meal slots: breakfast, lunch, dinner, snack.
3. For each meal, list all dishes/food items mentioned.
4. For each dish, estimate a default quantity and unit (e.g., "2 chapatis", "1 bowl dal", "1 cup rice").
5. If quantity is not mentioned, use sensible defaults (1 serving, 1 bowl, etc.).
6. Return ONLY valid JSON. No markdown, no explanation.

OUTPUT FORMAT (JSON):
{
  "weeklyMenu": [
    {
      "day": "Monday",
      "date": null,
      "meals": [
        {
          "mealType": "breakfast",
          "dishes": [
            { "name": "Idli", "quantity": 3, "unit": "pieces" },
            { "name": "Sambar", "quantity": 1, "unit": "bowl" }
          ]
        },
        {
          "mealType": "lunch",
          "dishes": [
            { "name": "Rice", "quantity": 1, "unit": "cup" }
          ]
        },
        {
          "mealType": "dinner",
          "dishes": [
            { "name": "Chapati", "quantity": 2, "unit": "pieces" }
          ]
        }
      ]
    }
  ]
}

If a day has no meals detected, omit it. If a meal has no dishes, omit it.`;

export async function parseWeeklyMenuWithGemini(
    menuText: string,
    apiKey: string
): Promise<{ weeklyMenu?: unknown[]; latency: number; error?: string }> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MENU_PARSE_TIMEOUT_MS);

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: WEEKLY_MENU_SYSTEM_PROMPT }]
                },
                contents: [{
                    parts: [{
                        text: `Parse the following weekly meal plan:\n\n${menuText.slice(0, 15000)}`
                    }]
                }],
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
