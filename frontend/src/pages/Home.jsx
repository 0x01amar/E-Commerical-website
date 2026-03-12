import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { apiUrl } from "../config/api";

function Home({ search }) {
	const navigate = useNavigate();
	const [products, setProducts] = useState([]);
	const [sections, setSections] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	const normalizeSectionName = (product = {}) => {
		const sectionValue = String(product?.section || product?.category || "General").trim();
		return sectionValue || "General";
	};

	useEffect(() => {
		const loadHomeData = async () => {
			try {
				setLoading(true);

				const [productResponse, sectionResponse] = await Promise.all([
					fetch(apiUrl("/products")),
					fetch(apiUrl("/products/sections")),
				]);

				const productsData = await productResponse.json();
				const sectionsData = await sectionResponse.json();

				if (!productResponse.ok) {
					throw new Error(productsData?.message || "Failed to load products");
				}

				const normalizedProducts = Array.isArray(productsData) ? productsData : [];
				const normalizedSections = Array.isArray(sectionsData)
					? sectionsData
						.map((section) => String(section?.name || "").trim())
						.filter(Boolean)
					: [];

				setProducts(normalizedProducts);
				setSections(normalizedSections);
				setError("");
			} catch (fetchError) {
				setError(fetchError.message || "Failed to load products");
			} finally {
				setLoading(false);
			}
		};

		loadHomeData();
	}, []);

	const filteredProducts = useMemo(() => {
		const searchTerms = (search || "")
			.toLowerCase()
			.trim()
			.split(/\s+/)
			.filter(Boolean);

		if (!searchTerms.length) {
			return products;
		}

		return products.filter((product) => {
			const searchableText = [
				product?.name || "",
				product?.section || "",
				product?.category || "",
				product?.description || "",
			]
				.join(" ")
				.toLowerCase();

			return searchTerms.every((term) => searchableText.includes(term));
		});
	}, [products, search]);

	const groupedSections = useMemo(() => {
		const sectionNamesFromProducts = Array.from(
			new Set(products.map((product) => normalizeSectionName(product)))
		);

		const combinedSectionNames = [
			...sections,
			...sectionNamesFromProducts.filter((name) => !sections.includes(name)),
		];

		if (!combinedSectionNames.length) {
			combinedSectionNames.push(
				"Wooden Chair",
				"Iron Chair",
				"Wooden Bed",
				"Iron Bed",
				"White Bed"
			);
		}

		const sectionCards = combinedSectionNames.map((sectionName) => ({
			name: sectionName,
			products: filteredProducts.filter((product) => normalizeSectionName(product) === sectionName),
		}));

		const hasSearch = Boolean((search || "").trim());

		return hasSearch
			? sectionCards.filter((section) => section.products.length)
			: sectionCards;
	}, [filteredProducts, products, search, sections]);

	const jumpToSection = (sectionName) => {
		const sectionId = `section-${sectionName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
		const element = document.getElementById(sectionId);

		if (element) {
			element.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	};

	return (
		<section className="space-y-8">
			<div className="overflow-hidden rounded-3xl border border-indigo-200 bg-linear-to-r from-indigo-700 via-indigo-600 to-amber-500 p-6 text-white shadow-xl sm:p-8">
				<p className="text-xs uppercase tracking-[0.25em] text-indigo-100 sm:text-sm">Premium Collection</p>
				<h1 className="mt-2 text-2xl font-bold sm:text-4xl">Beautiful Furniture for Modern Homes</h1>
				<p className="mt-3 max-w-2xl text-sm text-indigo-50 sm:text-base">
					Explore modern wooden and iron furniture with section-wise browsing like top ecommerce stores.
				</p>

				<div className="mt-5 flex flex-wrap gap-2">
					{groupedSections.slice(0, 10).map((section) => (
						<button
							key={section.name}
							type="button"
							onClick={() => jumpToSection(section.name)}
							className="rounded-full border border-white/50 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
						>
							{section.name}
						</button>
					))}
				</div>
			</div>

			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-semibold text-slate-900">All Product Sections</h2>
				<span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200">
					{filteredProducts.length} items
				</span>
			</div>

			{loading ? <p className="text-slate-600">Loading products...</p> : null}
			{error ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-rose-600">{error}</p> : null}

			{!loading && !error ? (
				groupedSections.length ? (
					<div className="space-y-10">
						{groupedSections.map((section) => {
							const sectionId = `section-${section.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

							return (
								<div key={section.name} id={sectionId} className="space-y-4 scroll-mt-24">
									<div className="flex flex-wrap items-center justify-between gap-2">
										<h3 className="text-xl font-bold text-slate-900 sm:text-2xl">{section.name}</h3>
										<span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
											{section.products.length} products
										</span>
									</div>

									{section.products.length ? (
										<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
											{section.products.map((product) => (
												<ProductCard
													key={product._id}
													product={product}
													onView={() => navigate(`/product/${product._id}`)}
												/>
											))}
										</div>
									) : (
										<div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
											No products currently available in this section.
										</div>
									)}
								</div>
							);
						})}
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
