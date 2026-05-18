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
  
  // Healthy Indian Options
  'paneer bhurji': { calories: 280, protein: 18, carbs: 6, fat: 20, unit: '100g (cooked)' },
  'brown rice': { calories: 111, protein: 2.6, carbs: 23, fat: 0.9, unit: '100g (cooked)' },
  ghee: { calories: 112, protein: 0, carbs: 0, fat: 12.7, unit: 'tbsp' },
  curd: { calories: 98, protein: 3.4, carbs: 4.7, fat: 4.3, unit: '100g' },
  yogurt: { calories: 98, protein: 3.4, carbs: 4.7, fat: 4.3, unit: '100g' },
  'greek yogurt': { calories: 59, protein: 10, carbs: 3.6, fat: 0.4, unit: '100g' },
  'moong dal': { calories: 105, protein: 7, carbs: 19, fat: 0.3, unit: '100g (cooked)' },
  'egg bhurji': { calories: 180, protein: 12, carbs: 2, fat: 14, unit: '100g (cooked)' },
  'chicken tikka': { calories: 150, protein: 24, carbs: 4, fat: 5, unit: '100g (cooked)' },
  'tandoori roti': { calories: 110, protein: 4, carbs: 22, fat: 0.5, unit: 'piece (cooked)' },

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

  // Base raw ingredients / Healthy fitness elements
  egg: { calories: 70, protein: 6.3, carbs: 0.6, fat: 5.3, unit: 'piece' },
  eggs: { calories: 70, protein: 6.3, carbs: 0.6, fat: 5.3, unit: 'piece' },
  'boiled egg': { calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3, unit: 'piece' },
  'boiled eggs': { calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3, unit: 'piece' },
  banana: { calories: 105, protein: 1.3, carbs: 27, fat: 0.3, unit: 'piece' },
  bananas: { calories: 105, protein: 1.3, carbs: 27, fat: 0.3, unit: 'piece' },
  apple: { calories: 95, protein: 0.5, carbs: 25, fat: 0.3, unit: 'piece' },
  apples: { calories: 95, protein: 0.5, carbs: 25, fat: 0.3, unit: 'piece' },
  bread: { calories: 80, protein: 3, carbs: 15, fat: 1, unit: 'slice' },
  toast: { calories: 80, protein: 3, carbs: 15, fat: 1, unit: 'slice' },
  'peanut butter toast': { calories: 270, protein: 10, carbs: 21, fat: 17, unit: 'slice' },
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
  'protein bar': { calories: 200, protein: 20, carbs: 18, fat: 6, unit: 'piece' },
  'whey isolate': { calories: 110, protein: 25, carbs: 1, fat: 0.5, unit: 'scoop' },
  avocado: { calories: 240, protein: 3, carbs: 12, fat: 22, unit: 'piece' },
  peanut: { calories: 190, protein: 7, carbs: 6, fat: 16, unit: 'tbsp' },
  'peanut butter': { calories: 190, protein: 7, carbs: 6, fat: 16, unit: 'tbsp' },
  butter: { calories: 100, protein: 0.1, carbs: 0.1, fat: 11, unit: 'tbsp' },
  oil: { calories: 120, protein: 0, carbs: 0, fat: 14, unit: 'tbsp' },
  'olive oil': { calories: 119, protein: 0, carbs: 0, fat: 13.5, unit: 'tbsp' },
  coffee: { calories: 2, protein: 0.3, carbs: 0, fat: 0, unit: 'cup' },
  'milk tea': { calories: 60, protein: 2, carbs: 8, fat: 2.5, unit: 'cup' },
  'filter coffee': { calories: 45, protein: 1.5, carbs: 6, fat: 1.8, unit: 'cup' },
  espresso: { calories: 5, protein: 0.1, carbs: 0.5, fat: 0.1, unit: 'shot' },
  almond: { calories: 7, protein: 0.25, carbs: 0.6, fat: 0.6, unit: 'piece' },
  almonds: { calories: 160, protein: 6, carbs: 6, fat: 14, unit: 'oz' },
  'almond milk': { calories: 30, protein: 1, carbs: 1, fat: 2.5, unit: 'cup' },
  'soy milk': { calories: 100, protein: 8, carbs: 4, fat: 4, unit: 'cup' },
  spinach: { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, unit: '100g (raw)' },
  broccoli: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4, unit: '100g (cooked)' },
  'mixed salad': { calories: 45, protein: 1.5, carbs: 8, fat: 0.5, unit: '100g (fresh)' },
  quinoa: { calories: 120, protein: 4.4, carbs: 21.3, fat: 1.9, unit: '100g (cooked)' },
  tofu: { calories: 76, protein: 8, carbs: 1.9, fat: 4.8, unit: '100g' },
  paneer: { calories: 265, protein: 18, carbs: 1.2, fat: 20.8, unit: '100g' },
  'sweet potato': { calories: 86, protein: 1.6, carbs: 20, fat: 0.1, unit: '100g (cooked)' },
  honey: { calories: 64, protein: 0.1, carbs: 17, fat: 0, unit: 'tbsp' },
  whey: { calories: 120, protein: 24, carbs: 3, fat: 1.5, unit: 'scoop' },
};

export function parseNaturalLanguageNutrition(input: string): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  matched: boolean;
  matchedItems: string[];
} {
  const normalized = input.toLowerCase().trim();
  if (!normalized) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0, matched: false, matchedItems: [] };
  }

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let matched = false;
  const matchedItems: string[] = [];

  // Helper to replace text numbers with numeric values
  const textNumbers: Record<string, number> = {
    half: 0.5,
    'a half': 0.5,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  };

  // Split input into potential food components (e.g. "2 eggs and 1 banana" -> ["2 eggs", "1 banana"])
  const components = normalized.split(/\band\b|\+|,|\bwith\b/g).map(s => s.trim()).filter(Boolean);

  for (const component of components) {
    let amount = 1;
    let foundNumber = false;

    // Check for written numbers first (like "half" or "two")
    for (const [textNum, value] of Object.entries(textNumbers)) {
      if (component.startsWith(textNum + ' ') || component.includes(' ' + textNum + ' ') || component.endsWith(' ' + textNum)) {
        amount = value;
        foundNumber = true;
        break;
      }
    }

    // Check for standard digit numbers (like "2.5" or "100")
    if (!foundNumber) {
      const foundNumbers = component.match(/(\d+(\.\d+)?)/g);
      if (foundNumbers && foundNumbers.length > 0) {
        const gramMatch = component.match(/(\d+(\.\d+)?)\s*(g|gram|grams)/);
        if (gramMatch) {
          amount = parseFloat(gramMatch[1]) / 100;
        } else {
          amount = parseFloat(foundNumbers[0]);
        }
        foundNumber = true;
      }
    }

    // Fuzzy matching against FOOD_DATABASE keys
    for (const [key, profile] of Object.entries(FOOD_DATABASE)) {
      const keySingular = key.endsWith('s') ? key.slice(0, -1) : key;
      const compSingular = component.endsWith('s') ? component.slice(0, -1) : component;

      // Match substring, reverse substring, singulars, or aliases (like idley -> idli)
      const isMatch = component.includes(key) || key.includes(component) || 
                      (compSingular.length > 2 && keySingular.includes(compSingular)) ||
                      (keySingular.length > 2 && compSingular.includes(keySingular)) ||
                      (key === 'idli' && component.includes('idley'));

      if (isMatch) {
        matched = true;
        matchedItems.push(`${amount >= 1 ? amount : 'half'}x ${key}`);
        let multiplier = amount;

        // Default portion scaling if profile is in 100g but user didn't write "g" or "gram"
        if (profile.unit.includes('100g') && !component.includes('g') && !component.includes('gram')) {
          multiplier = amount * 1.5; // default 150g piece size
        }

        totalCalories += profile.calories * multiplier;
        totalProtein += profile.protein * multiplier;
        totalCarbs += profile.carbs * multiplier;
        totalFat += profile.fat * multiplier;
        break; // matched this component, move to next
      }
    }
  }

  return {
    calories: Math.round(totalCalories * 10) / 10,
    protein: Math.round(totalProtein * 10) / 10,
    carbs: Math.round(totalCarbs * 10) / 10,
    fat: Math.round(totalFat * 10) / 10,
    matched,
    matchedItems,
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
