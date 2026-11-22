import { useState } from 'react';
import { Star } from 'lucide-react';
import { RATING_LABELS } from '../data/offices';

interface StarRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  describedBy?: string;
}

export function StarRatingInput({
  value,
  onChange,
  disabled = false,
  describedBy,
}: StarRatingInputProps) {
  const [hovered, setHovered] = useState<number>(0);
  const activeValue = hovered || value;

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      onChange(Math.min(5, (value || 0) + 1));
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      onChange(Math.max(1, (value || 2) - 1));
    }
  }

  return (
    <div className="space-y-3">
      <div
        role="radiogroup"
        aria-label="5-star rating"
        aria-describedby={describedBy}
        onKeyDown={handleKeyDown}
        onMouseLeave={() => setHovered(0)}
        className="inline-flex flex-wrap items-center gap-2"
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= activeValue;
          const isSelected = star === value;
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${star} ${star === 1 ? 'star' : 'stars'} — ${RATING_LABELS[star]}`}
              disabled={disabled}
              onMouseEnter={() => !disabled && setHovered(star)}
              onFocus={() => !disabled && setHovered(star)}
              onBlur={() => setHovered(0)}
              onClick={() => onChange(star)}
              className={`group flex h-12 w-12 items-center justify-center rounded-lg border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] focus-visible:ring-offset-2 ${
                isFilled
                  ? 'border-amber-300 bg-amber-50 text-amber-500 shadow-xs'
                  : 'border-stone-200 bg-white text-stone-300 hover:border-amber-200 hover:text-amber-400'
              } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer active:scale-95'}`}
            >
              <Star
                className={`h-6 w-6 transition-transform duration-150 ${
                  isFilled ? 'fill-amber-400 text-amber-500 scale-105' : 'fill-transparent'
                }`}
                strokeWidth={1.75}
              />
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-sm text-stone-600">
        {activeValue > 0 ? (
          <>
            <span className="font-mono font-medium text-stone-900 tabular-nums">
              {activeValue} / 5
            </span>
            <span aria-hidden="true" className="text-stone-300">
              ·
            </span>
            <span className="font-medium text-stone-800">{RATING_LABELS[activeValue]}</span>
          </>
        ) : (
          <span className="text-stone-500">Select a rating from 1 to 5 stars</span>
        )}
      </div>
    </div>
  );
}

interface StarDisplayProps {
  rating: number;
  size?: 'sm' | 'md';
}

export function StarDisplay({ rating, size = 'sm' }: StarDisplayProps) {
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const rounded = Math.round(rating);

  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`${rating.toFixed(1)} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${iconSize} ${
            star <= rounded
              ? 'fill-amber-400 text-amber-500'
              : 'fill-stone-100 text-stone-300'
          }`}
          strokeWidth={1.75}
        />
      ))}
    </span>
  );
}
