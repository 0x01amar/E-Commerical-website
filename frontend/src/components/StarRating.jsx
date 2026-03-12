function StarRating({
  value = 0,
  count = 0,
  interactive = false,
  onChange,
  className = "",
  size = "md",
  showValue = true,
}) {
  const clampedValue = Math.max(0, Math.min(5, Number(value || 0)));
  const fullStars = Math.round(clampedValue);

  const sizeClasses = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-2xl",
  };

  const starSizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div className={`flex items-center gap-2 ${className}`.trim()}>
      <div className="flex items-center gap-0.5" aria-label={`Rating ${clampedValue} out of 5`}>
        {Array.from({ length: 5 }).map((_, index) => {
          const starNumber = index + 1;
          const isFilled = starNumber <= fullStars;

          if (!interactive) {
            return (
              <span
                key={starNumber}
                className={`${starSizeClass} leading-none ${isFilled ? "text-amber-400" : "text-slate-600"}`}
                aria-hidden="true"
              >
                ★
              </span>
            );
          }

          return (
            <button
              key={starNumber}
              type="button"
              onClick={() => onChange?.(starNumber)}
              className={`${starSizeClass} leading-none transition ${isFilled ? "text-amber-400" : "text-slate-600 hover:text-amber-300"}`}
              aria-label={`Rate ${starNumber} star${starNumber > 1 ? "s" : ""}`}
            >
              ★
            </button>
          );
        })}
      </div>

      {showValue ? (
        <span className="text-sm font-medium text-slate-300">
          {clampedValue.toFixed(1)}{count ? ` (${count})` : ""}
        </span>
      ) : null}
    </div>
  );
}

export default StarRating;
