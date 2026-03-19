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
				<MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
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
					style={{
						background: "rgba(255,255,255,0.92)",
						border: "1px solid rgba(37,99,235,0.25)",
						color: "#1e3a8a",
					}}
					className="w-full rounded-2xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all duration-250 placeholder:text-slate-500 focus:border-[rgba(37,99,235,0.45)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
				/>
			</div>

			{shouldShowSuggestions ? (
				<div className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-40 rounded-2xl border border-blue-100 bg-white p-2 shadow-lg">
					{suggestions.slice(0, 7).map((suggestion) => (
						<button
							key={`${suggestion._id || suggestion.id || suggestion.label}-${suggestion.section || ""}`}
							type="button"
							onClick={() => onSelectSuggestion?.(suggestion)}
							className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:scale-[1.01] hover:bg-blue-50 hover:shadow-sm"
						>
							<SparklesIcon className="h-4 w-4 shrink-0 text-blue-600" />
							<span className="line-clamp-1 flex-1 font-medium">{suggestion.label}</span>
							{suggestion.section ? (
								<span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600">
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
