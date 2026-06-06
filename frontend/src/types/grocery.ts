export type Category = 'Produce' | 'Meat' | 'Dairy' | 'Pantry' | 'Other';

export type PartnerSlot = 1 | 2;

export interface GroceryItem {
  id: string;
  householdId: string;
  name: string;
  category: Category;
  isChecked: boolean;
  addedByPartnerId: string;
  addedByPartnerSlot: PartnerSlot;
  createdAt: number;
  updatedAt: number;
}

export interface PantryItem {
  id: string;
  householdId: string;
  name: string;
  quantity: string;
  addedByPartnerId: string;
  addedByPartnerSlot: PartnerSlot;
  createdAt: number;
}

export type SyncEvent =
  | { type: 'item_added'; item: GroceryItem }
  | { type: 'item_toggled'; item: GroceryItem }
  | { type: 'item_deleted'; id: string }
  | { type: 'pantry_added'; item: PantryItem }
  | { type: 'pantry_deleted'; id: string }
  | { type: 'hello'; partnerId: string; slot: PartnerSlot; at: number };

export const CATEGORIES: readonly Category[] = ['Produce', 'Meat', 'Dairy', 'Pantry', 'Other'] as const;
