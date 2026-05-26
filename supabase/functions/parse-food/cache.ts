import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export async function getCachedParseResult(supabase: SupabaseClient, hash: string): Promise<unknown | null> {
    try {
        const { data, error } = await supabase
            .from('meal_logs')
            .select(`
                meal_type,
                confidence,
                confidence_reason,
                total_calories,
                protein,
                carbs,
                fat,
                fiber,
                meal_items (
                    food_name,
                    quantity,
                    unit,
                    calories,
                    protein,
                    carbs,
                    fat,
                    fiber,
                    estimated
                )
            `)
            .eq('raw_input_hash', hash)
            // .eq('edited_by_user', false) // Optionally only reuse unedited AI results
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !data) {
            return null;
        }

        // Reconstruct the JSON structure
        return {
            meal_type: data.meal_type,
            confidence: data.confidence,
            confidence_reason: data.confidence_reason,
            items: data.meal_items,
            totals: {
                calories: data.total_calories,
                protein: data.protein,
                carbs: data.carbs,
                fat: data.fat,
                fiber: data.fiber
            }
        };
    } catch (e) {
        console.error("Cache lookup failed:", e);
        return null;
    }
}
