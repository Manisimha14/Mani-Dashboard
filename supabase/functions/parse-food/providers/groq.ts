import { PARSE_SYSTEM_PROMPT } from "../prompts.ts";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_TIMEOUT_MS = 1500;
const MODEL = "llama-3.3-70b-versatile"; // Recommended by user for speed and quality

export async function parseWithGroq(input: string, apiKey: string): Promise<{ data?: any; latency: number; error?: string }> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

    try {
        const response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: "system", content: PARSE_SYSTEM_PROMPT },
                    { role: "user", content: input }
                ],
                response_format: { type: "json_object" },
                temperature: 0.1,
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Groq API error: ${response.status}`);
        }

        const json = await response.json();
        const content = json.choices[0].message.content;
        
        return {
            data: JSON.parse(content),
            latency: Date.now() - startTime
        };
    } catch (e: any) {
        clearTimeout(timeoutId);
        return {
            error: e.name === 'AbortError' ? 'Groq timeout exceeded' : e.message,
            latency: Date.now() - startTime
        };
    }
}
