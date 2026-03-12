import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiUrl, mediaUrl } from "../config/api";
import StarRating from "../components/StarRating";

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
        return <p className="p-8 text-slate-600">Loading product...</p>;
    }

    if (error) {
        return (
            <div className="space-y-4 p-8">
                <p className="rounded-xl bg-rose-50 px-4 py-3 text-rose-600">{error}</p>
                <button
                    type="button"
                    onClick={() => navigate("/")}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
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
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
                ← Back to products
            </button>

            <div className="grid gap-8 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1.1fr_1fr] lg:p-8">
                <div className="space-y-4">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        <img
                            src={imageUrl}
                            alt={product.name}
                            className="h-72 w-full object-cover sm:h-108"
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
                                        className={`overflow-hidden rounded-xl border ${active ? "border-indigo-500 ring-2 ring-indigo-200" : "border-slate-200"}`}
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
                        <span className="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                            {product.section || product.category || "General"}
                        </span>
                        {product.category && product.category !== product.section ? (
                            <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                                {product.category}
                            </span>
                        ) : null}
                    </div>

                    <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{product.name}</h1>
                    <StarRating value={displayedAverage} count={displayedCount} size="md" />
                    <p className="text-3xl font-extrabold text-slate-900">₹{Number(product.price || 0).toFixed(2)}</p>
                    <p className="text-slate-600">{product.description || "No description available."}</p>
                    <p className="text-sm text-slate-500">Stock: {product.stock ?? 0}</p>
                    {product.warranty ? <p className="text-sm text-slate-500">Warranty: {product.warranty}</p> : null}

                    <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                        <button
                            type="button"
                            onClick={handleAddToCart}
                            className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-amber-400"
                        >
                            Add to Cart
                        </button>
                        <button
                            type="button"
                            onClick={handleBuyNow}
                            className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600"
                        >
                            Buy Now
                        </button>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <h2 className="text-sm font-semibold text-slate-900">Customer Rating</h2>
                        <StarRating value={displayedAverage} count={displayedCount} size="md" className="mt-2" />

                        {ratingError ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{ratingError}</p> : null}
                        {ratingMessage ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{ratingMessage}</p> : null}

                        {isLoggedIn ? (
                            ratingInfo.canRate ? (
                                <div className="mt-3 space-y-3">
                                    <p className="text-xs text-slate-600">
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
                                        className="min-h-20 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                                    />

                                    <button
                                        type="button"
                                        onClick={submitRating}
                                        disabled={ratingSubmitting}
                                        className="rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {ratingSubmitting ? "Submitting..." : "Submit Rating"}
                                    </button>
                                </div>
                            ) : (
                                <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-slate-600">
                                    You can rate this product only after purchasing it.
                                </p>
                            )
                        ) : (
                            <button
                                type="button"
                                onClick={() => redirectToLogin(`/product/${id}`)}
                                className="mt-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                            >
                                Login to rate this product
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Recent Ratings</h2>

                {visibleRatings.length ? (
                    <div className="mt-4 space-y-3">
                        {visibleRatings.map((rating, index) => (
                            <div key={`${rating?.userEmail || "user"}-${index}`} className="rounded-xl border border-slate-200 p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        {maskEmail(rating?.userEmail)}
                                    </p>
                                    <StarRating value={Number(rating?.rating || 0)} showValue={false} size="sm" />
                                </div>
                                {rating?.comment ? <p className="mt-2 text-sm text-slate-700">{rating.comment}</p> : null}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="mt-3 text-sm text-slate-600">No ratings yet.</p>
                )}
            </div>
        </section>
    );
}

export default ProductPage;