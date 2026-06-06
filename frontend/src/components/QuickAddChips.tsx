import { QUICK_ADD } from '../lib/categories';

interface Props {
  onPick: (name: string) => void;
  disabled?: boolean;
}

export function QuickAddChips({ onPick, disabled }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
      {QUICK_ADD.map((item) => (
        <button
          key={item.name}
          type="button"
          onClick={() => onPick(item.name)}
          disabled={disabled}
          className="flex-shrink-0 snap-start bg-white border border-border text-text-primary text-sm font-medium py-2 px-4 rounded-full hover:border-sage hover:bg-sage/5 active:bg-sage/10 transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {item.name}
        </button>
      ))}
    </div>
  );
}
