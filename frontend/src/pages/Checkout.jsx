import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { apiUrl, mediaUrl } from "../config/api";

const TAX_RATE = 0.08;
const SHIPPING_CHARGE = 79;

const EMPTY_ADDRESS = {
  line1: "",
  landmark: "",
  villageTown: "",
  wardNo: "",
  district: "",
  state: "",
  pincode: "",
  fullAddress: "",
};

const normalizeAddress = (address = {}) => {
  if (typeof address === "string") {
    const fullAddress = address.trim();

    return {
      ...EMPTY_ADDRESS,
      line1: fullAddress,
      fullAddress,
    };
  }

  return {
    line1: String(address?.line1 || "").trim(),
    landmark: String(address?.landmark || "").trim(),
    villageTown: String(address?.villageTown || "").trim(),
    wardNo: String(address?.wardNo || "").trim(),
    district: String(address?.district || "").trim(),
    state: String(address?.state || "").trim(),
    pincode: String(address?.pincode || "").trim(),
    fullAddress: String(address?.fullAddress || "").trim(),
  };
};

const formatAddress = (address = EMPTY_ADDRESS) => {
  return [
    address.line1,
    address.landmark,
    address.villageTown,
    address.wardNo ? `Ward No ${address.wardNo}` : "",
    address.district,
    address.state,
    address.pincode,
  ]
    .filter(Boolean)
    .join(", ");
};

const validateAddress = (address = EMPTY_ADDRESS) => {
  const requiredFields = ["line1", "villageTown", "wardNo", "district", "state", "pincode"];

  for (const field of requiredFields) {
    if (!String(address[field] || "").trim()) {
      return "Please fill all required delivery address fields";
    }
  }

  if (!/^\d{6}$/.test(address.pincode)) {
    return "Pincode must be exactly 6 digits";
  }

  return "";
};

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
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS);
  const [savedAddress, setSavedAddress] = useState(EMPTY_ADDRESS);
  const [savedAddressText, setSavedAddressText] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [paymentOption, setPaymentOption] = useState("cod");
  const [paidNowAmountInput, setPaidNowAmountInput] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [cartSynced, setCartSynced] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(null);
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

        const profileAddress = normalizeAddress(data?.address || data?.addressText || {});
        const formatted = profileAddress.fullAddress || formatAddress(profileAddress);

        setSavedAddress(profileAddress);
        setSavedAddressText(formatted);

        if (formatted) {
          setAddressForm(profileAddress);
        } else {
          setAddressForm(EMPTY_ADDRESS);
        }

        if (data?.phone) {
          setContactPhone(String(data.phone));
        }
      } catch {
        setSavedAddress(EMPTY_ADDRESS);
        setSavedAddressText("");
        setAddressForm(EMPTY_ADDRESS);
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

    if (existingItem) {
      setQuantity(Math.max(1, Number(existingItem.quantity || 1)));
    }

    setCartSynced(true);
  }, [cartSynced, mode, product]);

  const subtotal = useMemo(() => {
    return Number(product?.price || 0) * quantity;
  }, [product?.price, quantity]);

  const taxAmount = useMemo(() => subtotal * TAX_RATE, [subtotal]);
  const shippingCharge = useMemo(() => (subtotal > 0 ? SHIPPING_CHARGE : 0), [subtotal]);
  const totalPrice = useMemo(() => subtotal + taxAmount + shippingCharge, [shippingCharge, subtotal, taxAmount]);
  const expectedHalfAmount = useMemo(() => Number((totalPrice / 2).toFixed(2)), [totalPrice]);
  const deliveryAddressText = useMemo(() => {
    return formatAddress(addressForm);
  }, [addressForm]);

  const moveToAddressStep = () => {
    if (quantity < 1) {
      setError("Quantity must be at least 1");
      return;
    }

    setError("");
    setNotice("");
    setStep(2);
  };

  const setAddressField = (field, value) => {
    setAddressForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveAddressAndNext = async () => {
    if (!email) {
      setError("Please login first");
      return;
    }

    const normalizedAddress = normalizeAddress(addressForm);
    const addressError = validateAddress(normalizedAddress);

    if (addressError) {
      setError(addressError);
      return;
    }

    if (!/^\d{10}$/.test(contactPhone.trim())) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    const finalAddress = {
      ...normalizedAddress,
      fullAddress: formatAddress(normalizedAddress),
    };

    try {
      setSavingAddress(true);
      setError("");

      const response = await fetch(apiUrl(`/auth/profile/${encodeURIComponent(email)}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: contactPhone.trim(),
          address: finalAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to save address");
      }

      const updatedAddress = normalizeAddress(data?.address || finalAddress);
      const updatedAddressText = updatedAddress.fullAddress || formatAddress(updatedAddress);

      setSavedAddress(updatedAddress);
      setSavedAddressText(updatedAddressText);
      setAddressForm(updatedAddress);
      setStep(3);
    } catch (saveError) {
      setError(saveError.message || "Failed to save address");
    } finally {
      setSavingAddress(false);
    }
  };

  const continueToPayment = () => {
    if (!deliveryAddressText) {
      setError("Please add delivery address first");
      return;
    }

    setError("");
    setNotice("");
    setStep(4);
  };

  const syncCartAfterOrder = () => {
    if (mode !== "cart" || !product) {
      return;
    }

    const existingCart = JSON.parse(localStorage.getItem("cartItems") || "[]");
    const nextCart = existingCart
      .map((item) => {
        if (item._id !== product._id) {
          return item;
        }

        const currentQuantity = Number(item.quantity || 1);
        const nextQuantity = currentQuantity - quantity;

        if (nextQuantity <= 0) {
          return null;
        }

        return {
          ...item,
          quantity: nextQuantity,
        };
      })
      .filter(Boolean);

    localStorage.setItem("cartItems", JSON.stringify(nextCart));
  };

  const handlePlaceOrder = async () => {
    if (!email || !product) {
      setError("Please login first");
      return;
    }

    const normalizedAddress = normalizeAddress(addressForm);
    const addressError = validateAddress(normalizedAddress);

    if (addressError) {
      setError(addressError);
      setStep(2);
      return;
    }

    if (!/^\d{10}$/.test(contactPhone.trim())) {
      setError("Please enter a valid 10-digit phone number");
      setStep(2);
      return;
    }

    const finalAddress = {
      ...normalizedAddress,
      fullAddress: formatAddress(normalizedAddress),
    };

    let paidNowAmount = 0;

    if (paymentOption === "half") {
      const parsed = Number(paidNowAmountInput);

      if (!Number.isFinite(parsed)) {
        setError("Please enter the half payment amount");
        return;
      }

      if (Math.abs(parsed - expectedHalfAmount) > 0.01) {
        setError(`Half payment must be exactly ₹${expectedHalfAmount.toFixed(2)}`);
        return;
      }

      paidNowAmount = Number(parsed.toFixed(2));
    }

    try {
      setProcessingPayment(true);
      setError("");
      setNotice("");

      const response = await fetch(apiUrl("/orders"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          productId: product._id,
          quantity,
          address: finalAddress,
          phone: contactPhone.trim(),
          paymentOption,
          paidNowAmount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (typeof data?.expectedHalfAmount === "number") {
          setPaidNowAmountInput(String(data.expectedHalfAmount));
        }

        throw new Error(data?.message || "Failed to place order");
      }

      setOrderPlaced(data?.order || null);
      syncCartAfterOrder();
      setNotice(
        paymentOption === "cod"
          ? "Order placed successfully. Confirmation has been sent by email."
          : "Half payment order placed successfully. Confirmation has been sent by email."
      );
    } catch (placeOrderError) {
      setError(placeOrderError.message || "Failed to place order");
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

  const imageUrl = mediaUrl(product.image || product.images?.[0] || "") || "https://placehold.co/600x400?text=No+Image";

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
            {savedAddressText ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Saved Address</p>
                <p className="mt-1 text-sm text-slate-700">{savedAddressText}</p>
                <button
                  type="button"
                  onClick={() => setAddressForm(savedAddress)}
                  className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white"
                >
                  Use Saved Address
                </button>
                <button
                  type="button"
                  onClick={() => setAddressForm(EMPTY_ADDRESS)}
                  className="mt-2 ml-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white"
                >
                  Use Empty Form
                </button>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Address Line *</label>
                <input
                  value={addressForm.line1}
                  onChange={(event) => setAddressField("line1", event.target.value)}
                  placeholder="House no, street, locality"
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Village/Town *</label>
                <input
                  value={addressForm.villageTown}
                  onChange={(event) => setAddressField("villageTown", event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Ward No *</label>
                <input
                  value={addressForm.wardNo}
                  onChange={(event) => setAddressField("wardNo", event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">District *</label>
                <input
                  value={addressForm.district}
                  onChange={(event) => setAddressField("district", event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">State *</label>
                <input
                  value={addressForm.state}
                  onChange={(event) => setAddressField("state", event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Pincode *</label>
                <input
                  value={addressForm.pincode}
                  maxLength={6}
                  onChange={(event) =>
                    setAddressField("pincode", event.target.value.replace(/[^0-9]/g, ""))
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Landmark</label>
                <input
                  value={addressForm.landmark}
                  onChange={(event) => setAddressField("landmark", event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Phone Number *</label>
                <input
                  value={contactPhone}
                  maxLength={10}
                  onChange={(event) => setContactPhone(event.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="10-digit mobile number"
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                />
              </div>
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
              <p className="mt-1 text-sm font-medium text-slate-800">{deliveryAddressText || "-"}</p>
              <p className="mt-2 text-sm text-slate-500">Phone: {contactPhone || "-"}</p>
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

            {paymentOption === "half" ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-800">
                  Pay exactly ₹{expectedHalfAmount.toFixed(2)} now (half of total amount)
                </p>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paidNowAmountInput}
                  onChange={(event) => setPaidNowAmountInput(event.target.value)}
                  placeholder={`Enter ₹${expectedHalfAmount.toFixed(2)}`}
                  className="mt-3 w-full rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                />
              </div>
            ) : null}

            {orderPlaced ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                <p className="font-semibold">Order placed: {orderPlaced.orderCode}</p>
                <p className="mt-1">Status: {orderPlaced.status}</p>
                <p className="mt-1">Expected delivery: {orderPlaced.expectedDelivery}</p>
              </div>
            ) : null}

            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={processingPayment || Boolean(orderPlaced)}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {processingPayment
                ? "Processing..."
                : paymentOption === "half"
                  ? "Pay Now & Place Order"
                  : "Place Order"}
            </button>

            {orderPlaced ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Back to Home
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Track in Profile
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default Checkout;
