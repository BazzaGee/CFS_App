import { CATEGORIES, type GroceryItem } from '../types/grocery';
import { CategorySection } from './CategorySection';

interface Props {
  items: GroceryItem[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveToPantry?: (item: GroceryItem) => void;
}

export function ShoppingList({ items, onToggle, onDelete, onMoveToPantry }: Props) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-text-primary text-2xl font-semibold tracking-tight">
          Your list is empty.
        </p>
        <p className="text-text-secondary text-base mt-2 leading-relaxed">
          Add what you need below, or tap a quick add.
        </p>
      </div>
    );
  }

  return (
    <div>
      {CATEGORIES.map((category) => {
        const categoryItems = items.filter((i) => i.category === category);
        return (
          <CategorySection
            key={category}
            category={category}
            items={categoryItems}
            onToggle={onToggle}
            onDelete={onDelete}
            onMoveToPantry={onMoveToPantry}
          />
        );
      })}
    </div>
  );
}
