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

        const groqKey = Deno.env.get('GROQ_API_KEY');
        const geminiKey = Deno.env.get('GEMINI_API_KEY');

        if (!groqKey && !geminiKey) {
            return new Response(JSON.stringify({ error: "AI API keys not configured in Supabase secrets." }), {
                status: 500, headers: corsHeadersWithJson
            });
        }

        if (!chatQuery || !mealData) {
            return new Response(JSON.stringify({ error: "Missing chatQuery or mealData" }), {
                status: 400, headers: corsHeadersWithJson
            });
        }

        // 1. Build context-aware prompt with safety guardrails
        const systemInstruction = `You are Mani's elite AI Health, Nutrition, and Fitness Coach.
The user is currently looking at this logged meal:
${JSON.stringify(mealData, null, 2)}

User's active health/fitness goal: ${userGoal || 'General Health'}

CRITICAL COACHING INSTRUCTIONS:
1. Provide a highly customized, friendly, motivational, and actionable response in clean Markdown.
2. Rely strictly on the nutritional totals and items from the provided meal schema. Do not hallucinate different values.
3. Keep answers concise: 3 to 4 sentences maximum.
4. MEDICAL SAFETY LIMITATION: Under no circumstances should you diagnose clinical illnesses, prescribe medications, or recommend dangerous starvation deficits. If asked about clinical health issues or medication, politely suggest consulting a primary care physician.`;

        let reply = "";
        let success = false;
        let errorDetails = "";

        // ─── 1. PRIMARY PROVIDER: GROQ (llama-3.3-70b-versatile) ───
        if (groqKey) {
            try {
                const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${groqKey}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: "llama-3.3-70b-versatile",
                        messages: [
                            { role: "system", content: systemInstruction },
                            ...(chatHistory || []).map((msg: any) => ({
                                role: msg.role === 'user' ? 'user' : 'assistant',
                                content: msg.content
                            })),
                            { role: "user", content: chatQuery }
                        ],
                        temperature: 0.7,
                        max_tokens: 300
                    })
                });

                if (response.ok) {
                    const json = await response.json();
                    reply = json.choices[0].message.content;
                    success = true;
                } else {
                    const errText = await response.text();
                    errorDetails += `Groq Error (${response.status}): ${errText}\n`;
                }
            } catch (groqErr: any) {
                errorDetails += `Groq Exception: ${groqErr.message}\n`;
            }
        }

        // ─── 2. FALLBACK PROVIDER: GEMINI (gemini-1.5-flash) ───
        if (!success && geminiKey) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
                
                const contents = [];
                if (chatHistory && Array.isArray(chatHistory)) {
                    for (const msg of chatHistory) {
                        contents.push({
                            role: msg.role === 'user' ? 'user' : 'model',
                            parts: [{ text: msg.content }]
                        });
                    }
                }
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

                if (response.ok) {
                    const json = await response.json();
                    reply = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
                    success = true;
                } else {
                    const errText = await response.text();
                    errorDetails += `Gemini Error (${response.status}): ${errText}\n`;
                }
            } catch (geminiErr: any) {
                errorDetails += `Gemini Exception: ${geminiErr.message}\n`;
            }
        }

        if (!success) {
            throw new Error(`All health coaching AI systems failed.\nDetails:\n${errorDetails}`);
        }

        return new Response(JSON.stringify({ reply }), { headers: corsHeadersWithJson });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
