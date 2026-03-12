function SearchBar({ value, onChange, placeholder = "Search products..." }) {
	return (
		<div className="w-full">
			<input
				type="text"
				value={value}
				onChange={onChange}
				placeholder={placeholder}
				style={{
					background: "rgba(255,255,255,0.85)",
					border: "1px solid rgba(100,160,220,0.32)",
					color: "#1a2f48",
				}}
				className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-250 placeholder:text-slate-500 focus:border-[rgba(2,132,199,0.45)] focus:bg-[rgba(2,132,199,0.05)] focus:shadow-[0_0_0_3px_rgba(2,132,199,0.12)]"
			/>
		</div>
	);
}

export default SearchBar;
