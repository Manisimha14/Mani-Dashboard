import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { chatQuery, chatHistory, mealData, userGoal } = await req.json();
        const corsHeadersWithJson = { ...corsHeaders, 'Content-Type': 'application/json' };

        const geminiKey = Deno.env.get('GEMINI_API_KEY');
        if (!geminiKey) {
            return new Response(JSON.stringify({ error: "Gemini API key not configured" }), {
                status: 500, headers: corsHeadersWithJson
            });
        }

        if (!chatQuery || !mealData) {
            return new Response(JSON.stringify({ error: "Missing chatQuery or mealData" }), {
                status: 400, headers: corsHeadersWithJson
            });
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;

        // 1. Build prompt with safety guardrails and structured context
        const systemInstruction = `You are Mani's elite AI Health, Nutrition, and Fitness Coach.
The user is currently looking at this logged meal:
${JSON.stringify(mealData, null, 2)}

User's active health/fitness goal: ${userGoal || 'General Health'}

CRITICAL COACHING INSTRUCTIONS:
1. Provide a highly customized, friendly, motivational, and actionable response in clean Markdown.
2. Rely strictly on the nutritional totals and items from the provided meal schema. Do not hallucinate different values.
3. Keep answers concise: 3 to 4 sentences maximum.
4. MEDICAL SAFETY LIMITATION: Under no circumstances should you diagnose clinical illnesses, prescribe medications, or recommend dangerous starvation deficits. If asked about clinical health issues or medication, politely suggest consulting a primary care physician.`;

        // 2. Map conversation history to Gemini contents schema
        const contents = [];

        // Add history
        if (chatHistory && Array.isArray(chatHistory)) {
            for (const msg of chatHistory) {
                contents.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                });
            }
        }

        // Append current query
        contents.push({
            role: 'user',
            parts: [{ text: chatQuery }]
        });

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: systemInstruction }]
                },
                contents,
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 300
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini Chat API error: ${response.status}`);
        }

        const json = await response.json();
        const reply = json.candidates?.[0]?.content?.parts?.[0]?.text || "I'm having trouble analyzing that right now.";

        return new Response(JSON.stringify({ reply }), { headers: corsHeadersWithJson });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
