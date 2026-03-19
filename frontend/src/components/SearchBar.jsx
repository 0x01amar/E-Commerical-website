import { MagnifyingGlassIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";

function SearchBar({
	value,
	onChange,
	placeholder = "Search products...",
	suggestions = [],
	onSelectSuggestion,
}) {
	const [focused, setFocused] = useState(false);

	const shouldShowSuggestions = useMemo(() => {
		return focused && String(value || "").trim() && suggestions.length > 0;
	}, [focused, suggestions.length, value]);

	return (
		<div className="relative w-full">
			<div className="relative">
				<MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
				<input
					type="text"
					value={value}
					onChange={onChange}
					onFocus={() => setFocused(true)}
					onBlur={() => {
						window.setTimeout(() => {
							setFocused(false);
						}, 120);
					}}
					placeholder={placeholder}
					className="w-full rounded-md border border-black/15 bg-white py-2 pl-9 pr-3 text-sm text-black outline-none transition-colors placeholder:text-black/45 focus:border-black/35 focus:ring-2 focus:ring-black/10"
				/>
			</div>

			{shouldShowSuggestions ? (
				<div className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-40 rounded-md border border-black/10 bg-white p-2 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
					{suggestions.slice(0, 7).map((suggestion) => (
						<button
							key={`${suggestion._id || suggestion.id || suggestion.label}-${suggestion.section || ""}`}
							type="button"
							onClick={() => onSelectSuggestion?.(suggestion)}
							className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-black/80 transition-colors hover:bg-black/4"
						>
							<SparklesIcon className="h-4 w-4 shrink-0 text-blue-600" />
							<span className="line-clamp-1 flex-1 font-medium">{suggestion.label}</span>
							{suggestion.section ? (
								<span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
									{suggestion.section}
								</span>
							) : null}
						</button>
					))}
				</div>
			) : null}
		</div>
	);
}

export default SearchBar;
