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
					style={{ color: "#00d4ff" }}
				>
          ✦ Premium Collection
				</p>
				<h1
					className="mt-3 text-2xl font-bold sm:text-4xl lg:text-5xl"
					style={{ color: "#f1f5f9", lineHeight: 1.15 }}
				>
					Beautiful Furniture<br />
					<span
						style={{
							background: "linear-gradient(135deg, #00d4ff, #a855f7)",
							WebkitBackgroundClip: "text",
							WebkitTextFillColor: "transparent",
						}}
					>
						for Modern Homes
					</span>
				</h1>
				<p className="mt-4 max-w-2xl text-sm sm:text-base" style={{ color: "#64748b" }}>
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
								background: "rgba(0,212,255,0.08)",
								border: "1px solid rgba(0,212,255,0.2)",
								color: "#94a3b8",
							}}
							onMouseEnter={e => {
								e.currentTarget.style.background = "rgba(0,212,255,0.15)";
								e.currentTarget.style.color = "#00d4ff";
								e.currentTarget.style.borderColor = "rgba(0,212,255,0.4)";
							}}
							onMouseLeave={e => {
								e.currentTarget.style.background = "rgba(0,212,255,0.08)";
								e.currentTarget.style.color = "#94a3b8";
								e.currentTarget.style.borderColor = "rgba(0,212,255,0.2)";
							}}
						>
							{section.name}
						</button>
					))}
				</div>
			</div>

			{/* Section Header */}
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold sm:text-2xl" style={{ color: "#e2e8f0" }}>
					All Product Sections
				</h2>
				<span
					className="rounded-full px-3 py-1 text-sm font-medium"
					style={{
						background: "rgba(0,212,255,0.08)",
						border: "1px solid rgba(0,212,255,0.2)",
						color: "#00d4ff",
					}}
				>
					{filteredProducts.length} items
				</span>
			</div>

			{loading ? (
				<div className="flex items-center gap-3 py-8">
					<div
						className="h-5 w-5 rounded-full animate-spin"
						style={{ border: "2px solid rgba(0,212,255,0.2)", borderTopColor: "#00d4ff" }}
					/>
					<p style={{ color: "#64748b" }}>Loading products...</p>
				</div>
			) : null}
			{error ? (
				<p
					className="rounded-xl px-4 py-3 text-sm"
					style={{
						background: "rgba(239,68,68,0.08)",
						border: "1px solid rgba(239,68,68,0.2)",
						color: "#f87171",
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
												style={{ background: "linear-gradient(180deg, #00d4ff, #a855f7)" }}
											/>
											<h3 className="text-xl font-bold sm:text-2xl" style={{ color: "#f1f5f9" }}>
												{section.name}
											</h3>
										</div>
										<span
											className="rounded-full px-3 py-1 text-xs font-semibold"
											style={{
												background: "rgba(168,85,247,0.1)",
												border: "1px solid rgba(168,85,247,0.2)",
												color: "#c084fc",
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
												background: "rgba(255,255,255,0.02)",
												border: "1px dashed rgba(255,255,255,0.08)",
												color: "#475569",
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
						<p style={{ color: "#64748b" }}>No products found for your search.</p>
					</div>
				)
			) : null}
		</section>
	);
}

export default Home;
