import { Check, X, ArrowDown } from 'lucide-react';
import { PartnerDot } from './PartnerDot';
import type { GroceryItem } from '../types/grocery';

interface Props {
  item: GroceryItem;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveToPantry?: (item: GroceryItem) => void;
}

export function ItemRow({ item, onToggle, onDelete, onMoveToPantry }: Props) {
  return (
    <li className="group flex items-center gap-3 py-3">
      <button
        type="button"
        onClick={() => onToggle(item.id)}
        aria-pressed={item.isChecked}
        aria-label={item.isChecked ? `Uncheck ${item.name}` : `Check off ${item.name}`}
        className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
          item.isChecked
            ? 'bg-sage border-sage text-white'
            : 'border-border bg-white hover:border-sage'
        }`}
      >
        {item.isChecked && <Check size={14} strokeWidth={3} />}
      </button>

      <span
        className={`flex-1 text-base leading-snug transition-all ${
          item.isChecked ? 'text-text-secondary line-through' : 'text-text-primary'
        }`}
      >
        {item.name}
      </span>

      <PartnerDot slot={item.addedByPartnerSlot} size={8} />

      {item.isChecked && onMoveToPantry && (
        <button
          type="button"
          onClick={() => onMoveToPantry(item)}
          aria-label={`Move ${item.name} to pantry`}
          className="flex-shrink-0 p-1 rounded-full text-sage hover:text-sage-dark transition-colors"
          title="Move to pantry"
        >
          <ArrowDown size={16} />
        </button>
      )}

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
