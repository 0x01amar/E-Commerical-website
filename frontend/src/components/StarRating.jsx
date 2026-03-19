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
    sm: "text-xs",
    md: "text-base",
    lg: "text-xl",
  };

  const starSizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div className={`flex items-center gap-2 ${className}`.trim()}>
      <div className="flex items-center gap-0.5" aria-label={`Rating ${clampedValue} out of 5`}>
        {Array.from({ length: 5 }).map((_, index) => {
          const starNumber = index + 1;
          const isFilled = starNumber <= fullStars;

          return (
            <span
              key={starNumber}
              className={`${starSizeClass} leading-none ${isFilled ? "text-secondary" : "text-neutral-dark/10"}`}
              aria-hidden="true"
            >
              ★
            </span>
          );
        })}
      </div>

      {showValue ? (
        <span className="text-xs font-bold text-neutral-dark/40 uppercase tracking-widest">
          {clampedValue.toFixed(1)} {count ? `(${count})` : ""}
        </span>
      ) : null}
    </div>
  );
}

export default StarRating;
