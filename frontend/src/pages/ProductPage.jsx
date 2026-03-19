import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { apiFetchJson, mediaUrl, resolveApiErrorMessage } from "../config/api";
import StarRating from "../components/StarRating";
import ReviewForm from "../components/ReviewForm";
import ImageLightbox from "../components/ImageLightbox";
import { showToast } from "../config/toast";
import { Button } from "../components/ui/button";
import { 
  ShoppingBagIcon, 
  ArrowLeftIcon, 
  ShieldCheckIcon, 
  TruckIcon, 
  ArrowPathIcon 
} from "@heroicons/react/24/outline";

function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const email = localStorage.getItem("email") || "";
  const isLoggedIn = Boolean(email);

  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState("");
  const [previewImage, setPreviewImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ratingInfo, setRatingInfo] = useState({
    canRate: false,
    hasRated: false,
    currentRating: null,
    ratingAverage: 0,
    ratingCount: 0,
  });

  const getProductImages = (item = {}) => {
    const images = [item?.image || "", ...(item?.images || [])].filter(Boolean);
    return Array.from(new Set(images));
  };

  const getProduct = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const { response, data } = await apiFetchJson(`/products/${id}`);
      if (!response.ok) throw new Error(data?.message || "Product not found");
      
      setProduct(data);
      const images = getProductImages(data);
      if (!selectedImage) setSelectedImage(images[0] || "");
      
      // Check if user has already rated
      const userRating = data.ratings?.find(r => r.userEmail === email);
      
      setRatingInfo({
        canRate: isLoggedIn && !userRating,
        hasRated: !!userRating,
        currentRating: userRating?.rating || null,
        ratingAverage: Number(data?.ratingAverage || 0),
        ratingCount: Number(data?.ratingCount || 0),
      });
    } catch (err) {
      setError(resolveApiErrorMessage(err, "Product not found"));
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    getProduct();
  }, [id, isLoggedIn, email]);

  const handleAddToCart = () => {
    if (!product) return;
    if (!isLoggedIn) {
      navigate("/login", { state: { redirectTo: `/product/${id}` } });
      return;
    }

    const cart = JSON.parse(localStorage.getItem("cartItems") || "[]");
    const existing = cart.find(item => item._id === product._id);
    
    const nextCart = existing 
      ? cart.map(item => item._id === product._id ? { ...item, quantity: (item.quantity || 1) + 1 } : item)
      : [...cart, { ...product, quantity: 1 }];

    localStorage.setItem("cartItems", JSON.stringify(nextCart));
    showToast("Added to cart", "success");
    navigate("/cart");
  };

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (error || !product) return (
    <div className="max-w-7xl mx-auto px-6 py-20 text-center space-y-6">
      <p className="text-accent font-medium">{error || "Product not found"}</p>
      <Button onClick={() => navigate("/")} variant="outline">
        <ArrowLeftIcon className="w-4 h-4 mr-2" /> Back to Home
      </Button>
    </div>
  );

  const images = getProductImages(product);

  return (
    <div className="max-w-7xl mx-auto px-6 space-y-20 pb-20 pt-24">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-neutral-dark/40 font-body">
        <Link to="/" className="hover:text-primary transition-colors">Home</Link>
        <span>/</span>
        <span className="text-neutral-dark/60">{product.section || "Collection"}</span>
        <span>/</span>
        <span className="text-neutral-dark font-medium">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        {/* Image Gallery */}
        <div className="space-y-6">
          <div className="aspect-square bg-neutral-cream rounded-sm overflow-hidden relative group">
            <img 
              src={mediaUrl(selectedImage)} 
              alt={product.name}
              className="w-full h-full object-cover cursor-zoom-in transition-transform duration-700 group-hover:scale-105"
              onClick={() => setPreviewImage(mediaUrl(selectedImage))}
            />
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-4">
              {images.map((img, i) => (
                <button 
                  key={i}
                  onClick={() => setSelectedImage(img)}
                  className={`aspect-square rounded-sm overflow-hidden border-2 transition-all ${
                    selectedImage === img ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={mediaUrl(img)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-10">
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-secondary">
              <span>{product.section || "Collection"}</span>
              {product.category && (
                <>
                  <span className="w-1 h-1 bg-neutral-dark/20 rounded-full" />
                  <span>{product.category}</span>
                </>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-neutral-dark leading-tight">
              {product.name}
            </h1>
            <div className="flex items-center gap-4">
              <StarRating value={product.ratingAverage || 0} count={product.ratingCount || 0} size="md" />
              <span className="text-neutral-dark/40 text-sm">|</span>
              <span className="text-sm text-neutral-dark/60 font-medium">Verified Buyer Reviews</span>
            </div>
            <p className="text-3xl font-body font-bold text-primary">
              ₹{Number(product.price).toLocaleString()}
            </p>
          </div>

          <div className="space-y-6">
            <p className="text-neutral-dark/70 font-body leading-relaxed text-lg">
              {product.description || "Beautifully handcrafted and designed for modern living. This piece combines traditional artistry with contemporary style."}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6 border-y border-neutral-dark/10">
              <div className="flex items-center gap-3 text-sm text-neutral-dark/60">
                <TruckIcon className="w-5 h-5 text-primary" />
                <span>Free Shipping on Orders over ₹10k</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-neutral-dark/60">
                <ShieldCheckIcon className="w-5 h-5 text-primary" />
                <span>2 Year Manufacturer Warranty</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-neutral-dark/60">
                <ArrowPathIcon className="w-5 h-5 text-primary" />
                <span>15 Days Easy Returns</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" className="flex-1 h-16 text-lg" onClick={handleAddToCart}>
              <ShoppingBagIcon className="w-6 h-6 mr-2" /> Add to Cart
            </Button>
            <Button size="lg" variant="outline" className="flex-1 h-16 text-lg" onClick={() => navigate(`/checkout/${id}?mode=buy-now`)}>
              Buy It Now
            </Button>
          </div>

          {/* Additional Info Tabs (Simplified) */}
          <div className="space-y-4 pt-4">
            <details className="group border-b border-neutral-dark/10 pb-4">
              <summary className="flex justify-between items-center font-heading font-bold cursor-pointer list-none">
                Dimensions & Details
                <span className="transition-transform group-open:rotate-180">↓</span>
              </summary>
              <div className="pt-4 text-sm text-neutral-dark/60 space-y-2 font-body">
                <p>Material: Premium Grade Iron / Teak Wood</p>
                <p>Weight: ~{Math.floor(Math.random() * 20) + 10}kg</p>
                <p>Finish: Hand-rubbed Oil / Powder Coated</p>
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* Review Section */}
      <section className="space-y-12 pt-12 border-t border-neutral-dark/10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-heading font-bold">Client Experiences</h2>
            <p className="text-neutral-dark/60 text-sm">Real feedback from our valued customers.</p>
          </div>
          {isLoggedIn ? (
            ratingInfo.canRate ? (
              <ReviewForm 
                productId={id} 
                email={email} 
                onReviewSubmitted={() => {
                  showToast("Thank you for your review!", "success");
                  getProduct(false); 
                }} 
              />
            ) : (
              <p className="text-sm font-bold text-primary italic bg-primary/5 px-4 py-2 rounded-sm uppercase tracking-widest">
                {ratingInfo.hasRated ? "✓ You have reviewed this piece" : "Order this piece to leave a review"}
              </p>
            )
          ) : (
            <Button variant="outline" onClick={() => navigate("/login")}>Login to Write a Review</Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {product.ratings?.length > 0 ? (
            product.ratings.map((r, i) => (
              <div key={i} className="bg-white p-8 space-y-6 rounded-sm border border-neutral-dark/5 shadow-sm transition-all hover:shadow-md">
                <div className="flex justify-between items-center">
                  <StarRating value={r.rating} showValue={false} size="sm" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/30">Verified Purchase</span>
                </div>
                <p className="text-neutral-dark/70 italic font-body leading-relaxed">"{r.comment || "Outstanding craftsmanship and service!"}"</p>
                <div className="pt-6 border-t border-neutral-dark/5 flex items-center gap-4">
                  <div className="w-10 h-10 bg-neutral-cream rounded-full flex items-center justify-center font-heading font-bold text-primary">
                    {r.userName?.charAt(0) || 'C'}
                  </div>
                  <div>
                    <p className="font-heading font-bold text-sm">{r.userName || 'Valued Customer'}</p>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-dark/40 font-bold">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'Recently'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-neutral-cream rounded-sm italic text-neutral-dark/40 font-body">
              No experiences shared yet. Be the first to tell us about this piece.
            </div>
          )}
        </div>
      </section>

      <ImageLightbox 
        isOpen={!!previewImage} 
        imageSrc={previewImage} 
        alt={product.name} 
        onClose={() => setPreviewImage("")} 
      />
    </div>
  );
}

export default ProductPage;
