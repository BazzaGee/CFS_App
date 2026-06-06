import { useGroceryList } from '../hooks/useGroceryList';
import { usePantry } from '../hooks/usePantry';
import { classify } from '../lib/categories';
import { ShoppingList } from '../components/ShoppingList';
import { AddItemForm } from '../components/AddItemForm';
import { RegularsChips } from '../components/RegularsChips';
import type { GroceryItem } from '../types/grocery';

export default function ShoppingTab() {
  const { items, addItem, toggleItem, deleteItem, isLoading, isOnline, queuedCount } = useGroceryList();
  const { addItem: addPantryItem } = usePantry();

  function handleMoveToPantry(item: GroceryItem) {
    addPantryItem({ name: item.name, quantity: '' });
    deleteItem(item.id);
  }

  return (
    <div className="px-6 py-4">
      {!isOnline && (
        <div className="mb-4 bg-terracotta/10 border border-terracotta/20 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="relative flex w-2 h-2" aria-hidden>
            <span className="absolute inline-flex w-full h-full rounded-full bg-terracotta opacity-60 animate-ping" />
            <span className="relative inline-flex w-2 h-2 rounded-full bg-terracotta" />
          </span>
          <p className="text-text-primary text-sm">
            You're offline.
            {queuedCount > 0 && (
              <span className="ml-1">
                {queuedCount} item{queuedCount > 1 ? 's' : ''} will sync when you reconnect.
              </span>
            )}
          </p>
        </div>
      )}

      <div className="mb-4">
        <h1 className="text-text-primary text-3xl font-semibold tracking-tight">
          Our shopping list
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          {items.length === 0
            ? 'Add what you need below.'
            : items.filter((i) => !i.isChecked).length === 0
              ? "All done. You've got everything."
              : `${items.filter((i) => !i.isChecked).length} to buy`}
        </p>
      </div>

      <RegularsChips onAdd={(name) => addItem({ name, category: classify(name) })} />

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-text-secondary text-sm">Loading your list…</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-text-primary text-2xl font-semibold tracking-tight">
            Your list is empty.
          </p>
          <p className="text-text-secondary text-base mt-2 leading-relaxed max-w-xs mx-auto">
            Tap a quick-add chip below, or type exactly what you need — quantities, brands, specifics.
          </p>
        </div>
      ) : (
        <ShoppingList
          items={items}
          onToggle={toggleItem}
          onDelete={deleteItem}
          onMoveToPantry={handleMoveToPantry}
        />
      )}

      <div className="mt-6 sticky bottom-20 bg-cream/95 backdrop-blur -mx-6 px-6 py-4 border-t border-border">
        <AddItemForm
          onAdd={(input) => addItem({ name: input.name, category: classify(input.name) })}
        />
      </div>
    </div>
  );
}
