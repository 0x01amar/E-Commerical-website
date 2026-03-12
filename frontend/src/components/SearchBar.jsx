function SearchBar({ value, onChange, placeholder = "Search products..." }) {
	return (
		<div className="w-full">
			<input
				type="text"
				value={value}
				onChange={onChange}
				placeholder={placeholder}
				style={{
					background: "rgba(255,255,255,0.05)",
					border: "1px solid rgba(0,212,255,0.18)",
					color: "#e2e8f0",
				}}
				className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-250 placeholder:text-slate-500 focus:border-[rgba(0,212,255,0.5)] focus:bg-[rgba(0,212,255,0.04)] focus:shadow-[0_0_0_3px_rgba(0,212,255,0.1)]"
			/>
		</div>
	);
}

export default SearchBar;
