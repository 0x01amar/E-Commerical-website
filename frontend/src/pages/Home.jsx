import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	ArrowRightIcon,
	ChatBubbleLeftRightIcon,
	EnvelopeIcon,
	MagnifyingGlassCircleIcon,
	MapPinIcon,
	PhoneIcon,
	ShoppingBagIcon,
	SparklesIcon,
	WrenchScrewdriverIcon,
	ShieldCheckIcon,
	StarIcon,
} from "@heroicons/react/24/outline";
import ProductCard from "../components/ProductCard";
import { apiFetchJson, resolveApiErrorMessage } from "../config/api";

const DEFAULT_HERO_IMAGE = "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80";

const DEFAULT_SITE_CONTENT = {
	shopName: "Maa Sheela Iron Art",
	tagline: "We provide high-quality furniture, iron works, wooden products, custom designs, and more at the best prices.",
	contactNumber: "",
	whatsAppNumber: "",
	address: "",
	email: "",
};

const EXPERTISE_HIGHLIGHTS = [
	{
		label: "Best-Quality Products",
		icon: ShieldCheckIcon,
		iconColorClass: "bg-emerald-500",
		cardStyle: {
			background: "rgba(16,185,129,0.22)",
			borderColor: "rgba(110,231,183,0.55)",
		},
	},
	{
		label: "Custom Iron Works",
		icon: WrenchScrewdriverIcon,
		iconColorClass: "bg-sky-500",
		cardStyle: {
			background: "rgba(56,189,248,0.22)",
			borderColor: "rgba(125,211,252,0.55)",
		},
	},
	{
		label: "Premium Wooden Designs",
		icon: StarIcon,
		iconColorClass: "bg-rose-500",
		cardStyle: {
			background: "rgba(244,63,94,0.2)",
			borderColor: "rgba(254,205,211,0.6)",
		},
	},
	{
		label: "Affordable Best Prices",
		icon: SparklesIcon,
		iconColorClass: "bg-amber-500",
		cardStyle: {
			background: "rgba(245,158,11,0.24)",
			borderColor: "rgba(253,230,138,0.62)",
		},
	},
];

const normalizeSiteContent = (payload = {}) => ({
	shopName: String(payload?.shopName || "").trim() || DEFAULT_SITE_CONTENT.shopName,
	tagline: String(payload?.tagline || "").trim() || DEFAULT_SITE_CONTENT.tagline,
	contactNumber: String(payload?.contactNumber || "").trim(),
	whatsAppNumber: String(payload?.whatsAppNumber || "").trim(),
	address: String(payload?.address || "").trim(),
	email: String(payload?.email || "").trim(),
});

function Home({ search }) {
	const navigate = useNavigate();
	const [products, setProducts] = useState([]);
	const [sections, setSections] = useState([]);
	const [loading, setLoading] = useState(true);
	const [siteContentLoading, setSiteContentLoading] = useState(true);
	const [error, setError] = useState("");
	const [heroImageUrl, setHeroImageUrl] = useState(DEFAULT_HERO_IMAGE);
	const [siteContent, setSiteContent] = useState(DEFAULT_SITE_CONTENT);
	const [activeHeroCategory, setActiveHeroCategory] = useState("");
	const isAdmin = localStorage.getItem("role") === "admin";
	const hasActiveSearch = Boolean(String(search || "").trim());

	const normalizeSectionName = (product = {}) => {
		const sectionValue = String(product?.section || product?.category || "General").trim();
		return sectionValue || "General";
	};

	useEffect(() => {
		const loadHomeData = async () => {
			try {
				setLoading(true);
				setSiteContentLoading(true);

				const [productsResult, sectionsResult] = await Promise.all([
					apiFetchJson("/products"),
					apiFetchJson("/products/sections"),
				]);

				if (!productsResult.response.ok) {
					throw new Error(productsResult.data?.message || "Failed to load products");
				}

				if (!sectionsResult.response.ok) {
					throw new Error(sectionsResult.data?.message || "Failed to load sections");
				}

				const normalizedProducts = Array.isArray(productsResult.data) ? productsResult.data : [];
				const normalizedSections = Array.isArray(sectionsResult.data)
					? sectionsResult.data
						.map((section) => String(section?.name || "").trim())
						.filter(Boolean)
					: [];

				setProducts(normalizedProducts);
				setSections(normalizedSections);
				setError("");

				const [heroResult, siteContentResult] = await Promise.allSettled([
					apiFetchJson("/settings/hero-image"),
					apiFetchJson("/site-content"),
				]);

				if (heroResult.status === "fulfilled") {
					const { response, data } = heroResult.value;
					if (response.ok && data?.heroImageUrl) {
						setHeroImageUrl(String(data.heroImageUrl));
					}
				}

				if (siteContentResult.status === "fulfilled") {
					const { response, data } = siteContentResult.value;
					if (response.ok) {
						setSiteContent(normalizeSiteContent(data));
					}
				}
			} catch (fetchError) {
				setError(resolveApiErrorMessage(fetchError, "Failed to load homepage data"));
			} finally {
				setLoading(false);
				setSiteContentLoading(false);
			}
		};

		loadHomeData();
	}, []);

	useEffect(() => {
		if (hasActiveSearch) {
			return;
		}

		if (sessionStorage.getItem("scrollToProducts") !== "1") {
			return;
		}

		sessionStorage.removeItem("scrollToProducts");

		const timeoutId = window.setTimeout(() => {
			const productsSection = document.getElementById("all-sections");

			if (productsSection) {
				productsSection.scrollIntoView({ behavior: "smooth", block: "start" });
			}
		}, 120);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [hasActiveSearch]);

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

	const contactDigits = useMemo(
		() => String(siteContent.contactNumber || "").replace(/\D+/g, ""),
		[siteContent.contactNumber]
	);
	const whatsAppDigits = useMemo(
		() => String(siteContent.whatsAppNumber || siteContent.contactNumber || "").replace(/\D+/g, ""),
		[siteContent.whatsAppNumber, siteContent.contactNumber]
	);

	const callNowHref = contactDigits ? `tel:${contactDigits}` : "";
	const whatsAppHref = whatsAppDigits ? `https://wa.me/${whatsAppDigits}` : "";
	const emailHref = siteContent.email ? `mailto:${siteContent.email}` : "";
	const whatsAppDisplay = siteContent.whatsAppNumber || siteContent.contactNumber;
	const mapsEmbedUrl = siteContent.address
		? `https://www.google.com/maps?q=${encodeURIComponent(siteContent.address)}&output=embed`
		: "";
	const mapsOpenUrl = siteContent.address
		? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(siteContent.address)}`
		: "";

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
			{!hasActiveSearch ? (
				<div className="flex min-h-screen flex-col gap-3 md:min-h-[calc(100vh-8rem)] md:gap-4">
					<div
						className="relative w-full overflow-hidden rounded-3xl border px-4 py-4 text-center shadow-lg animate-fade-in sm:px-6 sm:py-5"
						style={{
							background: "#0f5f75",
							borderColor: "#0e7490",
						}}
					>
						<div className="pointer-events-none absolute -left-16 -top-16 h-44 w-44 rounded-full bg-cyan-200/25 blur-2xl" />
						<div className="pointer-events-none absolute -bottom-14 -right-10 h-40 w-40 rounded-full bg-amber-200/30 blur-2xl" />

						{siteContentLoading ? (
							<p className="text-xs font-medium text-cyan-50 sm:text-sm">Loading store details...</p>
						) : (
							<>
								<h2
									className="relative text-2xl font-black uppercase tracking-widest text-amber-100 sm:text-3xl lg:text-4xl"
									style={{ textShadow: "0 8px 24px rgba(0,0,0,0.28)" }}
								>
									{siteContent.shopName}
								</h2>
								<p className="relative mx-auto mt-2 max-w-3xl text-xs font-medium leading-5 text-cyan-50 sm:text-sm">
									{siteContent.tagline}
								</p>

								<div className="relative mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
									{EXPERTISE_HIGHLIGHTS.map((highlight) => {
										const Icon = highlight.icon;

										return (
											<div
												key={highlight.label}
												className="flex items-center justify-center gap-2 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold text-white backdrop-blur-sm sm:text-xs"
												style={highlight.cardStyle}
											>
												<span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${highlight.iconColorClass}`}>
													<Icon className="h-3.5 w-3.5 text-white" />
												</span>
												{highlight.label}
											</div>
										);
									})}
								</div>
							</>
						)}
					</div>

					<div className="flex flex-1 rounded-2xl border border-slate-200 bg-white shadow-sm animate-fade-in md:rounded-3xl">
						<div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-3 px-3 py-5 md:gap-6 md:px-4 md:py-10 lg:py-14 md:grid-cols-2">
							<div className="max-w-xl space-y-2 md:space-y-4">
								<h1 className="text-2xl font-bold leading-tight text-slate-900 md:text-4xl lg:text-5xl">
									<span className="text-slate-900">MAA SHEELA </span>
									<span className="text-amber-500">IRON ART</span>
								</h1>

								<div className="md:hidden">
									<div className="h-40 w-full max-w-96 overflow-hidden rounded-lg md:rounded-2xl">
										<img
											src={heroImageUrl}
											alt="Elegant furniture showcase"
											loading="lazy"
											className="h-full w-full rounded-lg md:rounded-2xl object-cover shadow-lg transition-transform duration-300 hover:scale-[1.02]"
											onError={(event) => {
												event.currentTarget.src = DEFAULT_HERO_IMAGE;
											}}
										/>
									</div>
								</div>

								<h2 className="text-base font-medium text-slate-600 md:text-lg lg:text-2xl">
									Beautiful Furniture for Modern Homes
								</h2>

								<p className="max-w-md text-sm leading-6 text-slate-600 sm:text-base">
									Premium handcrafted iron and wooden furniture designed for durability, comfort, and clean modern living.
								</p>

								<div className="mt-4 flex flex-wrap gap-2">
									<button
										type="button"
										onClick={handleShopNow}
										className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white transition-all duration-300 hover:bg-blue-800 hover:shadow-md md:px-5 md:py-2 md:text-sm md:rounded-xl"
									>
										<ShoppingBagIcon className="h-4 w-4" />
										Shop Now
									</button>
									<button
										type="button"
										onClick={() => scrollToId("all-sections")}
										className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all duration-300 hover:border-blue-300 hover:text-blue-700 hover:shadow-md md:px-5 md:py-2 md:text-sm md:rounded-xl"
									>
										<MagnifyingGlassCircleIcon className="h-5 w-5" />
										Explore
										<ArrowRightIcon className="h-4 w-4" />
									</button>
								</div>

							<div className="mt-4 hidden flex-wrap gap-2 md:flex">
									{groupedSections.map((section) => {
										const isActive = activeHeroCategory === section.name;

										return (
											<button
												key={`hero-category-${section.name}`}
												type="button"
												onClick={() => {
													setActiveHeroCategory(section.name);
													jumpToSection(section.name);
												}}
												className={`rounded-full border bg-white px-3 py-1 text-xs transition-all duration-300 hover:scale-105 hover:bg-blue-600 hover:text-white md:px-4 md:py-1 md:text-sm ${isActive
													? "border-blue-600 bg-blue-600 text-white"
													: "border-slate-300 text-slate-700"
												}`}
											>
												{section.name}
											</button>
										);
									})}
								</div>
							</div>

							<div className="hidden h-62.5 w-full max-w-112.5 shrink-0 justify-self-center sm:h-87.5 md:block md:h-100 md:justify-self-end">
								<img
									src={heroImageUrl}
									alt="Elegant furniture showcase"
									loading="lazy"
									className="h-full w-full rounded-2xl object-cover shadow-lg transition-transform duration-300 hover:scale-[1.02]"
									onError={(event) => {
										event.currentTarget.src = DEFAULT_HERO_IMAGE;
									}}
								/>
							</div>
						</div>
					</div>
				</div>
			) : null}

			{!hasActiveSearch ? (
				<>
					<div id="all-sections" className="scroll-mt-28" />
					<div className="hidden items-center justify-between sm:flex">
						<h2 className="text-base font-semibold sm:text-lg md:text-xl" style={{ color: "#1a2f48" }}>
							All Product Sections
						</h2>
						<span
							className="rounded-full px-2 py-0.5 text-xs font-medium sm:px-3 sm:py-1 sm:text-sm"
							style={{
								background: "rgba(2,132,199,0.08)",
								border: "1px solid rgba(2,132,199,0.22)",
								color: "#0284c7",
							}}
						>
							{filteredProducts.length} items
						</span>
					</div>
				</>
			) : null}

			{loading ? (
				<div className="grid grid-cols-2 gap-2 sm:grid-cols-2 md:gap-3 lg:grid-cols-3 xl:grid-cols-4">
					{Array.from({ length: 8 }).map((_, index) => (
						<div key={`skeleton-${index}`} className="overflow-hidden rounded-lg border border-blue-100 bg-white/80 p-2 shadow-sm animate-pulse md:rounded-2xl md:p-3">
							<div className="h-32 rounded-lg bg-blue-100 md:h-40 md:rounded-xl" />
							<div className="mt-2 h-3 w-3/4 rounded bg-blue-100 md:mt-3 md:h-4" />
							<div className="mt-1.5 h-3 w-1/2 rounded bg-blue-100 md:mt-2 md:h-4" />
							<div className="mt-2 h-6 w-full rounded-lg bg-blue-100 md:mt-4 md:h-8" />
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
				hasActiveSearch ? (
					filteredProducts.length ? (
						<div className="grid grid-cols-2 gap-2 sm:grid-cols-2 md:gap-3 lg:grid-cols-3 xl:grid-cols-4" id="search-results">
							{filteredProducts.map((product) => (
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
						<div className="glass rounded-lg p-5 text-center md:rounded-2xl md:p-10">
							<p style={{ color: "#6080a0" }} className="text-sm md:text-base">No products found for your search.</p>
						</div>
					)
				) : groupedSections.length ? (
					<div className="space-y-6 md:space-y-10">
						{groupedSections.map((section) => {
							const sectionId = `section-${section.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

							return (
								<div key={section.name} id={sectionId} className="space-y-3 scroll-mt-24 md:space-y-4">
									<div className="flex flex-wrap items-center justify-between gap-1 md:gap-2">
										<div className="flex items-center gap-2 md:gap-3">
											<div
												className="h-5 w-0.5 rounded-full md:h-6 md:w-1"
												style={{ background: "linear-gradient(180deg, #0284c7, #7c3aed)" }}
											/>
											<h3 className="text-base font-bold sm:text-lg md:text-xl lg:text-2xl" style={{ color: "#1a2f48" }}>
												{section.name}
											</h3>
										</div>
										<span
											className="rounded-full px-2 py-0.5 text-[9px] font-semibold md:px-3 md:py-1 md:text-xs"
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
										<div className="grid grid-cols-2 gap-2 sm:grid-cols-2 md:gap-3 lg:grid-cols-3 xl:grid-cols-4">
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
											className="rounded-lg p-3 text-xs md:rounded-xl md:p-5 md:text-sm"
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
					<div className="glass rounded-2xl p-10 text-center">
						<p style={{ color: "#6080a0" }}>No products found for your search.</p>
					</div>
				)
			) : null}

			{!hasActiveSearch ? (
				<div className="glass rounded-lg p-3 sm:p-4 md:rounded-2xl md:p-5 lg:p-6" id="contact-us">
					<h2 className="text-base font-bold sm:text-lg md:text-xl lg:text-2xl" style={{ color: "#1a2f48" }}>Contact Us</h2>
					<p className="mt-0.5 text-xs sm:text-sm md:mt-1" style={{ color: "#6080a0" }}>
						Reach out for furniture orders, custom iron and wooden designs, bulk inquiries, and pricing details.
					</p>

					<div className="mt-3 grid grid-cols-1 items-stretch gap-2 md:gap-3 md:mt-5 lg:grid-cols-2">
						<div className="flex h-full flex-col gap-2 md:gap-3">
							<div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-white/80 p-2 md:rounded-xl md:p-3">
								<PhoneIcon className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 md:h-5 md:w-5" />
								<div>
									<p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 md:text-xs">Phone Number</p>
									<p className="text-xs text-slate-700 md:text-sm">{siteContent.contactNumber || "Not updated yet"}</p>
								</div>
							</div>

							<div className="flex items-start gap-2 rounded-lg border border-emerald-100 bg-white/80 p-2 md:rounded-xl md:p-3">
								<ChatBubbleLeftRightIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 md:h-5 md:w-5" />
								<div>
									<p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 md:text-xs">WhatsApp Number</p>
									{whatsAppHref ? (
										<a
											href={whatsAppHref}
											target="_blank"
											rel="noreferrer"
											className="text-xs font-medium text-emerald-700 underline-offset-2 hover:underline md:text-sm"
										>
											{whatsAppDisplay || "Not updated yet"}
										</a>
									) : (
										<p className="text-xs text-slate-700 md:text-sm">Not updated yet</p>
									)}
								</div>
							</div>

							<div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-white/80 p-2 md:rounded-xl md:p-3">
								<EnvelopeIcon className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 md:h-5 md:w-5" />
								<div>
									<p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 md:text-xs">Email</p>
									{emailHref ? (
										<a href={emailHref} className="text-xs font-medium text-blue-700 underline-offset-2 hover:underline md:text-sm">
											{siteContent.email}
										</a>
									) : (
										<p className="text-xs text-slate-700 md:text-sm">Not updated yet</p>
									)}
								</div>
							</div>

							<div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-white/80 p-2 md:rounded-xl md:p-3">
								<MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 md:h-5 md:w-5" />
								<div>
									<p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 md:text-xs">Address</p>
									<p className="text-xs text-slate-700 md:text-sm">{siteContent.address || "Address not updated yet"}</p>
								</div>
							</div>

							<div className="flex flex-wrap gap-1.5 pt-0.5 md:gap-2 md:pt-1">
								{callNowHref ? (
									<a
										href={callNowHref}
										className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-md transition-all duration-300 hover:scale-105 hover:bg-blue-700 md:px-4 md:py-2 md:text-sm md:rounded-xl"
									>
										<PhoneIcon className="h-3 w-3 md:h-4 md:w-4" />
										Call Now
									</a>
								) : (
									<button
										type="button"
										disabled
										className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-600 md:px-4 md:py-2 md:text-sm md:rounded-xl"
									>
										<PhoneIcon className="h-3 w-3 md:h-4 md:w-4" />
										Call Now
									</button>
								)}

								{whatsAppHref ? (
									<a
										href={whatsAppHref}
										target="_blank"
										rel="noreferrer"
										className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-md transition-all duration-300 hover:scale-105 hover:bg-emerald-700 md:px-4 md:py-2 md:text-sm md:rounded-xl"
									>
										<ChatBubbleLeftRightIcon className="h-3 w-3 md:h-4 md:w-4" />
										WhatsApp
									</a>
								) : null}

								{emailHref ? (
									<a
										href={emailHref}
										className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-md transition-all duration-300 hover:scale-105 hover:bg-sky-700 md:px-4 md:py-2 md:text-sm md:rounded-xl"
									>
										<EnvelopeIcon className="h-3 w-3 md:h-4 md:w-4" />
										Email Us
									</a>
								) : null}
							</div>

							<div className="grid gap-2 pt-1 sm:grid-cols-2">
								<div className="rounded-xl border border-sky-100 bg-sky-50/70 p-2.5">
									<p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">Support Hours</p>
									<p className="text-sm text-slate-700">Mon-Sat • 9:00 AM to 8:00 PM</p>
								</div>
								<div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-2.5">
									<p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Quick Response</p>
									<p className="text-sm text-slate-700">WhatsApp and call support for urgent orders</p>
								</div>
							</div>
						</div>

						<div className="h-full">
							<div className="relative h-full min-h-75 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-md">
								{siteContent.address ? (
									<>
										<iframe
											title="Shop location"
											src={mapsEmbedUrl}
											loading="lazy"
											referrerPolicy="no-referrer-when-downgrade"
											className="h-full min-h-75 w-full border-0"
										/>
										<a
											href={mapsOpenUrl}
											target="_blank"
											rel="noreferrer"
											className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white shadow-md transition-all duration-300 hover:bg-blue-800"
										>
											<MapPinIcon className="h-4 w-4" />
											Open in Maps
										</a>
									</>
								) : (
									<div className="flex h-full min-h-75 items-center justify-center bg-slate-50 px-4 text-center">
										<p className="text-sm text-slate-600">Map preview appears here once address is updated.</p>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			) : null}
		</section>
	);
}

export default Home;
