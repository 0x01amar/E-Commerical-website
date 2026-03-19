import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetchJson, mediaUrl, resolveApiErrorMessage } from "../config/api";
import StarRating from "../components/StarRating";
import ReviewForm from "../components/ReviewForm";
import ImageLightbox from "../components/ImageLightbox";
import { showToast } from "../config/toast";

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
                    const { response, data } = await apiFetchJson(`/products/${id}`);

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
                setError(resolveApiErrorMessage(fetchError, "Product not found"));
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
                const { response, data } = await apiFetchJson(`/products/${id}/can-rate?email=${encodeURIComponent(email)}`);

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
        showToast("Added to cart", "success");
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
            setRatingError("You can rate this product only after delivery.");
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

            const { response, data } = await apiFetchJson(`/products/${id}/rate`, {
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
            setRatingError(resolveApiErrorMessage(submitError, "Failed to submit rating"));
        } finally {
            setRatingSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div style={{ width: 40, height: 40, border: "3px solid rgba(2,132,199,0.18)", borderTopColor: "#0284c7", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-4 p-8">
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-600">{error}</p>
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
            : "https://placehold.co/700x500/dce8f5/0284c7?text=No+Image";

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
                    <div className="overflow-hidden rounded-2xl" style={{ background: "rgba(240,248,255,0.80)", border: "1px solid rgba(100,160,220,0.22)" }}>
                        <img
                            src={imageUrl}
                            alt={product.name}
                            className="h-72 w-full cursor-zoom-in object-cover sm:h-108"
                            onClick={() => setPreviewImage(imageUrl)}
                            onError={e => { e.currentTarget.src = "https://placehold.co/700x500/dce8f5/0284c7?text=No+Image"; }}
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
                                        className={`overflow-hidden rounded-xl border transition ${active ? "border-sky-500 ring-2 ring-sky-500/25" : "border-slate-300 hover:border-sky-400/60"}`}
                                    >
                                        <img
                                            src={mediaUrl(imagePath)}
                                            alt={`${product.name} view ${index + 1}`}
                                            className="h-16 w-full object-cover"
                                            onError={e => { e.currentTarget.src = "https://placehold.co/160x120/dce8f5/0284c7?text=Image"; }}
                                        />
                                    </button>
                                );
                            })}
                                </div>
                    ) : null}
                            </div>

                <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide" style={{ background: "rgba(2,132,199,0.10)", color: "#0284c7", border: "1px solid rgba(2,132,199,0.25)" }}>
                            {product.section || product.category || "General"}
                        </span>
                        {product.category && product.category !== product.section ? (
                            <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide" style={{ background: "rgba(124,58,237,0.10)", color: "#7c3aed", border: "1px solid rgba(124,58,237,0.22)" }}>
                                {product.category}
                            </span>
                        ) : null}
                    </div>

                    <h1 className="text-2xl font-bold sm:text-3xl" style={{ color: "#1a2f48" }}>{product.name}</h1>
                    <StarRating value={displayedAverage} count={displayedCount} size="md" />
                    <p className="text-3xl font-extrabold" style={{ background: "linear-gradient(135deg,#0284c7,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>₹{Number(product.price || 0).toFixed(2)}</p>
                    <p style={{ color: "#3a5470" }}>{product.description || "No description available."}</p>
                    <p className="text-sm" style={{ color: "#6080a0" }}>Stock: {product.stock ?? 0}</p>
                    {product.warranty ? <p className="text-sm" style={{ color: "#6080a0" }}>Warranty: {product.warranty}</p> : null}

                    <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                        <button
                            type="button"
                            onClick={handleAddToCart}
                            className="btn-amazon-cart flex-1"
                        >
                            Add to Cart
                        </button>
                        <button
                            type="button"
                            onClick={handleBuyNow}
                            className="btn-amazon-buy flex-1"
                        >
                            Buy Now
                        </button>
                    </div>

                    <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.78)", border: "1px solid rgba(100,160,220,0.20)" }}>
                        <h2 className="text-sm font-semibold" style={{ color: "#1a2f48" }}>Customer Rating</h2>
                        <StarRating value={displayedAverage} count={displayedCount} size="md" className="mt-2" />

                        {ratingError ? <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{ratingError}</p> : null}
                        {ratingMessage ? <p className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">{ratingMessage}</p> : null}

                        {isLoggedIn ? (
                            ratingInfo.canRate ? (
                                <div className="mt-3 space-y-3">
                                    <p className="text-xs" style={{ color: "#6080a0" }}>
                                        {ratingInfo.hasRated
                                            ? "You have already rated this product. You can update your rating."
                                            : "Your order for this product was delivered. Add your rating."}
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
                                <p className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ background: "rgba(240,248,255,0.78)", color: "#6080a0" }}>
                                    You can rate this product only after delivery.
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
                <h2 className="text-lg font-semibold" style={{ color: "#1a2f48" }}>Customer Reviews & Ratings</h2>

                {/* Review Form - Only for users with delivered orders */}
                {isLoggedIn && ratingInfo.canRate && (
                    <div className="mt-4">
                        <ReviewForm productId={id} email={email} onReviewSubmitted={() => {}} />
                    </div>
                )}

                <h3 className="mt-6 text-base font-semibold" style={{ color: "#1a2f48" }}>Recent Ratings</h3>

                {visibleRatings.length ? (
                    <div className="mt-4 space-y-3">
                        {visibleRatings.map((rating, index) => (
                            <div key={`${rating?.userEmail || "user"}-${index}`} className="rounded-xl p-4 transition" style={{ background: "rgba(255,255,255,0.78)", border: "1px solid rgba(100,160,220,0.22)" }}>
                                <div className="flex items-center justify-between gap-3 mb-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                                        ✓ {maskEmail(rating?.userEmail)}
                                    </p>
                                    <StarRating value={Number(rating?.rating || 0)} showValue={false} size="sm" />
                                </div>
                                {rating?.comment ? (
                                    <p className="mt-2 text-sm leading-relaxed" style={{ color: "#3a5470" }}>{rating.comment}</p>
                                ) : null}
                                {rating?.reviewImages && rating.reviewImages.length > 0 ? (
                                    <div className="mt-3 flex gap-2 flex-wrap">
                                        {rating.reviewImages.slice(0, 4).map((imagePath, i) => (
                                            <img
                                                key={`${imagePath}-${i}`}
                                                src={mediaUrl(imagePath)}
                                                alt={`Review ${i + 1}`}
                                                className="h-16 w-16 rounded-lg object-cover cursor-pointer"
                                                style={{ border: "1px solid rgba(100,160,220,0.22)" }}
                                                onClick={() => setPreviewImage(mediaUrl(imagePath))}
                                                onError={e => { e.currentTarget.src = "https://placehold.co/64x64?text=Img"; }}
                                            />
                                        ))}
                                        {rating.reviewImages.length > 4 && (
                                            <div className="h-16 w-16 rounded-lg flex items-center justify-center text-xs font-semibold" style={{ background: "rgba(255,255,255,0.72)", color: "#6080a0" }}>
                                                +{rating.reviewImages.length - 4}
                                            </div>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="mt-3 text-sm" style={{ color: "#6080a0" }}>No ratings yet. Be the first to review this product!</p>
                )}
            </div>

            <ImageLightbox
                isOpen={Boolean(previewImage)}
                imageSrc={previewImage}
                alt={product?.name || "Product image"}
                onClose={() => setPreviewImage("")}
            />
        </section>
    );
}

export default ProductPage;