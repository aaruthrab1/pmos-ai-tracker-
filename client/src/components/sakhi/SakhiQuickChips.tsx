import { SAKHI_QUICK_ACTIONS } from '@/lib/sakhi';
import { cn } from '@/lib/tokens';

interface SakhiQuickChipsProps {
  onSelect: (question: string) => void;
  disabled?: boolean;
  className?: string;
}

/** Clickable suggestion chips — auto-send on tap */
export function SakhiQuickChips({ onSelect, disabled, className }: SakhiQuickChipsProps) {
  return (
    <div
      className={cn('flex gap-2 overflow-x-auto pb-1 scrollbar-none', className)}
      role="group"
      aria-label="Suggested questions"
    >
      {SAKHI_QUICK_ACTIONS.map((question) => (
        <button
          key={question}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(question)}
          className={cn(
            'shrink-0 rounded-full border border-border bg-surface px-3 py-1.5 text-micro font-medium text-ink-secondary',
            'transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {question}
        </button>
      ))}
    </div>
  );
}
