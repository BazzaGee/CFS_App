import { useRegulars } from '../hooks/useRegulars';
import { useGroceryList } from '../hooks/useGroceryList';

interface Props {
  onAdd: (name: string) => void;
}

export function RegularsChips({ onAdd }: Props) {
  const { regulars, hasRegulars } = useRegulars();
  const { isAdding } = useGroceryList();

  if (!hasRegulars) return null;

  return (
    <div className="mb-4">
      <p className="text-text-secondary text-xs font-medium tracking-[0.15em] uppercase mb-2 px-1">
        Your regulars
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
        {regulars.map((item) => (
          <button
            key={item.name}
            type="button"
            onClick={() => onAdd(item.name)}
            disabled={isAdding}
            className="flex-shrink-0 snap-start bg-sage/10 text-text-primary text-sm font-medium py-2 px-4 rounded-full hover:bg-sage/20 active:bg-sage/30 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {item.name}
          </button>
        ))}
      </div>
    </div>
  );
}
