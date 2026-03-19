import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { mediaUrl } from "../config/api";
import ImageLightbox from "../components/ImageLightbox";

function Cart() {
	const navigate = useNavigate();
	const location = useLocation();
	const email = localStorage.getItem("email");
	const [items, setItems] = useState(() => JSON.parse(localStorage.getItem("cartItems") || "[]"));
	const [previewImage, setPreviewImage] = useState("");

	useEffect(() => {
		if (email) {
			return;
		}

		navigate("/login", {
			replace: true,
			state: {
				message: "Please login first to view cart",
				redirectTo: location.pathname,
			},
		});
	}, [email, location.pathname, navigate]);

	const persist = (nextItems) => {
		setItems(nextItems);
		localStorage.setItem("cartItems", JSON.stringify(nextItems));
	};

	const checkoutAllItems = async () => {
		if (items.length === 0) {
			return;
		}
		// For now, implement bulk checkout by iterating through items
		// This can be enhanced to support bulk order placement
		if (items.length === 1) {
			navigate(`/checkout/${items[0]._id}?mode=cart`);
		} else {
			// Redirect to first item checkout for now
			navigate(`/checkout/${items[0]._id}?mode=cart`);
		}
	};

	const checkoutItem = (itemId) => {
		navigate(`/checkout/${itemId}?mode=cart`);
	};

	const removeItem = (id) => {
		persist(items.filter((item) => item._id !== id));
	};

	const changeQuantity = (id, nextQuantity) => {
		if (nextQuantity < 1) {
			removeItem(id);
			return;
		}

		const nextItems = items.map((item) =>
			item._id === id ? { ...item, quantity: nextQuantity } : item
		);

		persist(nextItems);
	};

	const total = useMemo(() => {
		return items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
	}, [items]);

	const TAX_RATE = 0.08;
	const SHIPPING_CHARGE = 79;
	const tax = total * TAX_RATE;
	const grand_total = total + tax + SHIPPING_CHARGE;

	return (
		<section className="space-y-6">
			{/* Hero */}
			<div className="hero-dark rounded-3xl p-6 sm:p-8">
				<h1 className="text-2xl font-bold sm:text-3xl" style={{ color: "#1a2f48" }}>🛒 Shopping Cart</h1>
				<p className="mt-1 text-sm" style={{ color: "#3a5470" }}>Review items and proceed to checkout</p>
				<button
					type="button"
					onClick={() => navigate("/")}
					className="mt-4 btn-ghost text-sm"
				>
					← Continue Shopping
				</button>
			</div>

			{!items.length ? (
				<div className="glass rounded-2xl p-12 text-center">
					<p className="text-lg font-semibold" style={{ color: "#1a2f48" }}>Your cart is empty</p>
					<p className="mt-2 text-sm" style={{ color: "#3a5470" }}>Start shopping to add items!</p>
					<button
						type="button"
						onClick={() => navigate("/")}
						className="mt-4 btn-neon"
					>
						Browse Products
					</button>
				</div>
			) : (
				<div className="grid gap-6 lg:grid-cols-3">
					{/* Cart Items */}
					<div className="space-y-4 lg:col-span-2">
						{items.map((item) => {
							const imageUrl = item.image || item.images?.[0]
								? mediaUrl(item.image || item.images?.[0] || "")
								: "https://placehold.co/200x150/dce8f5/0284c7?text=No+Image";

							return (
								<div
									key={item._id}
									className="glass glass-hover rounded-xl p-4"
								>
									<div className="flex gap-4">
										<img
											src={imageUrl}
											alt={item.name}
											className="h-24 w-28 cursor-zoom-in rounded-lg object-cover shrink-0"
											onClick={() => setPreviewImage(imageUrl)}
											style={{ border: "1px solid rgba(2,132,199,0.18)" }}
											onError={(e) => { e.target.src = "https://placehold.co/200x150/dce8f5/0284c7?text=No+Image"; }}
										/>
										<div className="flex-1 min-w-0">
											<h2 className="font-semibold" style={{ color: "#1a2f48" }}>{item.name}</h2>
											<p className="mt-1 text-sm" style={{ color: "#3a5470" }}>
												₹{Number(item.price || 0).toFixed(2)} × {item.quantity} = {" "}
												<strong style={{ color: "#0284c7" }}>₹{(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}</strong>
											</p>

											<div className="mt-3 flex items-center gap-2">
												<button
													type="button"
													onClick={() => changeQuantity(item._id, Number(item.quantity || 1) - 1)}
													className="h-8 w-8 rounded-lg font-medium transition-all duration-200 hover:scale-110"
													style={{ background: "rgba(255,255,255,0.85)", border: "1px solid rgba(100,160,220,0.28)", color: "#2d5a8e" }}
													onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(2,132,199,0.38)"; e.currentTarget.style.color = "#0284c7"; }}
													onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(100,160,220,0.28)"; e.currentTarget.style.color = "#2d5a8e"; }}
												>
													−
												</button>
												<span className="w-8 text-center text-sm font-bold" style={{ color: "#1a2f48" }}>{item.quantity || 1}</span>
												<button
													type="button"
													onClick={() => changeQuantity(item._id, Number(item.quantity || 1) + 1)}
													className="h-8 w-8 rounded-lg font-medium transition-all duration-200 hover:scale-110"
													style={{ background: "rgba(255,255,255,0.85)", border: "1px solid rgba(100,160,220,0.28)", color: "#2d5a8e" }}
													onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(2,132,199,0.38)"; e.currentTarget.style.color = "#0284c7"; }}
													onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(100,160,220,0.28)"; e.currentTarget.style.color = "#2d5a8e"; }}
												>
													+
												</button>
												<button
													type="button"
													onClick={() => removeItem(item._id)}
													className="ml-auto text-xs font-medium transition-colors"
													style={{ color: "#dc2626" }}
													onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
													onMouseLeave={e => e.currentTarget.style.color = "#dc2626"}
												>
													🗑️ Remove
												</button>
											</div>
										</div>
									</div>
								</div>
							);
						})}
					</div>

					{/* Order Summary */}
					<div
						className="rounded-xl p-6 h-fit sticky top-24"
						style={{
							background: "rgba(240,250,245,0.80)",
							border: "1px solid rgba(13,148,136,0.22)",
							boxShadow: "0 16px 32px rgba(13,148,136,0.08)",
						}}
					>
							<h2 className="text-lg font-semibold mb-4" style={{ color: "#1a2f48" }}>Order Summary</h2>
						<div className="space-y-3 text-sm">
								<div className="flex justify-between" style={{ color: "#3a5470" }}>
								<span>Subtotal</span>
									<span style={{ color: "#3a5470" }}>₹{total.toFixed(2)}</span>
							</div>
								<div className="flex justify-between" style={{ color: "#3a5470" }}>
								<span>Tax (8%)</span>
									<span style={{ color: "#3a5470" }}>₹{tax.toFixed(2)}</span>
							</div>
								<div className="flex justify-between" style={{ color: "#3a5470" }}>
								<span>Shipping</span>
									<span style={{ color: "#3a5470" }}>₹{SHIPPING_CHARGE}</span>
							</div>
							<hr className="neon-divider" />
							<div className="flex justify-between text-lg font-bold">
									<span style={{ color: "#1a2f48" }}>Total</span>
								<span style={{
										background: "linear-gradient(135deg, #0d9488, #0284c7)",
									WebkitBackgroundClip: "text",
									WebkitTextFillColor: "transparent",
								}}>₹{grand_total.toFixed(2)}</span>
							</div>
						</div>

						<button
							type="button"
							onClick={checkoutAllItems}
							className="btn-neon w-full mt-6 py-3"
						>
							🛍️ Checkout ({items.length})
						</button>

							<p className="mt-3 text-xs text-center" style={{ color: "#0284c7" }}>
							✦ Free shipping on orders over ₹500
						</p>
					</div>
				</div>
			)}

			<ImageLightbox
				isOpen={Boolean(previewImage)}
				imageSrc={previewImage}
				alt="Cart product preview"
				onClose={() => setPreviewImage("")}
			/>
		</section>
	);
}

export default Cart;
