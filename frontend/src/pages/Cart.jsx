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

	return (
		<section className="space-y-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Your Cart</h1>
				<button
					type="button"
					onClick={() => navigate("/")}
					className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
				>
					Continue Shopping
				</button>
			</div>

			{!items.length ? (
				<div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
					<p className="text-slate-600">Your cart is empty.</p>
				</div>
			) : (
				<>
					<div className="space-y-4">
						{items.map((item) => {
							const imageUrl = item.image || item.images?.[0]
								? mediaUrl(item.image || item.images?.[0] || "")
								: "https://placehold.co/200x150?text=No+Image";

							return (
								<div
									key={item._id}
									className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center"
								>
									<img src={imageUrl} alt={item.name} className="h-24 w-32 rounded-lg object-cover" />
									<div className="flex-1">
										<h2 className="text-lg font-semibold text-slate-900">{item.name}</h2>
										<p className="text-sm text-slate-500">₹{item.price} each</p>
										<p className="mt-1 text-sm font-semibold text-slate-700">
											Item total: ₹{(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}
										</p>
									</div>

									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={() => changeQuantity(item._id, Number(item.quantity || 1) - 1)}
											className="h-8 w-8 rounded-md border border-slate-300 text-slate-700"
										>
											-
										</button>
										<span className="w-8 text-center text-sm font-semibold">{item.quantity || 1}</span>
										<button
											type="button"
											onClick={() => changeQuantity(item._id, Number(item.quantity || 1) + 1)}
											className="h-8 w-8 rounded-md border border-slate-300 text-slate-700"
										>
											+
										</button>
									</div>

									<button
										type="button"
										onClick={() => removeItem(item._id)}
										className="rounded-lg bg-rose-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-600"
									>
										Remove
									</button>

									<button
										type="button"
										onClick={() => checkoutItem(item._id)}
										className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
									>
										Checkout
									</button>
								</div>
							);
						})}
					</div>

					<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
						<div className="flex items-center justify-between">
							<p className="text-slate-600">Total</p>
							<p className="text-2xl font-bold text-slate-900">₹{total.toFixed(2)}</p>
						</div>
						<button
							type="button"
							onClick={() => persist([])}
							className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
						>
							Clear Cart
						</button>
					</div>
				</>
			)}
		</section>
	);
}

export default Cart;
