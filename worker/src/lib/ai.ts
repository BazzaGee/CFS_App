import type { Env } from '../env';
import type { Diet } from '../routes/profiles';
import type { TDEEResult } from '../lib/tdee';

export interface MealIngredient {
  name: string;
  have: boolean;
  quantity: string;
}

export interface PlatingInstruction {
  partnerSlot: 1 | 2;
  partnerName: string;
  targetCalories: number;
  plate: string;
  protein: number;
  carbs: number;
  fat: number;
}

export interface GeneratedMeal {
  name: string;
  description: string;
  timeMinutes: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: MealIngredient[];
  steps: string[];
  plating?: PlatingInstruction[];
}

const MOCK_MEALS: GeneratedMeal[] = [
  {
    name: 'Chicken Stir-Fry',
    description: 'Quick and flavorful stir-fry with tender chicken, crisp vegetables, and a savory garlic-soy glaze over steamed rice.',
    timeMinutes: 25,
    calories: 580,
    protein: 42,
    carbs: 55,
    fat: 18,
    ingredients: [
      { name: 'chicken breast', have: true, quantity: '1 lb' },
      { name: 'white rice', have: true, quantity: '1 cup' },
      { name: 'spinach', have: true, quantity: '2 cups' },
      { name: 'onion', have: true, quantity: '1 medium' },
      { name: 'garlic', have: true, quantity: '3 cloves' },
      { name: 'soy sauce', have: false, quantity: '2 tbsp' },
      { name: 'sesame oil', have: false, quantity: '1 tbsp' },
    ],
    steps: [
      'Cook rice according to package directions.',
      'Slice chicken into thin strips. Mince garlic, slice onion.',
      'Heat sesame oil in a wok or large pan over high heat.',
      'Add chicken, cook 4-5 min until golden.',
      'Add onion and garlic, stir-fry 2 min.',
      'Add spinach, cook until wilted (1 min).',
      'Add soy sauce, toss to coat.',
      'Serve over rice.',
    ],
  },
  {
    name: 'Garlic Chicken with Rice and Greens',
    description: 'Simple, comforting one-pan meal with golden garlic chicken, fluffy rice, and wilted spinach.',
    timeMinutes: 30,
    calories: 520,
    protein: 38,
    carbs: 48,
    fat: 16,
    ingredients: [
      { name: 'chicken breast', have: true, quantity: '1 lb' },
      { name: 'white rice', have: true, quantity: '1.5 cups' },
      { name: 'spinach', have: true, quantity: '3 cups' },
      { name: 'garlic', have: true, quantity: '4 cloves' },
      { name: 'olive oil', have: true, quantity: '2 tbsp' },
      { name: 'lemon', have: false, quantity: '1' },
    ],
    steps: [
      'Cook rice with a pinch of salt.',
      'Season chicken with salt and pepper.',
      'Heat olive oil in a pan, cook chicken 6 min per side.',
      'Add minced garlic, cook 1 min until fragrant.',
      'Add spinach, cover, steam 2 min.',
      'Squeeze lemon over everything.',
      'Serve chicken and greens over rice.',
    ],
  },
  {
    name: 'Chicken Fried Rice',
    description: 'Better than takeout — day-old rice tossed with chicken, egg, and vegetables in a hot wok.',
    timeMinutes: 20,
    calories: 490,
    protein: 35,
    carbs: 52,
    fat: 14,
    ingredients: [
      { name: 'chicken breast', have: true, quantity: '0.5 lb' },
      { name: 'white rice', have: true, quantity: '2 cups cooked' },
      { name: 'onion', have: true, quantity: '1 small' },
      { name: 'garlic', have: true, quantity: '2 cloves' },
      { name: 'eggs', have: false, quantity: '2' },
      { name: 'soy sauce', have: false, quantity: '2 tbsp' },
    ],
    steps: [
      'Dice chicken into small cubes.',
      'Heat oil in a wok, scramble eggs, set aside.',
      'Cook chicken until golden, set aside.',
      'Sauté onion and garlic.',
      'Add cold rice, stir-fry 3 min.',
      'Return chicken and eggs, add soy sauce.',
      'Toss everything together, serve hot.',
    ],
  },
];

export async function generateMeal(
  env: Env,
  pantryItems: Array<{ name: string; quantity: string }>,
  partner1Diet: Diet,
  partner2Diet: Diet,
  partner1Body?: { name: string; tdee: TDEEResult },
  partner2Body?: { name: string; tdee: TDEEResult },
): Promise<GeneratedMeal> {
  const apiKey = env.ANTHROPIC_API_KEY;

  if (apiKey && partner1Body && partner2Body) {
    return generateAdaptiveWithAnthropic(apiKey, pantryItems, partner1Diet, partner2Diet, partner1Body, partner2Body);
  }

  return generateMock(pantryItems, partner1Diet, partner2Diet, partner1Body, partner2Body);
}

async function generateWithAnthropic(
  apiKey: string,
  pantryItems: Array<{ name: string; quantity: string }>,
  partner1Diet: Diet,
  partner2Diet: Diet,
): Promise<GeneratedMeal> {
  const pantryList = pantryItems.map((i) => `${i.quantity ? i.quantity + ' ' : ''}${i.name}`).join(', ');

  const prompt = `You are a meal planner for couples. Generate ONE dinner suggestion based on what they have.

Pantry: ${pantryList}
Partner 1 diet: ${partner1Diet}
Partner 2 diet: ${partner2Diet}
Time limit: 30 minutes

Rules:
- The meal must work for BOTH dietary preferences (if one is vegetarian, the meal must be vegetarian)
- Prioritize using pantry ingredients
- Keep it simple and realistic
- Output ONLY valid JSON, no markdown, no explanation

JSON format:
{
  "name": "Recipe Name",
  "description": "Brief appetizing description",
  "timeMinutes": 25,
  "calories": 500,
  "protein": 35,
  "carbs": 45,
  "fat": 15,
  "ingredients": [
    {"name": "ingredient name", "have": true, "quantity": "1 cup"},
    {"name": "missing ingredient", "have": false, "quantity": "2 tbsp"}
  ],
  "steps": ["Step 1", "Step 2", "Step 3"]
}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    console.error(`Anthropic API error: ${res.status}`);
    return generateMock(pantryItems, partner1Diet, partner2Diet);
  }

  const data = (await res.json()) as { content: Array<{ text: string }> };
  const text = data.content?.[0]?.text ?? '';

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as GeneratedMeal;
    }
  } catch {
    console.error('Failed to parse AI response');
  }

  return generateMock(pantryItems, partner1Diet, partner2Diet);
}

async function generateAdaptiveWithAnthropic(
  apiKey: string,
  pantryItems: Array<{ name: string; quantity: string }>,
  partner1Diet: Diet,
  partner2Diet: Diet,
  partner1Body: { name: string; tdee: TDEEResult },
  partner2Body: { name: string; tdee: TDEEResult },
): Promise<GeneratedMeal> {
  const pantryList = pantryItems.map((i) => `${i.quantity ? i.quantity + ' ' : ''}${i.name}`).join(', ');

  const prompt = `You are an adaptive meal planner for couples who cook together but have different nutritional goals.

Pantry: ${pantryList}
Partner 1: ${partner1Body.name}, diet=${partner1Diet}, target=${partner1Body.tdee.targetCalories} cal/day
Partner 2: ${partner2Body.name}, diet=${partner2Diet}, target=${partner2Body.tdee.targetCalories} cal/day
Time limit: 30 minutes

Generate ONE shared recipe with TWO different plating instructions. Same cooking process, different portions.

Rules:
- The meal must work for BOTH dietary preferences
- Prioritize using pantry ingredients
- Give specific portion sizes for each partner's plate
- Output ONLY valid JSON, no markdown, no explanation

JSON format:
{
  "name": "Recipe Name",
  "description": "Brief description",
  "timeMinutes": 25,
  "calories": 500,
  "protein": 35,
  "carbs": 45,
  "fat": 15,
  "ingredients": [
    {"name": "ingredient", "have": true, "quantity": "1 cup"},
    {"name": "missing", "have": false, "quantity": "2 tbsp"}
  ],
  "steps": ["Step 1", "Step 2"],
  "plating": [
    {"partnerSlot": 1, "partnerName": "${partner1Body.name}", "targetCalories": ${partner1Body.tdee.targetCalories}, "plate": "4oz chicken over spinach, 1/2 cup rice", "protein": 35, "carbs": 30, "fat": 12},
    {"partnerSlot": 2, "partnerName": "${partner2Body.name}", "targetCalories": ${partner2Body.tdee.targetCalories}, "plate": "6oz chicken, 1 cup rice, side vegetables", "protein": 50, "carbs": 55, "fat": 15}
  ]
}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1536,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    console.error(`Anthropic API error: ${res.status}`);
    return generateMock(pantryItems, partner1Diet, partner2Diet, partner1Body, partner2Body);
  }

  const data = (await res.json()) as { content: Array<{ text: string }> };
  const text = data.content?.[0]?.text ?? '';

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as GeneratedMeal;
    }
  } catch {
    console.error('Failed to parse AI response');
  }

  return generateMock(pantryItems, partner1Diet, partner2Diet, partner1Body, partner2Body);
}

function generateMock(
  pantryItems: Array<{ name: string; quantity: string }>,
  _partner1Diet: Diet,
  _partner2Diet: Diet,
  partner1Body?: { name: string; tdee: TDEEResult },
  partner2Body?: { name: string; tdee: TDEEResult },
): GeneratedMeal {
  const pantryNames = pantryItems.map((i) => i.name.toLowerCase());
  const hasChicken = pantryNames.some((n) => n.includes('chicken'));
  const hasRice = pantryNames.some((n) => n.includes('rice'));

  const fallback = MOCK_MEALS[0]!;

  let meal: GeneratedMeal;
  if (hasChicken && hasRice) {
    meal = MOCK_MEALS[0]!;
  } else if (hasChicken) {
    meal = MOCK_MEALS[1]!;
  } else if (hasRice) {
    meal = MOCK_MEALS[2]!;
  } else {
    meal = fallback;
  }

  if (partner1Body && partner2Body) {
    meal = {
      ...meal,
      plating: [
        {
          partnerSlot: 1,
          partnerName: partner1Body.name,
          targetCalories: partner1Body.tdee.targetCalories,
          plate: `${Math.round(partner1Body.tdee.targetCalories * 0.4 / 4)}oz protein over greens, ${Math.round(partner1Body.tdee.targetCalories * 0.3 / 200)}/2 cup rice`,
          protein: Math.round(partner1Body.tdee.targetCalories * 0.3 / 4),
          carbs: Math.round(partner1Body.tdee.targetCalories * 0.4 / 4),
          fat: Math.round(partner1Body.tdee.targetCalories * 0.3 / 9),
        },
        {
          partnerSlot: 2,
          partnerName: partner2Body.name,
          targetCalories: partner2Body.tdee.targetCalories,
          plate: `${Math.round(partner2Body.tdee.targetCalories * 0.4 / 4)}oz protein, ${Math.round(partner2Body.tdee.targetCalories * 0.35 / 200)} cup rice, side vegetables`,
          protein: Math.round(partner2Body.tdee.targetCalories * 0.35 / 4),
          carbs: Math.round(partner2Body.tdee.targetCalories * 0.4 / 4),
          fat: Math.round(partner2Body.tdee.targetCalories * 0.25 / 9),
        },
      ],
    };
  }

  return meal;
}
