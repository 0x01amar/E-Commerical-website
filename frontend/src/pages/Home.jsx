import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProductCard from "../components/ProductCard";

function Home({ search }) {
	const navigate = useNavigate();
	const [products, setProducts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		const getProducts = async () => {
			try {
				setLoading(true);
				const response = await fetch("http://localhost:5000/api/products");
				const data = await response.json();

				if (!response.ok) {
					throw new Error(data?.message || "Failed to load products");
				}

				setProducts(data);
				setError("");
			} catch (fetchError) {
				setError(fetchError.message || "Failed to load products");
			} finally {
				setLoading(false);
			}
		};

		getProducts();
	}, []);

	const filteredProducts = useMemo(() => {
		return products.filter((product) =>
			product.name?.toLowerCase().includes((search || "").toLowerCase())
		);
	}, [products, search]);

	return (
		<section className="space-y-8">
			<div className="rounded-3xl bg-linear-to-r from-slate-900 via-slate-800 to-amber-600 p-8 text-white shadow-lg">
				<p className="text-sm uppercase tracking-[0.2em] text-amber-200">Premium Collection</p>
				<h1 className="mt-2 text-3xl font-bold sm:text-4xl">Beautiful Furniture for Modern Homes</h1>
				<p className="mt-3 max-w-2xl text-slate-200">
					Browse handcrafted iron art and furniture pieces designed for comfort and style.
				</p>
			</div>

			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-semibold text-slate-900">Products</h2>
				<span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-600 shadow-sm">
					{filteredProducts.length} items
				</span>
			</div>

			{loading ? <p className="text-slate-600">Loading products...</p> : null}
			{error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-rose-600">{error}</p> : null}

			{!loading && !error ? (
				filteredProducts.length ? (
					<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{filteredProducts.map((product) => (
							<ProductCard
								key={product._id}
								product={product}
								onView={() => navigate(`/product/${product._id}`)}
							/>
						))}
					</div>
				) : (
					<p className="rounded-xl bg-white p-6 text-center text-slate-600 shadow-sm">
						No products found for your search.
					</p>
				)
			) : null}
		</section>
	);
}

export default Home;
