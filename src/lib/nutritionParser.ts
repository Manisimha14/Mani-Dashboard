interface MacroProfile {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  unit: string;
}

export const FOOD_DATABASE: Record<string, MacroProfile> = {
  // Cooked Prepared Indian Staples
  idly: { calories: 50, protein: 1.5, carbs: 11, fat: 0.2, unit: 'piece (cooked)' },
  idli: { calories: 50, protein: 1.5, carbs: 11, fat: 0.2, unit: 'piece (cooked)' },
  dosa: { calories: 120, protein: 3, carbs: 24, fat: 1.5, unit: 'plain (piece)' },
  'masala dosa': { calories: 350, protein: 6, carbs: 54, fat: 12, unit: 'piece' },
  roti: { calories: 85, protein: 3, carbs: 18, fat: 0.5, unit: 'piece (cooked)' },
  chapati: { calories: 85, protein: 3, carbs: 18, fat: 0.5, unit: 'piece (cooked)' },
  naan: { calories: 260, protein: 8, carbs: 45, fat: 5, unit: 'piece (cooked)' },
  'butter chicken': { calories: 380, protein: 28, carbs: 10, fat: 26, unit: '100g (cooked)' },
  'paneer butter masala': { calories: 340, protein: 12, carbs: 12, fat: 28, unit: '100g (cooked)' },
  'dal tadka': { calories: 120, protein: 6, carbs: 18, fat: 3.5, unit: '100g (cooked)' },
  'dal makhani': { calories: 160, protein: 5, carbs: 18, fat: 8, unit: '100g (cooked)' },
  biryani: { calories: 180, protein: 8, carbs: 24, fat: 6, unit: '100g (cooked)' },
  samosa: { calories: 260, protein: 4, carbs: 32, fat: 13, unit: 'piece' },
  samosas: { calories: 260, protein: 4, carbs: 32, fat: 13, unit: 'piece' },
  'chole bhature': { calories: 450, protein: 12, carbs: 55, fat: 20, unit: 'plate (cooked)' },
  upma: { calories: 180, protein: 4, carbs: 34, fat: 3.5, unit: '100g (cooked)' },
  poha: { calories: 160, protein: 3, carbs: 33, fat: 2, unit: '100g (cooked)' },
  khichdi: { calories: 120, protein: 4, carbs: 22, fat: 2, unit: '100g (cooked)' },
  sambar: { calories: 75, protein: 3, carbs: 12, fat: 1.5, unit: '100g (cooked)' },
  coconut_chutney: { calories: 180, protein: 2, carbs: 6, fat: 18, unit: '100g' },

  // Prepared Global Dishes
  pizza: { calories: 285, protein: 12, carbs: 36, fat: 10, unit: 'slice (medium)' },
  cheeseburger: { calories: 300, protein: 15, carbs: 33, fat: 12, unit: 'piece' },
  hamburger: { calories: 250, protein: 13, carbs: 31, fat: 9, unit: 'piece' },
  fries: { calories: 312, protein: 3.4, carbs: 41, fat: 15, unit: '100g (cooked)' },
  'french fries': { calories: 312, protein: 3.4, carbs: 41, fat: 15, unit: '100g (cooked)' },
  taco: { calories: 180, protein: 9, carbs: 16, fat: 9, unit: 'piece (cooked)' },
  burrito: { calories: 450, protein: 20, carbs: 55, fat: 16, unit: 'piece (cooked)' },
  sushi: { calories: 40, protein: 1.5, carbs: 8, fat: 0.3, unit: 'piece (cooked)' },
  pasta: { calories: 131, protein: 5, carbs: 25, fat: 1.1, unit: '100g (cooked)' },
  'pasta marinara': { calories: 120, protein: 3.5, carbs: 20, fat: 3, unit: '100g (cooked)' },
  lasagna: { calories: 135, protein: 9, carbs: 12, fat: 6, unit: '100g (cooked)' },
  caesar_salad: { calories: 190, protein: 4, carbs: 6, fat: 17, unit: '100g (prepared)' },
  'caesar salad': { calories: 190, protein: 4, carbs: 6, fat: 17, unit: '100g (prepared)' },
  pancakes: { calories: 90, protein: 2.4, carbs: 15, fat: 2.2, unit: 'piece' },
  waffles: { calories: 105, protein: 2.5, carbs: 14, fat: 4.5, unit: 'piece' },

  // Base raw ingredients
  egg: { calories: 70, protein: 6, carbs: 0.5, fat: 5, unit: 'piece' },
  eggs: { calories: 70, protein: 6, carbs: 0.5, fat: 5, unit: 'piece' },
  banana: { calories: 105, protein: 1.3, carbs: 27, fat: 0.3, unit: 'piece' },
  bananas: { calories: 105, protein: 1.3, carbs: 27, fat: 0.3, unit: 'piece' },
  apple: { calories: 95, protein: 0.5, carbs: 25, fat: 0.3, unit: 'piece' },
  apples: { calories: 95, protein: 0.5, carbs: 25, fat: 0.3, unit: 'piece' },
  bread: { calories: 80, protein: 3, carbs: 15, fat: 1, unit: 'slice' },
  toast: { calories: 80, protein: 3, carbs: 15, fat: 1, unit: 'slice' },
  chicken: { calories: 165, protein: 31, carbs: 0, fat: 3.6, unit: '100g' },
  'chicken breast': { calories: 165, protein: 31, carbs: 0, fat: 3.6, unit: '100g' },
  salmon: { calories: 208, protein: 20, carbs: 0, fat: 13, unit: '100g' },
  rice: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, unit: '100g' },
  oatmeal: { calories: 150, protein: 5, carbs: 27, fat: 2.5, unit: 'cup' },
  oats: { calories: 389, protein: 16.9, carbs: 66, fat: 6.9, unit: '100g' },
  milk: { calories: 120, protein: 8, carbs: 12, fat: 5, unit: 'cup' },
  protein: { calories: 120, protein: 24, carbs: 3, fat: 1.5, unit: 'scoop' },
  'protein powder': { calories: 120, protein: 24, carbs: 3, fat: 1.5, unit: 'scoop' },
  'protein shake': { calories: 180, protein: 30, carbs: 6, fat: 2.5, unit: 'serving' },
  avocado: { calories: 240, protein: 3, carbs: 12, fat: 22, unit: 'piece' },
  peanut: { calories: 190, protein: 7, carbs: 6, fat: 16, unit: 'tbsp' },
  'peanut butter': { calories: 190, protein: 7, carbs: 6, fat: 16, unit: 'tbsp' },
  butter: { calories: 100, protein: 0.1, carbs: 0.1, fat: 11, unit: 'tbsp' },
  oil: { calories: 120, protein: 0, carbs: 0, fat: 14, unit: 'tbsp' },
  coffee: { calories: 2, protein: 0.3, carbs: 0, fat: 0, unit: 'cup' },
  espresso: { calories: 5, protein: 0.1, carbs: 0.5, fat: 0.1, unit: 'shot' },
  almond: { calories: 7, protein: 0.25, carbs: 0.6, fat: 0.6, unit: 'piece' },
  almonds: { calories: 160, protein: 6, carbs: 6, fat: 14, unit: 'oz' },
  whey: { calories: 120, protein: 24, carbs: 3, fat: 1.5, unit: 'scoop' },
};

export function parseNaturalLanguageNutrition(input: string): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  matched: boolean;
} {
  const normalized = input.toLowerCase().trim();
  if (!normalized) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0, matched: false };
  }

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let matched = false;

  let amount = 1;
  const foundNumbers = normalized.match(/(\d+(\.\d+)?)/g);
  if (foundNumbers && foundNumbers.length > 0) {
    const gramMatch = normalized.match(/(\d+(\.\d+)?)\s*(g|gram|grams)/);
    if (gramMatch) {
      amount = parseFloat(gramMatch[1]) / 100;
    } else {
      amount = parseFloat(foundNumbers[0]);
    }
  }

  for (const [key, profile] of Object.entries(FOOD_DATABASE)) {
    if (normalized.includes(key)) {
      matched = true;
      let multiplier = amount;
      
      if (profile.unit.includes('100g') && !normalized.includes('g') && !normalized.includes('gram')) {
        multiplier = amount * 1.5; // default 150g piece size
      }

      totalCalories += Math.round(profile.calories * multiplier);
      totalProtein += Math.round(profile.protein * multiplier);
      totalCarbs += Math.round(profile.carbs * multiplier);
      totalFat += Math.round(profile.fat * multiplier);
      break;
    }
  }

  return {
    calories: totalCalories,
    protein: totalProtein,
    carbs: totalCarbs,
    fat: totalFat,
    matched,
  };
}

export interface OpenFoodFactsProduct {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  brand?: string;
  image?: string;
  source: 'Local Cooked DB' | 'USDA Survey Foods' | 'Global Barcode Store';
}

export async function searchOpenFoodFacts(query: string): Promise<OpenFoodFactsProduct[]> {
  const norm = query.toLowerCase().trim();
  if (!norm || norm.length < 2) return [];

  const results: OpenFoodFactsProduct[] = [];

  // 1. Query Local Curated Database for exact/fuzzy cooked dishes
  for (const [key, profile] of Object.entries(FOOD_DATABASE)) {
    if (key.includes(norm) || norm.includes(key)) {
      results.push({
        name: key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        brand: `Portion: 1 ${profile.unit}`,
        calories: profile.calories,
        protein: profile.protein,
        carbs: profile.carbs,
        fat: profile.fat,
        source: 'Local Cooked DB',
      });
    }
  }

  // 2. Query USDA FoodData Central (FNDDS Survey Database - Cooked Meals)
  try {
    const usdaResponse = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=DEMO_KEY&query=${encodeURIComponent(
        norm
      )}&dataType=Survey%20(FNDDS)&pageSize=5`
    );
    if (usdaResponse.ok) {
      const data = await usdaResponse.json();
      const foods = data.foods || [];
      foods.forEach((f: any) => {
        const nut = f.foodNutrients || [];
        const findNut = (id: number) => nut.find((n: any) => n.nutrientId === id)?.value ?? 0;
        
        // FNDDS Nutrient IDs: 1008 = Energy (kcal), 1003 = Protein, 1005 = Carb, 1004 = Fat
        const cals = findNut(1008);
        const prot = findNut(1003);
        const carbs = findNut(1005);
        const fat = findNut(1004);

        if (cals > 0) {
          results.push({
            name: f.description,
            brand: 'USDA Standard Cooked Dish (per 100g)',
            calories: Math.round(cals),
            protein: Math.round(prot * 10) / 10,
            carbs: Math.round(carbs * 10) / 10,
            fat: Math.round(fat * 10) / 10,
            source: 'USDA Survey Foods',
          });
        }
      });
    }
  } catch (err) {
    console.error('USDA API search skipped/failed:', err);
  }

  // 3. Fallback to Open Food Facts for packaged goods if results are low
  if (results.length < 5) {
    try {
      const offResponse = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
          norm
        )}&search_simple=1&action=process&json=1`
      );
      if (offResponse.ok) {
        const data = await offResponse.json();
        const products = data.products || [];
        products.slice(0, 5).forEach((p: any) => {
          const nut = p.nutriments || {};
          const cals = nut['energy-kcal_100g'] || nut['energy-kcal_value'] || 0;
          const prot = nut.proteins_100g || 0;
          const carbs = nut.carbohydrates_100g || 0;
          const fat = nut.fat_100g || 0;

          if (cals > 0) {
            results.push({
              name: p.product_name || 'Packaged Product',
              brand: p.brands ? `Brand: ${p.brands}` : 'Packaged Goods (per 100g)',
              calories: Math.round(cals),
              protein: Math.round(prot * 10) / 10,
              carbs: Math.round(carbs * 10) / 10,
              fat: Math.round(fat * 10) / 10,
              image: p.image_front_thumb_url,
              source: 'Global Barcode Store',
            });
          }
        });
      }
    } catch (err) {
      console.error('Open Food Facts API failed:', err);
    }
  }

  // De-duplicate results by name
  const seen = new Set<string>();
  return results.filter(r => {
    const key = `${r.name.toLowerCase()}-${r.calories}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);
}
