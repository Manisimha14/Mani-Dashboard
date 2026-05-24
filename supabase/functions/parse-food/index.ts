import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { normalizeInput, generateInputHash } from "./normalizer.ts";
import { getCachedParseResult } from "./cache.ts";
import { parseWithGroq } from "./providers/groq.ts";
import { parseWithGemini } from "./providers/gemini.ts";
import { validateNutrition } from "./validators/nutrition.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { input, image, mealTypeHint } = await req.json();
        const hasImage = !!(image && image.data && image.mimeType);
        
        if (!hasImage && (!input || typeof input !== 'string')) {
            return new Response(JSON.stringify({ error: "Missing or invalid input" }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        let normalizedInput = input ? normalizeInput(input) : "";
        if (mealTypeHint && typeof mealTypeHint === 'string') {
            normalizedInput += `\n(Local time hint: current meal context is ${mealTypeHint})`;
        }
        const inputHash = hasImage ? `image-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` : await generateInputHash(normalizedInput);

        // 1. Cache Lookup (only for pure text logs)
        if (!hasImage) {
            const cached = await getCachedParseResult(supabaseClient, inputHash);
            if (cached) {
                return new Response(JSON.stringify({
                    data: cached,
                    meta: { provider: 'cache', latency_ms: 0, raw_input_hash: inputHash }
                }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
        }

        // Rate limiting check could go here using Supabase Redis / Upstash (omitted for brevity)

        const groqKey = Deno.env.get('GROQ_API_KEY');
        const geminiKey = Deno.env.get('GEMINI_API_KEY');

        if (!groqKey || !geminiKey) {
            return new Response(JSON.stringify({ error: "API keys not configured" }), {
                status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        let provider = 'groq';
        let parseResult;
        let validationResult;

        if (hasImage) {
            // 2. Multimodal Parser: Gemini
            provider = 'gemini';
            parseResult = await parseWithGemini(normalizedInput, geminiKey, image);
            validationResult = parseResult.data ? validateNutrition(parseResult.data) : { success: false, error: parseResult.error };
        } else {
            // 2. Primary Parser for Text: Groq
            provider = 'groq';
            parseResult = await parseWithGroq(normalizedInput, groqKey);
            validationResult = parseResult.data ? validateNutrition(parseResult.data) : { success: false, error: parseResult.error };

            // 3. Fallback: Gemini (if Groq fails, timeouts, produces invalid JSON, or has LOW confidence)
            if (
                !validationResult.success || 
                (validationResult.data && validationResult.data.confidence === 'low')
            ) {
                provider = 'gemini';
                console.log(`Groq failed or low confidence. Falling back to Gemini. Reason: ${validationResult.error || 'low confidence'}`);
                
                parseResult = await parseWithGemini(normalizedInput, geminiKey);
                validationResult = parseResult.data ? validateNutrition(parseResult.data) : { success: false, error: parseResult.error };
            }
        }

        if (!validationResult.success || !validationResult.data) {
            return new Response(JSON.stringify({ 
                error: "Failed to parse nutrition data reliably",
                details: validationResult.error 
            }), {
                status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            data: validationResult.data,
            meta: { 
                provider, 
                latency_ms: parseResult.latency, 
                raw_input_hash: inputHash 
            }
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
