import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { mediaUrl } from "../config/api";

function Cart() {
	const navigate = useNavigate();
	const location = useLocation();
	const email = localStorage.getItem("email");
	const [items, setItems] = useState(() => JSON.parse(localStorage.getItem("cartItems") || "[]"));

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
			<div className="rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-6 sm:p-8">
				<h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">🛒 Shopping Cart</h1>
				<p className="mt-2 text-sm text-slate-700">Review items and proceed to checkout</p>
				<button
					type="button"
					onClick={() => navigate("/")}
					className="mt-4 rounded-lg border border-amber-300 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white transition"
				>
					← Continue Shopping
				</button>
			</div>

			{!items.length ? (
				<div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
					<p className="text-lg font-semibold text-slate-900">Your cart is empty</p>
					<p className="mt-2 text-slate-600">Start shopping to add items!</p>
					<button
						type="button"
						onClick={() => navigate("/")}
						className="mt-4 rounded-lg bg-indigo-700 px-6 py-2 font-medium text-white hover:bg-indigo-600 transition"
					>
						Browse Products
					</button>
				</div>
			) : (
				<div className="grid gap-6 lg:grid-cols-3">
					<div className="space-y-4 lg:col-span-2">
						{items.map((item) => {
							const imageUrl = item.image || item.images?.[0]
								? mediaUrl(item.image || item.images?.[0] || "")
								: "https://placehold.co/200x150?text=No+Image";

							return (
								<div
									key={item._id}
									className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md transition"
								>
									<div className="flex gap-4">
										<img src={imageUrl} alt={item.name} className="h-24 w-28 rounded-lg object-cover shadow-sm" />
										<div className="flex-1">
											<h2 className="font-semibold text-slate-900">{item.name}</h2>
											<p className="text-sm text-slate-600">₹{Number(item.price || 0).toFixed(2)} × {item.quantity} = <strong>₹{(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}</strong></p>
											
											<div className="mt-3 flex items-center gap-2">
												<button
													type="button"
													onClick={() => changeQuantity(item._id, Number(item.quantity || 1) - 1)}
													className="h-8 w-8 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium"
												>
													−
												</button>
												<span className="w-8 text-center text-sm font-semibold">{item.quantity || 1}</span>
												<button
													type="button"
													onClick={() => changeQuantity(item._id, Number(item.quantity || 1) + 1)}
													className="h-8 w-8 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium"
												>
													+
												</button>
												<button
													type="button"
													onClick={() => removeItem(item._id)}
													className="ml-auto text-xs text-rose-600 hover:text-rose-700 font-medium"
												>
													Remove
												</button>
											</div>
										</div>
									</div>
								</div>
							);
						})}
					</div>

					<div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-6 h-fit sticky top-24">
						<h2 className="text-lg font-semibold text-slate-900 mb-4">Order Summary</h2>
						<div className="space-y-2 text-sm">
							<div className="flex justify-between text-slate-600">
								<span>Subtotal</span>
								<span>₹{total.toFixed(2)}</span>
							</div>
							<div className="flex justify-between text-slate-600">
								<span>Tax (8%)</span>
								<span>₹{tax.toFixed(2)}</span>
							</div>
							<div className="flex justify-between text-slate-600">
								<span>Shipping</span>
								<span>₹{SHIPPING_CHARGE}</span>
							</div>
							<div className="border-t border-emerald-200 pt-2 flex justify-between text-lg font-bold text-slate-900">
								<span>Total</span>
								<span>₹{grand_total.toFixed(2)}</span>
							</div>
						</div>

						<button
							type="button"
							onClick={checkoutAllItems}
							className="mt-6 w-full rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-3 font-semibold text-white hover:from-emerald-700 hover:to-emerald-800 transition shadow-md"
						>
							🛍️ Checkout ({items.length})
						</button>

						<p className="mt-3 text-xs text-slate-600 text-center">
							💡 Free shipping on orders over ₹500
						</p>
					</div>
				</div>
			)}
		</section>
	);
}

export default Cart;
