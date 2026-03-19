import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightIcon, MagnifyingGlassCircleIcon, ShoppingBagIcon, SparklesIcon } from "@heroicons/react/24/outline";
import ProductCard from "../components/ProductCard";
import { apiFetchJson, resolveApiErrorMessage } from "../config/api";

function Home({ search }) {
	const navigate = useNavigate();
	const [products, setProducts] = useState([]);
	const [sections, setSections] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [heroImageUrl, setHeroImageUrl] = useState("https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80");
	const isAdmin = localStorage.getItem("role") === "admin";

	const normalizeSectionName = (product = {}) => {
		const sectionValue = String(product?.section || product?.category || "General").trim();
		return sectionValue || "General";
	};

	useEffect(() => {
		const loadHomeData = async () => {
			try {
				setLoading(true);

				const [productsResult, sectionsResult, heroResult] = await Promise.all([
					apiFetchJson("/products"),
					apiFetchJson("/products/sections"),
					apiFetchJson("/settings/hero-image"),
				]);

				const productResponse = productsResult.response;
				const sectionResponse = sectionsResult.response;
				const productsData = productsResult.data;
				const sectionsData = sectionsResult.data;
				const heroData = heroResult.data;

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

				if (heroData?.heroImageUrl) {
					setHeroImageUrl(heroData.heroImageUrl);
				}

				setError("");
			} catch (fetchError) {
				setError(resolveApiErrorMessage(fetchError, "Failed to load products"));
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

	const scrollToId = (id) => {
		const element = document.getElementById(id);

		if (element) {
			element.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	};

	const handleShopNow = () => {
		const firstSection = groupedSections.find((section) => section.products.length);

		if (firstSection) {
			jumpToSection(firstSection.name);
			return;
		}

		scrollToId("all-sections");
	};

	return (
		<section className="space-y-8">
			<div
				className="relative overflow-hidden rounded-3xl border p-6 shadow-lg sm:p-8 lg:p-10 animate-fade-in"
				style={{
					background: "linear-gradient(135deg, #dbeafe 0%, #eff6ff 45%, #ffffff 100%)",
					borderColor: "rgba(37,99,235,0.18)",
				}}
			>
<div className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.95fr]">
				<div>
					<h1 className="text-4xl font-black leading-[1.05] text-slate-900 sm:text-6xl lg:text-7xl">
					<span className="bg-linear-to-r from-blue-700 via-blue-600 to-blue-500 bg-clip-text text-transparent">
						MAA SHEELA
					</span>
					<span className="block bg-linear-to-r from-blue-600 via-cyan-500 to-teal-500 bg-clip-text text-transparent">
							</span>
						</h1>

						<p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
							Handcrafted iron and premium furniture that combines durability with modern elegance.
							Explore curated designs built for homes that love style and strength.
						</p>

						<div className="mt-6 flex flex-wrap gap-3">
							<button
								type="button"
								onClick={handleShopNow}
								className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:scale-105 hover:bg-blue-700 hover:shadow-lg"
							>
								<ShoppingBagIcon className="h-4 w-4" />
								Shop Now
							</button>
							<button
								type="button"
								onClick={() => scrollToId("all-sections")}
								className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-5 py-3 text-sm font-semibold text-blue-700 shadow-md transition-all duration-300 hover:scale-105 hover:shadow-lg"
							>
								<MagnifyingGlassCircleIcon className="h-5 w-5" />
								Explore
								<ArrowRightIcon className="h-4 w-4" />
							</button>
						</div>
					</div>

					<div className="relative">
						<div className="absolute -inset-4 rounded-3xl bg-blue-200/40 blur-2xl" />
						<img
							src={heroImageUrl}
							alt="Elegant furniture showcase"
							loading="lazy"
							className="relative h-64 w-full rounded-2xl object-cover shadow-lg sm:h-80"
							onError={(e) => {
								e.currentTarget.src = "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80";
							}}
						/>
					</div>
				</div>

				<div className="mt-6 flex flex-wrap gap-2">
					{groupedSections.slice(0, 10).map((section) => (
						<button
							key={section.name}
							type="button"
							onClick={() => jumpToSection(section.name)}
							className="rounded-full border border-blue-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-all duration-250 hover:scale-105 hover:shadow-md"
						>
							{section.name}
						</button>
					))}
				</div>
			</div>

			{/* Section Header */}
			<div id="all-sections" className="flex items-center justify-between scroll-mt-28">
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
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{Array.from({ length: 8 }).map((_, index) => (
						<div key={`skeleton-${index}`} className="overflow-hidden rounded-2xl border border-blue-100 bg-white/80 p-3 shadow-sm animate-pulse">
							<div className="h-40 rounded-xl bg-blue-100" />
							<div className="mt-3 h-4 w-3/4 rounded bg-blue-100" />
							<div className="mt-2 h-4 w-1/2 rounded bg-blue-100" />
							<div className="mt-4 h-8 w-full rounded-lg bg-blue-100" />
						</div>
					))}
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
