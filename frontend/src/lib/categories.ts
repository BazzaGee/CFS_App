import type { Category } from '../types/grocery';

const KEYWORDS: Array<{ category: Category; words: string[] }> = [
  { category: 'Produce', words: ['apple', 'banana', 'orange', 'lettuce', 'spinach', 'tomato', 'potato', 'onion', 'garlic', 'carrot', 'pepper', 'cucumber', 'broccoli', 'kale', 'mushroom', 'avocado', 'lemon', 'lime', 'berry', 'grape', 'mango', 'peach', 'pear', 'corn', 'zucchini', 'celery', 'ginger', 'herb', 'basil', 'cilantro', 'parsley'] },
  { category: 'Meat', words: ['chicken', 'beef', 'pork', 'turkey', 'lamb', 'fish', 'salmon', 'tuna', 'shrimp', 'bacon', 'sausage', 'ham', 'steak', 'ground', 'fillet', 'breast', 'thigh', 'mince', 'prawn'] },
  { category: 'Dairy', words: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'egg', 'eggs', 'sour cream', 'cottage cheese', 'cheddar', 'mozzarella', 'parmesan', 'feta', 'gouda', 'brie', 'cream cheese', 'kefir'] },
  { category: 'Pantry', words: ['rice', 'pasta', 'flour', 'sugar', 'salt', 'pepper', 'oil', 'olive oil', 'vinegar', 'sauce', 'soup', 'canned', 'beans', 'lentils', 'cereal', 'oats', 'bread', 'tortilla', 'honey', 'peanut butter', 'jam', 'tea', 'coffee', 'spice', 'soy sauce', 'sesame oil', 'coconut oil', 'wheat', 'oat', 'quinoa', 'noodle'] },
];

export function classify(name: string): Category {
  const normalized = name.toLowerCase().trim();
  for (const { category, words } of KEYWORDS) {
    if (words.some((w) => normalized.includes(w))) return category;
  }
  return 'Other';
}

export const QUICK_ADD: ReadonlyArray<{ name: string; category: Category }> = [
  { name: 'Whole milk (1L)', category: 'Dairy' },
  { name: 'Eggs (1 dozen)', category: 'Dairy' },
  { name: 'Cheddar (200g)', category: 'Dairy' },
  { name: 'Butter (250g)', category: 'Dairy' },
  { name: 'Whole wheat bread', category: 'Pantry' },
  { name: 'Chicken breast (500g)', category: 'Meat' },
  { name: 'Baby spinach', category: 'Produce' },
  { name: 'Bananas (bunch)', category: 'Produce' },
  { name: 'White rice (1kg)', category: 'Pantry' },
  { name: 'Olive oil (500ml)', category: 'Pantry' },
  { name: 'Onions (bag)', category: 'Produce' },
  { name: 'Garlic (head)', category: 'Produce' },
  { name: 'Greek yogurt (500g)', category: 'Dairy' },
  { name: 'Sourdough loaf', category: 'Pantry' },
  { name: 'Avocados (3 pack)', category: 'Produce' },
  { name: 'Ground beef (500g)', category: 'Meat' },
];
