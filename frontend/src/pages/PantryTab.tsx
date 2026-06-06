import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { usePantry } from '../hooks/usePantry';
import { PartnerDot } from '../components/PartnerDot';
import type { PantryItem } from '../types/grocery';

export default function PantryTab() {
  const { items, addItem, deleteItem, isLoading } = usePantry();
  const [input, setInput] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    const parts = text.split(/[,;]/).map((p) => p.trim()).filter((p) => p.length > 0);

    for (const part of parts) {
      const parsed = parseItem(part);
      addItem(parsed);
    }

    setInput('');
  }

  return (
    <div className="px-6 py-4">
      <div className="mb-4">
        <h1 className="text-text-primary text-3xl font-semibold tracking-tight">
          Our kitchen
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          {items.length === 0
            ? 'Tell us what you have.'
            : `${items.length} item${items.length > 1 ? 's' : ''} in your kitchen.`}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="1 litre whole milk, 250g Swiss cheddar, half an onion…"
            className="flex-1 bg-white border border-border rounded-full px-5 py-3 text-text-primary text-base placeholder:text-text-secondary/50 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            aria-label="Add to pantry"
            className="flex-shrink-0 w-12 h-12 bg-sage text-white rounded-full flex items-center justify-center hover:bg-sage-dark active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
        </div>
        <p className="text-text-secondary text-xs mt-2 px-1">
          Separate items with commas. Type exactly what you have — quantities, brands, all of it.
        </p>
      </form>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-text-secondary text-sm">Loading your pantry…</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-text-primary text-2xl font-semibold tracking-tight">
            Your pantry is empty.
          </p>
          <p className="text-text-secondary text-base mt-2 leading-relaxed max-w-xs mx-auto">
            Type what you have above — "chicken, 2 cups rice, spinach" — or move checked items from your shopping list.
          </p>
        </div>
      ) : (
        <ul className="bg-white border border-border rounded-2xl divide-y divide-border/60">
          {items.map((item) => (
            <PantryRow key={item.id} item={item} onDelete={deleteItem} />
          ))}
        </ul>
      )}
    </div>
  );
}

function parseItem(text: string): { name: string; quantity: string } {
  const trimmed = text.trim();
  const qtyMatch = trimmed.match(/^(\d+(?:\.\d+)?\s*(?:cups?|tbsp|tsp|lbs?|oz|kg|g|ml|l|pieces?|slices?|cans?|bags?|boxes?|bottles?|jars?|packs?)|(?:half|quarter|third)\s*(?:of\s*)?an?|\d+\/\d+)\s+(.+)/i);
  if (qtyMatch && qtyMatch[1] && qtyMatch[2]) {
    return { quantity: qtyMatch[1].trim(), name: qtyMatch[2].trim() };
  }
  return { name: trimmed, quantity: '' };
}

function PantryRow({ item, onDelete }: { item: PantryItem; onDelete: (id: string) => void }) {
  return (
    <li className="group flex items-center gap-3 py-3 px-4">
      <div className="flex-1">
        <span className="text-text-primary text-base leading-snug">{item.name}</span>
        {item.quantity && (
          <span className="text-text-secondary text-sm ml-2">{item.quantity}</span>
        )}
      </div>
      <PartnerDot slot={item.addedByPartnerSlot} size={8} />
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        aria-label={`Remove ${item.name}`}
        className="flex-shrink-0 p-1 rounded-full text-text-secondary/0 group-hover:text-text-secondary hover:!text-error transition-colors"
      >
        <X size={16} />
      </button>
    </li>
  );
}
