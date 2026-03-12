import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiUrl, mediaUrl } from "../config/api";
import StarRating from "../components/StarRating";
import ReviewForm from "../components/ReviewForm";

function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
    const email = localStorage.getItem("email") || "";
    const isLoggedIn = Boolean(email);

    const [product, setProduct] = useState(null);
    const [selectedImage, setSelectedImage] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [ratingInfo, setRatingInfo] = useState({
        canRate: false,
        hasRated: false,
        currentRating: null,
        ratingAverage: 0,
        ratingCount: 0,
    });
    const [ratingInput, setRatingInput] = useState(0);
    const [ratingComment, setRatingComment] = useState("");
    const [ratingSubmitting, setRatingSubmitting] = useState(false);
    const [ratingMessage, setRatingMessage] = useState("");
    const [ratingError, setRatingError] = useState("");

    const uniqueImages = (images = []) => Array.from(new Set(images.filter(Boolean)));

    const getProductImages = (item = {}) => {
        return uniqueImages([item?.image || "", ...(item?.images || [])]);
    };

    const maskEmail = (value = "") => {
        const [name = "", domain = ""] = String(value).split("@");

        if (!name || !domain) {
            return "Verified buyer";
        }

        const visible = name.slice(0, 2);
        return `${visible}${"*".repeat(Math.max(2, name.length - 2))}@${domain}`;
    };

  useEffect(() => {
        const getProduct = async () => {
            try {
                setLoading(true);
                const response = await fetch(apiUrl(`/products/${id}`));
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data?.message || "Product not found");
                }

                const productImages = getProductImages(data);

                setProduct(data);
                setSelectedImage(productImages[0] || "");
                setRatingInfo((prev) => ({
                    ...prev,
                    ratingAverage: Number(data?.ratingAverage || 0),
                    ratingCount: Number(data?.ratingCount || 0),
                }));
                setError("");
            } catch (fetchError) {
                setError(fetchError.message || "Product not found");
            } finally {
                setLoading(false);
            }
        };

        getProduct();
  }, [id]);

    useEffect(() => {
        if (!id || !email) {
            return;
        }

        const loadCanRate = async () => {
            try {
                const response = await fetch(
                    apiUrl(`/products/${id}/can-rate?email=${encodeURIComponent(email)}`)
                );
                const data = await response.json();

                if (!response.ok) {
                    return;
                }

                setRatingInfo({
                    canRate: Boolean(data?.canRate),
                    hasRated: Boolean(data?.hasRated),
                    currentRating: data?.currentRating || null,
                    ratingAverage: Number(data?.ratingAverage || 0),
                    ratingCount: Number(data?.ratingCount || 0),
                });

                if (data?.currentRating?.rating) {
                    setRatingInput(Number(data.currentRating.rating));
                    setRatingComment(String(data?.currentRating?.comment || ""));
                }
            } catch {
                setRatingInfo((prev) => ({
                    ...prev,
                    canRate: false,
                }));
            }
        };

        loadCanRate();
    }, [email, id]);

    const redirectToLogin = (redirectTo) => {
        navigate("/login", {
            state: {
                message: "Please login first to continue",
                redirectTo,
            },
        });
    };

    const handleAddToCart = () => {
        if (!product) {
            return;
        }

        if (!isLoggedIn) {
            redirectToLogin(`/product/${id}`);
            return;
        }

        const existingCart = JSON.parse(localStorage.getItem("cartItems") || "[]");
        const existingItem = existingCart.find((item) => item._id === product._id);

        const productImages = getProductImages(product);
        const safeProduct = {
            ...product,
            image: product.image || productImages[0] || "",
            images: productImages,
        };

        const nextCart = existingItem
            ? existingCart.map((item) =>
                item._id === product._id
                    ? {
                        ...item,
                        quantity: Number(item.quantity || 1) + 1,
                    }
                    : item
            )
            : [...existingCart, { ...safeProduct, quantity: 1 }];

        localStorage.setItem("cartItems", JSON.stringify(nextCart));
        navigate("/cart");
    };

    const handleBuyNow = () => {
        if (!product) {
            return;
        }

        if (!isLoggedIn) {
            redirectToLogin(`/checkout/${id}?mode=buy-now`);
            return;
        }

        navigate(`/checkout/${id}?mode=buy-now`);
    };

    const submitRating = async () => {
        if (!isLoggedIn) {
            redirectToLogin(`/product/${id}`);
            return;
        }

        if (!ratingInfo.canRate) {
            setRatingError("You can rate this product only after purchasing it.");
            return;
        }

        if (!ratingInput || ratingInput < 1 || ratingInput > 5) {
            setRatingError("Please select a rating between 1 and 5");
            return;
        }

        try {
            setRatingSubmitting(true);
            setRatingError("");
            setRatingMessage("");

            const response = await fetch(apiUrl(`/products/${id}/rate`), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    rating: ratingInput,
                    comment: ratingComment.trim(),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.message || "Failed to submit rating");
            }

            if (data?.product) {
                const updatedProduct = data.product;
                setProduct(updatedProduct);
                const productImages = getProductImages(updatedProduct);

                if (!selectedImage && productImages.length) {
                    setSelectedImage(productImages[0]);
                }

                setRatingInfo((prev) => ({
                    ...prev,
                    canRate: true,
                    hasRated: true,
                    currentRating: {
                        rating: ratingInput,
                        comment: ratingComment.trim(),
                    },
                    ratingAverage: Number(updatedProduct?.ratingAverage || prev.ratingAverage || 0),
                    ratingCount: Number(updatedProduct?.ratingCount || prev.ratingCount || 0),
                }));
            }

            setRatingMessage(data?.message || "Rating submitted successfully");
        } catch (submitError) {
            setRatingError(submitError.message || "Failed to submit rating");
        } finally {
            setRatingSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div style={{ width: 40, height: 40, border: "3px solid rgba(0,212,255,0.2)", borderTopColor: "#00d4ff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-4 p-8">
                <p className="rounded-xl bg-rose-900/40 border border-rose-500/30 px-4 py-3 text-rose-400">{error}</p>
                <button
                    type="button"
                    onClick={() => navigate("/")}
                    className="btn-ghost rounded-lg px-4 py-2 text-sm"
                >
                    Back to Home
                </button>
            </div>
        );
    }

    if (!product) {
        return null;
    }

    const productImages = getProductImages(product);
    const imageUrl = selectedImage
        ? mediaUrl(selectedImage)
        : productImages[0]
            ? mediaUrl(productImages[0])
            : "https://placehold.co/700x500?text=No+Image";

    const visibleRatings = Array.isArray(product?.ratings) ? product.ratings.slice(0, 6) : [];

    const displayedAverage = Number(product?.ratingAverage || ratingInfo.ratingAverage || 0);
    const displayedCount = Number(product?.ratingCount || ratingInfo.ratingCount || 0);

    return (
        <section className="space-y-6">
            <button
                type="button"
                onClick={() => navigate("/")}
                className="btn-ghost rounded-lg px-4 py-2 text-sm"
            >
                ← Back to products
            </button>

            <div className="glass rounded-3xl p-5 lg:p-8 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
                <div className="space-y-4">
                    <div className="overflow-hidden rounded-2xl" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(0,212,255,0.12)" }}>
                        <img
                            src={imageUrl}
                            alt={product.name}
                            className="h-72 w-full object-cover sm:h-108"
                            onError={e => { e.currentTarget.src = "https://placehold.co/700x500?text=No+Image"; }}
                        />
                    </div>

                    {productImages.length > 1 ? (
                        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
                            {productImages.map((imagePath, index) => {
                                const active = imagePath === selectedImage || (!selectedImage && index === 0);

                                return (
                                    <button
                                        key={`${imagePath}-${index}`}
                                        type="button"
                                        onClick={() => setSelectedImage(imagePath)}
                                        className={`overflow-hidden rounded-xl border transition ${active ? "border-cyan-400 ring-2 ring-cyan-400/30" : "border-slate-700 hover:border-cyan-500/50"}`}
                                    >
                                        <img
                                            src={mediaUrl(imagePath)}
                                            alt={`${product.name} view ${index + 1}`}
                                            className="h-16 w-full object-cover"
                                        />
                                    </button>
                                );
                            })}
                                </div>
                    ) : null}
                            </div>

                <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide" style={{ background: "rgba(0,212,255,0.15)", color: "#00d4ff", border: "1px solid rgba(0,212,255,0.3)" }}>
                            {product.section || product.category || "General"}
                        </span>
                        {product.category && product.category !== product.section ? (
                            <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide" style={{ background: "rgba(168,85,247,0.15)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.3)" }}>
                                {product.category}
                            </span>
                        ) : null}
                    </div>

                    <h1 className="text-2xl font-bold text-white sm:text-3xl">{product.name}</h1>
                    <StarRating value={displayedAverage} count={displayedCount} size="md" />
                    <p className="text-3xl font-extrabold" style={{ background: "linear-gradient(135deg,#00d4ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>₹{Number(product.price || 0).toFixed(2)}</p>
                    <p className="text-slate-300">{product.description || "No description available."}</p>
                    <p className="text-sm text-slate-400">Stock: {product.stock ?? 0}</p>
                    {product.warranty ? <p className="text-sm text-slate-400">Warranty: {product.warranty}</p> : null}

                    <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                        <button
                            type="button"
                            onClick={handleAddToCart}
                            className="btn-ghost flex-1 rounded-xl py-3 text-sm"
                        >
                            Add to Cart
                        </button>
                        <button
                            type="button"
                            onClick={handleBuyNow}
                            className="btn-neon flex-1 rounded-xl py-3 text-sm"
                        >
                            Buy Now
                        </button>
                    </div>

                    <div className="rounded-2xl p-4" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(0,212,255,0.1)" }}>
                        <h2 className="text-sm font-semibold text-white">Customer Rating</h2>
                        <StarRating value={displayedAverage} count={displayedCount} size="md" className="mt-2" />

                        {ratingError ? <p className="mt-3 rounded-lg bg-rose-900/40 border border-rose-500/30 px-3 py-2 text-sm text-rose-400">{ratingError}</p> : null}
                        {ratingMessage ? <p className="mt-3 rounded-lg bg-cyan-900/40 border border-cyan-500/30 px-3 py-2 text-sm text-cyan-400">{ratingMessage}</p> : null}

                        {isLoggedIn ? (
                            ratingInfo.canRate ? (
                                <div className="mt-3 space-y-3">
                                    <p className="text-xs text-slate-400">
                                        {ratingInfo.hasRated
                                            ? "You have already rated this product. You can update your rating."
                                            : "You purchased this product. Add your rating."}
                                    </p>

                                    <StarRating
                                        value={ratingInput}
                                        interactive
                                        onChange={(value) => setRatingInput(value)}
                                        showValue={false}
                                        size="lg"
                                    />

                                    <textarea
                                        value={ratingComment}
                                        onChange={(event) => setRatingComment(event.target.value)}
                                        placeholder="Write your review (optional)"
                                        className="input-dark min-h-20 w-full"
                                    />

                                    <button
                                        type="button"
                                        onClick={submitRating}
                                        disabled={ratingSubmitting}
                                        className="btn-neon rounded-xl px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {ratingSubmitting ? "Submitting..." : "Submit Rating"}
                                    </button>
                                </div>
                            ) : (
                                <p className="mt-3 rounded-lg px-3 py-2 text-xs text-slate-400" style={{ background: "rgba(0,0,0,0.3)" }}>
                                    You can rate this product only after purchasing it.
                                </p>
                            )
                        ) : (
                            <button
                                type="button"
                                onClick={() => redirectToLogin(`/product/${id}`)}
                                className="mt-3 btn-ghost rounded-lg px-3 py-2 text-xs"
                            >
                                Login to rate this product
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="glass rounded-2xl p-5">
                <h2 className="text-lg font-semibold text-white">Customer Reviews & Ratings</h2>

                {/* Review Form - Only for users who purchased */}
                {isLoggedIn && ratingInfo.canRate && (
                    <div className="mt-4">
                        <ReviewForm productId={id} email={email} onReviewSubmitted={() => {}} />
                    </div>
                )}

                <h3 className="mt-6 text-base font-semibold text-slate-200">Recent Ratings</h3>

                {visibleRatings.length ? (
                    <div className="mt-4 space-y-3">
                        {visibleRatings.map((rating, index) => (
                            <div key={`${rating?.userEmail || "user"}-${index}`} className="rounded-xl p-4 transition" style={{ background: "rgba(255,255,255,0.09)", border: "1px solid rgba(0,212,255,0.16)" }}>
                                <div className="flex items-center justify-between gap-3 mb-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-cyan-400">
                                        ✓ {maskEmail(rating?.userEmail)}
                                    </p>
                                    <StarRating value={Number(rating?.rating || 0)} showValue={false} size="sm" />
                                </div>
                                {rating?.comment ? (
                                    <p className="mt-2 text-sm text-slate-300 leading-relaxed">{rating.comment}</p>
                                ) : null}
                                {rating?.reviewImages && rating.reviewImages.length > 0 ? (
                                    <div className="mt-3 flex gap-2 flex-wrap">
                                        {rating.reviewImages.slice(0, 4).map((imagePath, i) => (
                                            <img
                                                key={`${imagePath}-${i}`}
                                                src={mediaUrl(imagePath)}
                                                alt={`Review ${i + 1}`}
                                                className="h-16 w-16 rounded-lg object-cover cursor-pointer"
                                                style={{ border: "1px solid rgba(0,212,255,0.2)" }}
                                                onError={e => { e.currentTarget.src = "https://placehold.co/64x64?text=Img"; }}
                                            />
                                        ))}
                                        {rating.reviewImages.length > 4 && (
                                            <div className="h-16 w-16 rounded-lg flex items-center justify-center text-xs font-semibold text-slate-400" style={{ background: "rgba(255,255,255,0.06)" }}>
                                                +{rating.reviewImages.length - 4}
                                            </div>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="mt-3 text-sm text-slate-400">No ratings yet. Be the first to review this product!</p>
                )}
            </div>
        </section>
    );
}

export default ProductPage;