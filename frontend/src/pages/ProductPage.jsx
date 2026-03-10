import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

  useEffect(() => {
        const getProduct = async () => {
            try {
                setLoading(true);
                const response = await fetch(`http://localhost:5000/api/products/${id}`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data?.message || "Product not found");
                }

                setProduct(data);
                setError("");
            } catch (fetchError) {
                setError(fetchError.message || "Product not found");
            } finally {
                setLoading(false);
            }
        };

        getProduct();
  }, [id]);

    const handleAddToCart = () => {
        if (!product) {
            return;
        }

        const existingCart = JSON.parse(localStorage.getItem("cartItems") || "[]");
        const existingProduct = existingCart.find((item) => item._id === product._id);

        let nextCart;

        if (existingProduct) {
            nextCart = existingCart.map((item) =>
                item._id === product._id ? { ...item, quantity: (item.quantity || 1) + 1 } : item
            );
        } else {
            nextCart = [...existingCart, { ...product, quantity: 1 }];
        }

        localStorage.setItem("cartItems", JSON.stringify(nextCart));
        navigate("/cart");
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

    const imageUrl = product.image
        ? `http://localhost:5000${product.image.startsWith("/") ? product.image : `/${product.image}`}`
        : "https://placehold.co/700x500?text=No+Image";

    return (
        <section className="space-y-6">
            <button
                type="button"
                onClick={() => navigate("/")}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
                ← Back to products
            </button>

            <div className="grid gap-8 overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-2 lg:p-8">
                <img
                    src={imageUrl}
                    alt={product.name}
                    className="h-80 w-full rounded-2xl object-cover sm:h-105"
                />

                <div className="space-y-4">
                    <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                        {product.category}
                    </span>
                    <h1 className="text-3xl font-bold text-slate-900">{product.name}</h1>
                    <p className="text-3xl font-extrabold text-slate-900">₹{product.price}</p>
                    <p className="text-slate-600">{product.description || "No description available."}</p>
                    <p className="text-sm text-slate-500">Stock: {product.stock ?? 0}</p>
                    {product.warranty ? <p className="text-sm text-slate-500">Warranty: {product.warranty}</p> : null}

                    <button
                        type="button"
                        onClick={handleAddToCart}
                        className="mt-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-amber-400"
                    >
                        Add to Cart
                    </button>
                </div>
            </div>
        </section>
    );

}

export default ProductPage;