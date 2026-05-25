import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export const FoodItemSchema = z.object({
  food_name: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.enum(["g", "ml", "piece", "cup", "tbsp", "tsp", "packet", "serving"]),
  calories: z.number().min(0).max(4000), // Reject crazy values per item
  protein: z.number().min(0).max(300),
  carbs: z.number().min(0).max(600),
  fat: z.number().min(0).max(200),
  fiber: z.number().min(0).max(100),
  estimated: z.boolean()
}).strict();

export const NutritionSchema = z.object({
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]).default("snack"),
  confidence: z.enum(["high", "medium", "low"]),
  confidence_reason: z.string().nullable().optional(),
  items: z.array(FoodItemSchema).min(1),
  totals: z.object({
    calories: z.number().min(0).max(8000), // Max total meal sanity check
    protein: z.number().min(0),
    carbs: z.number().min(0),
    fat: z.number().min(0),
    fiber: z.number().min(0)
  })
}).strict().refine((data) => {
    // Basic macro math sanity check (Protein*4 + Carbs*4 + Fat*9 approx = Calories)
    const calculatedCals = Math.round((data.totals.protein * 4) + (data.totals.carbs * 4) + (data.totals.fat * 9));
    const providedCals = data.totals.calories;
    
    // Allow for a 20% margin of error due to rounding or dietary fiber adjustments
    const margin = providedCals * 0.2;
    if (providedCals > 0 && Math.abs(calculatedCals - providedCals) > Math.max(margin, 50)) {
        return false;
    }
    return true;
}, {
    message: "Macros do not add up to total calories",
});

export type ValidatedNutritionData = z.infer<typeof NutritionSchema>;

export function validateNutrition(data: unknown): { success: boolean; data?: ValidatedNutritionData; error?: string } {
    try {
        const parsed = NutritionSchema.parse(data);
        return { success: true, data: parsed };
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return { success: false, error: message };
    }
}
