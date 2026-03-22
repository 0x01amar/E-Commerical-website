import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingBagIcon,
  SparklesIcon,
  ShieldCheckIcon,
  StarIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import ProductCard from "../components/ProductCard";
import { apiFetchJson, resolveApiErrorMessage } from "../config/api";
import { Button } from "../components/ui/button";

const DEFAULT_HERO_IMAGE = "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1400&q=80";

function Home({ search }) {
  const navigate = useNavigate();
  
  // Use sessionStorage for immediate rendering on return visits
  const [products, setProducts] = useState(() => {
    const cached = sessionStorage.getItem("cached_products");
    return cached ? JSON.parse(cached) : [];
  });
  
  const [sections, setSections] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isHeroLoading, setIsHeroLoading] = useState(true);
  const [error, setError] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState(sessionStorage.getItem("cached_hero_url") || null);
  const [siteContent, setSiteContent] = useState(() => {
    const cached = sessionStorage.getItem("cached_site_content");
    return cached ? JSON.parse(cached) : null;
  });
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const isAdmin = localStorage.getItem("role") === "admin";
  const hasActiveSearch = Boolean(search?.trim());

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Step 1: Load Hero and Site Content first for fast visual load
        const [heroRes, contentRes] = await Promise.all([
          apiFetchJson("/settings/hero-image"),
          apiFetchJson("/site-content")
        ]);

        if (heroRes.response.ok && heroRes.data?.heroImageUrl) {
          setHeroImageUrl(heroRes.data.heroImageUrl);
          sessionStorage.setItem("cached_hero_url", heroRes.data.heroImageUrl);
        } else {
          setHeroImageUrl(DEFAULT_HERO_IMAGE);
        }
        setIsHeroLoading(false);

        if (contentRes.response.ok) {
          setSiteContent(contentRes.data);
          sessionStorage.setItem("cached_site_content", JSON.stringify(contentRes.data));
        }
      } catch (err) {
        console.error("Hero load error:", err);
        setHeroImageUrl(DEFAULT_HERO_IMAGE);
        setIsHeroLoading(false);
      }
    };

    const loadHeavyData = async () => {
      try {
        // Step 2: Load products and sections in the background
        const [productsRes, sectionsRes] = await Promise.all([
          apiFetchJson("/products"),
          apiFetchJson("/products/sections")
        ]);

        if (productsRes.response.ok) {
          setProducts(productsRes.data || []);
          sessionStorage.setItem("cached_products", JSON.stringify(productsRes.data || []));
        }
        if (sectionsRes.response.ok) setSections(sectionsRes.data || []);
      } catch (err) {
        setError(resolveApiErrorMessage(err, "Failed to load store data"));
      } finally {
        setIsDataLoading(false);
      }
    };

    loadInitialData();
    loadHeavyData();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = search?.toLowerCase().trim();
    if (!term) return products;
    return products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.category?.toLowerCase().includes(term) || 
      p.section?.toLowerCase().includes(term)
    );
  }, [products, search]);

  const groupedBySection = useMemo(() => {
    const groups = {};
    filteredProducts.forEach(p => {
      const section = p.section || p.category || "General";
      if (!groups[section]) groups[section] = [];
      groups[section].push(p);
    });
    return Object.entries(groups).map(([name, items]) => ({ name, items }));
  }, [filteredProducts]);

  const shopName = siteContent?.shopName || "Maa Sheela Iron Arts";
  const tagline = siteContent?.tagline || "Elevate your home with our handcrafted collection of premium furniture. Where traditional craftsmanship meets modern elegance.";

  return (
    <div className={`${hasActiveSearch ? "pt-24 space-y-12" : "space-y-12 md:space-y-24"} pb-20 page-transition`}>
      {/* Hero Section */}
      {!hasActiveSearch && (
        <section className="relative h-[70vh] md:h-screen min-h-[500px] md:min-h-[700px] flex items-center overflow-hidden bg-neutral-dark mobile-hero-height">
          {(isHeroLoading && !heroImageUrl) ? (
            <div className="absolute inset-0 z-0 bg-neutral-dark animate-pulse" />
          ) : (
            <div className="absolute inset-0 z-0">
              <img 
                key={heroImageUrl}
                src={heroImageUrl || DEFAULT_HERO_IMAGE} 
                alt="Hero" 
                fetchPriority="high"
                onLoad={() => setImageLoaded(true)}
                className={`w-full h-full object-cover scale-105 animate-slow-zoom transition-opacity duration-1000 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onError={(e) => {
                  if (e.target.src !== DEFAULT_HERO_IMAGE) {
                    e.target.src = DEFAULT_HERO_IMAGE;
                  }
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-neutral-dark/80 via-neutral-dark/40 to-transparent md:via-neutral-dark/40" />
            </div>
          )}

          <div className="relative z-10 max-w-7xl mx-auto px-6 w-full text-white space-y-8">
            <div className="space-y-4 max-w-2xl animate-in fade-in slide-in-from-left duration-1000">
              <h2 className="text-secondary font-bold tracking-[0.2em] uppercase text-xs md:text-sm">Crafted for Excellence</h2>
              <h1 className="text-4xl md:text-8xl font-heading font-bold leading-[1.1]">
                {shopName.split(' ').slice(0, -1).join(' ')} <br /> <span className="text-primary-foreground">{shopName.split(' ').slice(-1)}</span>
              </h1>
              <p className="text-base md:text-lg text-white/80 max-w-lg font-body leading-relaxed">
                {tagline}
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-3 md:gap-4 animate-in fade-in slide-in-from-bottom duration-1000 delay-300">
              <Button size="sm" className="w-full md:w-auto h-11 md:h-12 md:px-8 md:text-sm" onClick={() => document.getElementById('collections').scrollIntoView({behavior: 'smooth'})}>
                Explore Collection
              </Button>
              <Button size="sm" variant="outline" className="w-full md:w-auto h-11 md:h-12 md:px-8 md:text-sm text-white border-white hover:bg-white hover:text-neutral-dark" onClick={() => navigate("/custom-order")}>
                Custom Orders
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Featured Benefits */}
      {!hasActiveSearch && (
        <section className="max-w-7xl mx-auto md:px-6 mt-12 mobile-benefits-container">
          <div className="mobile-benefits-scroll grid grid-cols-4 gap-4 md:gap-12">
            {[
              { icon: ShieldCheckIcon, title: "Premium Quality", desc: "Crafted from high-grade iron and teak wood." },
              { icon: SparklesIcon, title: "Custom Designs", desc: "Get furniture tailored to your specific needs." },
              { icon: StarIcon, title: "Expert Artistry", desc: "Handmade by skilled artisans with years of experience." },
              { icon: ShoppingBagIcon, title: "Safe Shipping", desc: "Crated packing for zero damage during transit." }
            ].map((item, i) => (
              <div key={i} className="space-y-4 text-center md:text-left mobile-benefit-item">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto md:mx-0">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-heading text-xl font-bold">{item.title}</h3>
                <p className="text-sm text-neutral-dark/60 leading-relaxed md:block hidden">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Products Section */}
      <section id="collections" className="max-w-7xl mx-auto md:px-6 space-y-16 scroll-mt-24">
        {hasActiveSearch ? (
          <div className="space-y-8 px-6 md:px-0">
            <h2 className="text-2xl md:text-3xl font-heading font-bold flex items-center gap-4">
              <MagnifyingGlassIcon className="w-6 h-6 md:w-8 md:h-8 text-primary" />
              Search Results for "{search}"
            </h2>
            {filteredProducts.length > 0 ? (
              <div className="mobile-product-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {filteredProducts.map(p => (
                  <ProductCard key={p._id} product={p} onView={() => navigate(`/product/${p._id}`)} showAdminActions={isAdmin} />
                ))}
              </div>
            ) : isDataLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {[1,2,3,4].map(i => (
                  <div key={i} className="space-y-4 animate-pulse">
                    <div className="aspect-[4/5] bg-neutral-dark/5 rounded-sm" />
                    <div className="h-6 bg-neutral-dark/5 w-3/4" />
                    <div className="h-4 bg-neutral-dark/5 w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center space-y-4 bg-neutral-cream rounded-sm">
                <p className="text-neutral-dark/40 italic">No pieces found matching your search.</p>
                <Button variant="outline" onClick={() => navigate(0)}>Clear Search</Button>
              </div>
            )}
          </div>
        ) : (
          <>
            {groupedBySection.map((section, idx) => (
              <div key={section.name} className="space-y-8 md:space-y-10 animate-in fade-in duration-700">
                <div className="flex justify-between items-end border-b border-neutral-dark/10 pb-6 mx-6 md:mx-0">
                  <div className="space-y-2">
                    <span className="text-secondary font-bold text-[10px] md:text-xs uppercase tracking-widest">Collection {idx + 1}</span>
                    <h2 className="text-3xl md:text-4xl font-heading font-bold mobile-section-title">{section.name}</h2>
                  </div>
                  <Button variant="ghost" className="group hidden md:flex">
                    View All <ArrowRightIcon className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                  </Button>
                </div>

                <div className="mobile-product-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
                  {section.items.map(p => (
                    <ProductCard key={p._id} product={p} onView={() => navigate(`/product/${p._id}`)} showAdminActions={isAdmin} />
                  ))}
                </div>
              </div>
            ))}

            {(isDataLoading && products.length === 0) && (
              <div className="space-y-12">
                {[1, 2].map(s => (
                  <div key={s} className="space-y-8">
                    <div className="h-10 bg-neutral-dark/5 w-1/4 rounded-sm animate-pulse mx-6 md:mx-0" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 px-6 md:px-0">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="space-y-4 animate-pulse">
                          <div className="aspect-[4/5] bg-neutral-dark/5 rounded-sm" />
                          <div className="h-6 bg-neutral-dark/5 w-3/4" />
                          <div className="h-4 bg-neutral-dark/5 w-1/2" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* CTA Section */}
      {!hasActiveSearch && (
        <section className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="bg-primary p-6 md:p-20 text-center text-white space-y-6 md:space-y-8 rounded-2xl md:rounded-sm relative overflow-hidden shadow-2xl md:shadow-none">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="relative z-10 space-y-4 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-heading font-bold leading-tight">Bring Your Vision to Life</h2>
              <p className="text-white/80 text-base md:text-lg font-body leading-relaxed">
                Can't find exactly what you're looking for? We specialize in custom iron and wooden furniture. Let's create something unique for your space.
              </p>
              <div className="pt-4 md:pt-6">
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full md:w-auto px-6 md:px-12 h-auto min-h-14 md:h-16 rounded-xl md:rounded-sm flex items-center justify-center gap-2 group/cta whitespace-normal md:whitespace-nowrap py-4 md:py-0"
                  onClick={() => navigate("/contact")}
                >
                  Contact for Custom Quote
                  <ArrowRightIcon className="w-5 h-5 transition-transform group-hover/cta:translate-x-1 shrink-0" />
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default Home;
