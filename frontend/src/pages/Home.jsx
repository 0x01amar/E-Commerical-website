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
	const isAdmin = localStorage.getItem("role") === "admin";

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
			{/* Hero Banner */}
			<div
				className="hero-dark relative overflow-hidden p-6 sm:p-10"
			>
				<p
					className="text-xs uppercase tracking-[0.3em] font-semibold sm:text-sm"
					style={{ color: "#0284c7" }}
				>
          ✦ Premium Collection
				</p>
				<h1
					className="mt-3 text-2xl font-bold sm:text-4xl lg:text-5xl"
					style={{ color: "#1a2f48", lineHeight: 1.15 }}
				>
					Beautiful Furniture<br />
					<span
						style={{
								background: "linear-gradient(135deg, #0284c7, #7c3aed)",
							WebkitBackgroundClip: "text",
							WebkitTextFillColor: "transparent",
						}}
					>
						for Modern Homes
					</span>
				</h1>
				<p className="mt-4 max-w-2xl text-sm sm:text-base" style={{ color: "#3a5470" }}>
					Explore premium wooden and iron furniture. Crafted for elegance, built to last.
				</p>

				<div className="mt-6 flex flex-wrap gap-2">
					{groupedSections.slice(0, 10).map((section) => (
						<button
							key={section.name}
							type="button"
							onClick={() => jumpToSection(section.name)}
							className="rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-250 hover:scale-105"
							style={{
								background: "rgba(2,132,199,0.08)",
								border: "1px solid rgba(2,132,199,0.25)",
								color: "#2d5a8e",
							}}
							onMouseEnter={e => {
							e.currentTarget.style.background = "rgba(2,132,199,0.15)";
							e.currentTarget.style.color = "#0284c7";
							e.currentTarget.style.borderColor = "rgba(2,132,199,0.45)";
						}}
						onMouseLeave={e => {
							e.currentTarget.style.background = "rgba(2,132,199,0.08)";
							e.currentTarget.style.color = "#2d5a8e";
							e.currentTarget.style.borderColor = "rgba(2,132,199,0.25)";
							}}
						>
							{section.name}
						</button>
					))}
				</div>
			</div>

			{/* Section Header */}
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold sm:text-2xl" style={{ color: "#1a2f48" }}>
					All Product Sections
				</h2>
				<span
					className="rounded-full px-3 py-1 text-sm font-medium"
					style={{
						background: "rgba(2,132,199,0.08)",
						border: "1px solid rgba(2,132,199,0.22)",
						color: "#0284c7",
					}}
				>
					{filteredProducts.length} items
				</span>
			</div>

			{loading ? (
				<div className="flex items-center gap-3 py-8">
					<div
						className="h-5 w-5 rounded-full animate-spin"
						style={{ border: "2px solid rgba(2,132,199,0.2)", borderTopColor: "#0284c7" }}
					/>
					<p style={{ color: "#3a5470" }}>Loading products...</p>
				</div>
			) : null}
			{error ? (
				<p
					className="rounded-xl px-4 py-3 text-sm"
					style={{
						background: "rgba(239,68,68,0.07)",
						border: "1px solid rgba(239,68,68,0.2)",
						color: "#dc2626",
					}}
				>
					{error}
				</p>
			) : null}

			{!loading && !error ? (
				groupedSections.length ? (
					<div className="space-y-10">
						{groupedSections.map((section) => {
							const sectionId = `section-${section.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

							return (
								<div key={section.name} id={sectionId} className="space-y-4 scroll-mt-24">
									{/* Section Label */}
									<div className="flex flex-wrap items-center justify-between gap-2">
										<div className="flex items-center gap-3">
											<div
												className="h-6 w-1 rounded-full"
												style={{ background: "linear-gradient(180deg, #0284c7, #7c3aed)" }}
											/>
											<h3 className="text-xl font-bold sm:text-2xl" style={{ color: "#1a2f48" }}>
												{section.name}
											</h3>
										</div>
										<span
											className="rounded-full px-3 py-1 text-xs font-semibold"
											style={{
												background: "rgba(124,58,237,0.10)",
												border: "1px solid rgba(124,58,237,0.22)",
												color: "#7c3aed",
											}}
										>
											{section.products.length} products
										</span>
									</div>

									{section.products.length ? (
										<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
											{section.products.map((product) => (
												<ProductCard
													key={product._id}
													product={product}
													onView={() => !isAdmin && navigate(`/product/${product._id}`)}
													onEdit={() => navigate(`/admin-dashboard?edit=${product._id}`)}
													onDelete={() => console.log("delete")}
													showAdminActions={isAdmin}
												/>
											))}
										</div>
									) : (
										<div
											className="rounded-xl p-5 text-sm"
											style={{
												background: "rgba(255,255,255,0.62)",
												border: "1px dashed rgba(100,160,220,0.26)",
												color: "#6080a0",
											}}
										>
											No products currently available in this section.
										</div>
									)}
								</div>
							);
						})}
					</div>
				) : (
					<div
						className="glass rounded-2xl p-10 text-center"
					>
						<p style={{ color: "#6080a0" }}>No products found for your search.</p>
					</div>
				)
			) : null}
		</section>
	);
}

export default Home;
