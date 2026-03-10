function SearchBar({ value, onChange, placeholder = "Search products..." }) {
	return (
		<div className="w-full">
			<input
				type="text"
				value={value}
				onChange={onChange}
				placeholder={placeholder}
				className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
			/>
		</div>
	);
}

export default SearchBar;
