import { PARSE_SYSTEM_PROMPT } from "../prompts.ts";

const GEMINI_TIMEOUT_MS = 3000;
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
