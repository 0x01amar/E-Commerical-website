import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { apiUrl, mediaUrl } from "../config/api";

const TAX_RATE = 0.08;
const SHIPPING_CHARGE = 79;

function Checkout() {
  const { productId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const email = localStorage.getItem("email");
  const mode = new URLSearchParams(location.search).get("mode") || "buy-now";

  const [product, setProduct] = useState(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [step, setStep] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [address, setAddress] = useState("");
  const [savedAddress, setSavedAddress] = useState("");
  const [paymentOption, setPaymentOption] = useState("cod");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [cartSynced, setCartSynced] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (email) {
      return;
    }

    navigate("/login", {
      replace: true,
      state: {
        message: "Please login first to continue",
        redirectTo: `${location.pathname}${location.search}`,
      },
    });
  }, [email, location.pathname, location.search, navigate]);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoadingProduct(true);
        setError("");

        const response = await fetch(apiUrl(`/products/${productId}`));
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message || "Failed to load product");
        }

        setProduct(data);
      } catch (loadError) {
        setError(loadError.message || "Failed to load product");
      } finally {
        setLoadingProduct(false);
      }
    };

    loadProduct();
  }, [productId]);

  useEffect(() => {
    if (!email) {
      return;
    }

    const loadSavedAddress = async () => {
      try {
        const response = await fetch(apiUrl(`/auth/profile/${encodeURIComponent(email)}`));
        const data = await response.json();

        if (!response.ok) {
          return;
        }

        const profileAddress = data?.address || "";
        setSavedAddress(profileAddress);

        if (profileAddress) {
          setAddress(profileAddress);
        }
      } catch {
        setSavedAddress("");
      }
    };

    loadSavedAddress();
  }, [email]);

  useEffect(() => {
    if (!product || mode !== "cart" || cartSynced) {
      return;
    }

    const existingCart = JSON.parse(localStorage.getItem("cartItems") || "[]");
    const existingItem = existingCart.find((item) => item._id === product._id);

    let nextQuantity = 1;
    let nextCart;

    if (existingItem) {
      nextQuantity = Number(existingItem.quantity || 1) + 1;
      nextCart = existingCart.map((item) =>
        item._id === product._id ? { ...item, quantity: nextQuantity } : item
      );
    } else {
      nextCart = [...existingCart, { ...product, quantity: 1 }];
    }

    localStorage.setItem("cartItems", JSON.stringify(nextCart));
    setQuantity(nextQuantity);
    setCartSynced(true);
  }, [cartSynced, mode, product]);

  const subtotal = useMemo(() => {
    return Number(product?.price || 0) * quantity;
  }, [product?.price, quantity]);

  const taxAmount = useMemo(() => subtotal * TAX_RATE, [subtotal]);
  const shippingCharge = useMemo(() => (subtotal > 0 ? SHIPPING_CHARGE : 0), [subtotal]);
  const totalPrice = useMemo(() => subtotal + taxAmount + shippingCharge, [shippingCharge, subtotal, taxAmount]);

  const moveToAddressStep = () => {
    if (quantity < 1) {
      setError("Quantity must be at least 1");
      return;
    }

    setError("");
    setStep(2);
  };

  const saveAddressAndNext = async () => {
    const trimmedAddress = address.trim();

    if (!trimmedAddress) {
      setError("Please enter delivery address");
      return;
    }

    if (!email) {
      setError("Please login first");
      return;
    }

    try {
      setSavingAddress(true);
      setError("");

      const response = await fetch(apiUrl(`/auth/profile/${encodeURIComponent(email)}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: trimmedAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to save address");
      }

      setSavedAddress(data?.address || trimmedAddress);
      setAddress(data?.address || trimmedAddress);
      setStep(3);
    } catch (saveError) {
      setError(saveError.message || "Failed to save address");
    } finally {
      setSavingAddress(false);
    }
  };

  const continueToPayment = () => {
    setError("");
    setStep(4);
  };

  const handlePayNow = async () => {
    try {
      setProcessingPayment(true);
      setError("");

      if (paymentOption === "cod") {
        setNotice("Cash on delivery selected. Order flow is ready.");
        return;
      }

      setNotice("Payment gateway is not created yet. This button will redirect to the gateway once integrated.");
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loadingProduct) {
    return <p className="p-6 text-slate-600">Loading checkout...</p>;
  }

  if (!product) {
    return (
      <div className="space-y-4 p-6">
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-rose-600">{error || "Product not found"}</p>
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

  const imageUrl = mediaUrl(product.image) || "https://placehold.co/600x400?text=No+Image";

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5">
      <button
        type="button"
        onClick={() => navigate(`/product/${product._id}`)}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
      >
        ← Back to product
      </button>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap gap-2">
          {["Quantity", "Address", "Summary", "Payment"].map((label, index) => {
            const active = step === index + 1;

            return (
              <span
                key={label}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${active ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                {index + 1}. {label}
              </span>
            );
          })}
        </div>

        {error ? <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p> : null}
        {notice ? <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}

        {step === 1 ? (
          <div className="space-y-5">
            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row">
              <img src={imageUrl} alt={product.name} className="h-36 w-full rounded-xl object-cover sm:h-28 sm:w-36" />
              <div className="flex-1 space-y-1">
                <h2 className="text-lg font-semibold text-slate-900">{product.name}</h2>
                <p className="text-sm text-slate-500">{product.category}</p>
                <p className="text-xl font-bold text-slate-900">₹{Number(product.price || 0).toFixed(2)}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">Choose Quantity</p>
              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-300 p-2">
                <button
                  type="button"
                  onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                  className="h-9 w-9 rounded-lg border border-slate-300 text-lg text-slate-700"
                >
                  -
                </button>
                <span className="w-10 text-center text-base font-semibold text-slate-900">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((prev) => prev + 1)}
                  className="h-9 w-9 rounded-lg border border-slate-300 text-lg text-slate-700"
                >
                  +
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={moveToAddressStep}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              Next
            </button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            {savedAddress ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Saved Address</p>
                <p className="mt-1 text-sm text-slate-700">{savedAddress}</p>
                <button
                  type="button"
                  onClick={() => setAddress(savedAddress)}
                  className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white"
                >
                  Use Saved Address
                </button>
              </div>
            ) : null}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Delivery Address</label>
              <textarea
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Enter full delivery address"
                className="min-h-28 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Back
              </button>
              <button
                type="button"
                onClick={saveAddressAndNext}
                disabled={savingAddress}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingAddress ? "Saving..." : "Save & Next"}
              </button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm text-slate-500">Delivery Address</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{address}</p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between text-sm text-slate-700">
                <span>Price ({quantity} × ₹{Number(product.price || 0).toFixed(2)})</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm text-slate-700">
                <span>Tax ({Math.round(TAX_RATE * 100)}%)</span>
                <span>₹{taxAmount.toFixed(2)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm text-slate-700">
                <span>Shipping</span>
                <span>₹{shippingCharge.toFixed(2)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-900">
                <span>Total</span>
                <span>₹{totalPrice.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Back
              </button>
              <button
                type="button"
                onClick={continueToPayment}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            <div className="space-y-2 rounded-xl border border-slate-200 p-4">
              <label className="flex items-start gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="paymentOption"
                  value="cod"
                  checked={paymentOption === "cod"}
                  onChange={(event) => setPaymentOption(event.target.value)}
                  className="mt-0.5"
                />
                <span>Cash on Delivery</span>
              </label>
              <label className="flex items-start gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="paymentOption"
                  value="half"
                  checked={paymentOption === "half"}
                  onChange={(event) => setPaymentOption(event.target.value)}
                  className="mt-0.5"
                />
                <span>Half payment now and half after delivery</span>
              </label>
            </div>

            <button
              type="button"
              onClick={handlePayNow}
              disabled={processingPayment}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {processingPayment ? "Processing..." : "Pay Now"}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default Checkout;
