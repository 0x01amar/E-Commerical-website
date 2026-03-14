import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { apiUrl, mediaUrl } from "../config/api";

const TAX_RATE = 0.08;
const SHIPPING_CHARGE = 79;

const ADMIN_UPI_ID = "8405966305@axl";
const ADMIN_UPI_NAME = "Amarnath Kumar";

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
  const [addressMode, setAddressMode] = useState("saved"); // "saved" or "new"
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS);
  const [savedAddress, setSavedAddress] = useState(EMPTY_ADDRESS);
  const [savedAddressText, setSavedAddressText] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [paymentOption, setPaymentOption] = useState("cod");
  const [paidNowAmountInput, setPaidNowAmountInput] = useState("");
  const [upiTransactionId, setUpiTransactionId] = useState("");
  const [upiCopied, setUpiCopied] = useState(false);
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

    if (paymentOption === "upi") {
      if (!upiTransactionId.trim()) {
        setError("Please enter the UPI transaction ID after completing payment");
        return;
      }
    }

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
          upiTransactionId: paymentOption === "upi" ? upiTransactionId.trim() : "",
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
          : paymentOption === "upi"
            ? "UPI payment order placed! Admin will verify your transaction and confirm shortly."
            : "Half payment order placed successfully. Confirmation has been sent by email."
      );
    } catch (placeOrderError) {
      setError(placeOrderError.message || "Failed to place order");
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loadingProduct) {
    return <p className="p-6" style={{ color: "#0284c7" }}>Loading checkout...</p>;
  }

  if (!product) {
    return (
      <div className="space-y-4 p-6">
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-600">{error || "Product not found"}</p>
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

  const imageUrl = mediaUrl(product.image || product.images?.[0] || "") || "https://placehold.co/600x400?text=No+Image";

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5">
      <button
        type="button"
        onClick={() => navigate(`/product/${product._id}`)}
        className="btn-ghost rounded-lg px-4 py-2 text-sm"
      >
        ← Back to product
      </button>

      <div className="glass rounded-2xl p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap gap-2">
          {["Quantity", "Address", "Summary", "Payment"].map((label, index) => {
            const active = step === index + 1;

            return (
              <span
                key={label}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${active ? "text-white" : "text-[#6080a0]"}`}
                style={active ? { background: "linear-gradient(135deg,#0284c7,#7c3aed)", boxShadow: "0 10px 20px rgba(2,132,199,0.16)" } : { background: "rgba(255,255,255,0.82)", border: "1px solid rgba(100,160,220,0.22)" }}
              >
                {index + 1}. {label}
              </span>
            );
          })}
        </div>

        {error ? <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p> : null}
        {notice ? <p className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">{notice}</p> : null}

        {step === 1 ? (
          <div className="space-y-5">
            <div className="flex flex-col gap-4 rounded-xl p-4 sm:flex-row" style={{ background: "rgba(255,255,255,0.78)", border: "1px solid rgba(100,160,220,0.20)" }}>
              <img src={imageUrl} alt={product.name} className="h-36 w-full rounded-xl object-cover sm:h-28 sm:w-36" onError={e => { e.currentTarget.src = "https://placehold.co/200x150?text=No+Image"; }} />
              <div className="flex-1 space-y-1">
                <h2 className="text-lg font-semibold" style={{ color: "#1a2f48" }}>{product.name}</h2>
                <p className="text-sm" style={{ color: "#6080a0" }}>{product.category}</p>
                <p className="text-xl font-bold" style={{ color: "#0284c7" }}>₹{Number(product.price || 0).toFixed(2)}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium" style={{ color: "#1a2f48" }}>Choose Quantity</p>
              <div className="inline-flex items-center gap-2 rounded-xl p-2" style={{ border: "1px solid rgba(100,160,220,0.22)", background: "rgba(255,255,255,0.82)" }}>
                <button
                  type="button"
                  onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                  className="h-9 w-9 rounded-lg text-lg transition"
                  style={{ background: "rgba(255,255,255,0.92)", border: "1px solid rgba(100,160,220,0.24)", color: "#2d5a8e" }}
                >
                  -
                </button>
                <span className="w-10 text-center text-base font-semibold" style={{ color: "#1a2f48" }}>{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((prev) => prev + 1)}
                  className="h-9 w-9 rounded-lg text-lg transition"
                  style={{ background: "rgba(255,255,255,0.92)", border: "1px solid rgba(100,160,220,0.24)", color: "#2d5a8e" }}
                >
                  +
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={moveToAddressStep}
              className="btn-neon w-full rounded-xl py-3 text-sm"
            >
              Next
            </button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            {savedAddressText ? (
              <div className="rounded-2xl p-4" style={{ background: "rgba(240,248,255,0.82)", border: "2px solid rgba(2,132,199,0.18)" }}>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      id="use-saved"
                      name="addressMode"
                      value="saved"
                      checked={addressMode === "saved"}
                      onChange={(e) => {
                        setAddressMode(e.target.value);
                        setAddressForm(savedAddress);
                      }}
                      className="mt-1"
                    />
                    <label htmlFor="use-saved">
                      <p className="text-sm font-semibold" style={{ color: "#1a2f48" }}>Use Saved Address</p>
                      <p className="mt-1 rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(255,255,255,0.85)", color: "#3a5470" }}>📍 {savedAddressText}</p>
                    </label>
                  </div>
                </div>
              </div>
            ) : null}

              <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.80)", border: "2px solid rgba(100,160,220,0.22)" }}>
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  id="use-new"
                  name="addressMode"
                  value="new"
                  checked={addressMode === "new"}
                  onChange={(e) => {
                    setAddressMode(e.target.value);
                    setAddressForm(EMPTY_ADDRESS);
                  }}
                  className="mt-1"
                />
                <label htmlFor="use-new" className="text-sm font-semibold text-[#1a2f48]">
                  Enter New Address
                </label>
              </div>
            </div>

            {addressMode === "new" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-[#3a5470]">Address Line *</label>
                  <input
                    value={addressForm.line1}
                    onChange={(event) => setAddressField("line1", event.target.value)}
                    placeholder="House no, street, locality"
                    className="input-dark w-full"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[#3a5470]">Village/Town *</label>
                  <input
                    value={addressForm.villageTown}
                    onChange={(event) => setAddressField("villageTown", event.target.value)}
                    className="input-dark w-full"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[#3a5470]">Ward No *</label>
                  <input
                    value={addressForm.wardNo}
                    onChange={(event) => setAddressField("wardNo", event.target.value)}
                    className="input-dark w-full"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[#3a5470]">District *</label>
                  <input
                    value={addressForm.district}
                    onChange={(event) => setAddressField("district", event.target.value)}
                    className="input-dark w-full"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[#3a5470]">State *</label>
                  <input
                    value={addressForm.state}
                    onChange={(event) => setAddressField("state", event.target.value)}
                    className="input-dark w-full"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[#3a5470]">Pincode *</label>
                  <input
                    value={addressForm.pincode}
                    maxLength={6}
                    onChange={(event) =>
                      setAddressField("pincode", event.target.value.replace(/[^0-9]/g, ""))
                    }
                    className="input-dark w-full"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[#3a5470]">Landmark</label>
                  <input
                    value={addressForm.landmark}
                    onChange={(event) => setAddressField("landmark", event.target.value)}
                    className="input-dark w-full"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-[#3a5470]">Phone Number *</label>
                  <input
                    value={contactPhone}
                    maxLength={10}
                    onChange={(event) => setContactPhone(event.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="10-digit mobile number"
                    className="input-dark w-full"
                  />
                </div>
              </div>
            )}

            {addressMode === "saved" && savedAddressText && (
              <div className="rounded-lg p-4" style={{ background: "rgba(2,132,199,0.08)", border: "2px solid rgba(2,132,199,0.18)" }}>
                <p className="text-sm font-medium text-sky-700">✓ Using saved address</p>
                <p className="mt-2 text-sm" style={{ color: "#3a5470" }}>{contactPhone}</p>
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-ghost rounded-xl px-4 py-3 text-sm"
              >
                Back
              </button>
              <button
                type="button"
                onClick={saveAddressAndNext}
                disabled={savingAddress}
                className="flex-1 btn-neon rounded-xl py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingAddress ? "Saving..." : "Save & Next"}
              </button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <div className="rounded-xl p-4" style={{ border: "1px solid rgba(100,160,220,0.20)", background: "rgba(255,255,255,0.78)" }}>
              <p className="text-sm" style={{ color: "#6080a0" }}>Delivery Address</p>
              <p className="mt-1 text-sm font-medium" style={{ color: "#1a2f48" }}>{deliveryAddressText || "-"}</p>
              <p className="mt-2 text-sm" style={{ color: "#6080a0" }}>Phone: {contactPhone || "-"}</p>
            </div>

            <div className="rounded-xl p-4" style={{ border: "1px solid rgba(100,160,220,0.20)", background: "rgba(255,255,255,0.78)" }}>
              <div className="flex items-center justify-between text-sm" style={{ color: "#3a5470" }}>
                <span>Price ({quantity} × ₹{Number(product.price || 0).toFixed(2)})</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm" style={{ color: "#3a5470" }}>
                <span>Tax ({Math.round(TAX_RATE * 100)}%)</span>
                <span>₹{taxAmount.toFixed(2)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm" style={{ color: "#3a5470" }}>
                <span>Shipping</span>
                <span>₹{shippingCharge.toFixed(2)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between pt-3 text-base font-semibold" style={{ borderTop: "1px solid rgba(100,160,220,0.18)", color: "#1a2f48" }}>
                <span>Total</span>
                <span style={{ color: "#0284c7" }}>₹{totalPrice.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn-ghost rounded-xl px-4 py-3 text-sm"
              >
                Back
              </button>
              <button
                type="button"
                onClick={continueToPayment}
                className="flex-1 btn-neon rounded-xl py-3 text-sm"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            <div className="space-y-2 rounded-xl p-4" style={{ border: "1px solid rgba(100,160,220,0.20)", background: "rgba(255,255,255,0.78)" }}>
              <p className="mb-2 text-sm font-semibold" style={{ color: "#1a2f48" }}>Choose Payment Method</p>
              <label className="flex items-start gap-2 text-sm text-[#1a2f48]">
                <input
                  type="radio"
                  name="paymentOption"
                  value="cod"
                  checked={paymentOption === "cod"}
                  onChange={(event) => setPaymentOption(event.target.value)}
                  className="mt-0.5 accent-sky-600"
                />
                <span>💵 Cash on Delivery</span>
              </label>
              <label className="flex items-start gap-2 text-sm text-[#1a2f48]">
                <input
                  type="radio"
                  name="paymentOption"
                  value="upi"
                  checked={paymentOption === "upi"}
                  onChange={(event) => setPaymentOption(event.target.value)}
                  className="mt-0.5 accent-sky-600"
                />
                <span>📱 Pay via UPI (PhonePe / GPay / Paytm / Navi)</span>
              </label>
              <label className="flex items-start gap-2 text-sm text-[#1a2f48]">
                <input
                  type="radio"
                  name="paymentOption"
                  value="half"
                  checked={paymentOption === "half"}
                  onChange={(event) => setPaymentOption(event.target.value)}
                  className="mt-0.5 accent-sky-600"
                />
                <span>⚡ Half payment now, half on delivery</span>
              </label>
            </div>

            {paymentOption === "upi" ? (
              <div className="space-y-4 rounded-2xl p-4" style={{ border: "2px solid rgba(124,58,237,0.22)", background: "linear-gradient(135deg,rgba(237,233,254,0.60),rgba(219,234,254,0.60))" }}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold" style={{ color: "#5b21b6" }}>Pay ₹{totalPrice.toFixed(2)} via UPI</p>
                  <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: "rgba(124,58,237,0.14)", color: "#7c3aed" }}>Secure Payment</span>
                </div>

                {/* App Buttons */}
                <div>
                  <p className="mb-2 text-xs font-medium" style={{ color: "#6d28d9" }}>Tap to pay with your UPI app:</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { label: "PhonePe", icon: "🟣", scheme: `phonepe://pay?pa=${ADMIN_UPI_ID}&pn=${encodeURIComponent(ADMIN_UPI_NAME)}&am=${totalPrice.toFixed(2)}&cu=INR&tn=FurnitureOrder` },
                      { label: "GPay", icon: "🔵", scheme: `gpay://upi/pay?pa=${ADMIN_UPI_ID}&pn=${encodeURIComponent(ADMIN_UPI_NAME)}&am=${totalPrice.toFixed(2)}&cu=INR&tn=FurnitureOrder` },
                      { label: "Paytm", icon: "🔷", scheme: `paytmmp://pay?pa=${ADMIN_UPI_ID}&pn=${encodeURIComponent(ADMIN_UPI_NAME)}&am=${totalPrice.toFixed(2)}&cu=INR&tn=FurnitureOrder` },
                      { label: "Navi", icon: "🟢", scheme: `upi://pay?pa=${ADMIN_UPI_ID}&pn=${encodeURIComponent(ADMIN_UPI_NAME)}&am=${totalPrice.toFixed(2)}&cu=INR&tn=FurnitureOrder` },
                    ].map(({ label, icon, scheme }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => window.open(scheme, "_self")}
                        className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-all active:scale-95"
                        style={{ background: "rgba(255,255,255,0.92)", border: "1.5px solid rgba(124,58,237,0.24)", color: "#5b21b6", boxShadow: "0 2px 8px rgba(124,58,237,0.10)" }}
                      >
                        <span>{icon}</span> {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center gap-3 sm:flex-row">
                  <div className="rounded-xl p-2" style={{ background: "white", border: "1.5px solid rgba(124,58,237,0.18)" }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`upi://pay?pa=${ADMIN_UPI_ID}&pn=${ADMIN_UPI_NAME}&am=${totalPrice.toFixed(2)}&cu=INR&tn=FurnitureOrder`)}`}
                      alt="UPI QR Code"
                      className="h-40 w-40 rounded-lg"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-xs" style={{ color: "#6d28d9" }}>📷 Scan with any UPI app to pay</p>
                    <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.85)", border: "1px solid rgba(124,58,237,0.20)" }}>
                      <p className="text-xs" style={{ color: "#6d28d9" }}>Pay to UPI ID:</p>
                      <div className="mt-1 flex items-center gap-2">
                        <code className="flex-1 text-sm font-bold" style={{ color: "#1a2f48" }}>{ADMIN_UPI_ID}</code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(ADMIN_UPI_ID).then(() => {
                              setUpiCopied(true);
                              setTimeout(() => setUpiCopied(false), 2000);
                            });
                          }}
                          className="rounded-lg px-2 py-1 text-xs font-medium transition-all"
                          style={{ background: upiCopied ? "rgba(34,197,94,0.15)" : "rgba(124,58,237,0.12)", color: upiCopied ? "#16a34a" : "#7c3aed", border: `1px solid ${upiCopied ? "rgba(34,197,94,0.30)" : "rgba(124,58,237,0.22)"}` }}
                        >
                          {upiCopied ? "✓ Copied" : "Copy"}
                        </button>
                      </div>
                      <p className="mt-1 text-xs" style={{ color: "#6d28d9" }}>Name: {ADMIN_UPI_NAME}</p>
                      <p className="mt-0.5 text-xs font-semibold" style={{ color: "#5b21b6" }}>Amount: ₹{totalPrice.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Transaction ID */}
                <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.85)", border: "1.5px solid rgba(124,58,237,0.22)" }}>
                  <label className="mb-1 block text-sm font-medium" style={{ color: "#5b21b6" }}>
                    ✅ After payment, enter your UPI Transaction ID / Reference No.
                  </label>
                  <input
                    type="text"
                    value={upiTransactionId}
                    onChange={(e) => setUpiTransactionId(e.target.value)}
                    placeholder="e.g. 419876543210 or T2412141234567"
                    className="input-dark w-full"
                  />
                  <p className="mt-1 text-xs" style={{ color: "#7c3aed" }}>
                    Find this in your payment app under &#34;Transaction History&#34;
                  </p>
                </div>
              </div>
            ) : null}

            {paymentOption === "half" ? (
              <div className="rounded-xl p-4" style={{ border: "1px solid rgba(245,158,11,0.24)", background: "rgba(245,158,11,0.08)" }}>
                <p className="text-sm font-medium text-amber-700">
                  Pay exactly ₹{expectedHalfAmount.toFixed(2)} now (half of total amount)
                </p>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paidNowAmountInput}
                  onChange={(event) => setPaidNowAmountInput(event.target.value)}
                  placeholder={`Enter ₹${expectedHalfAmount.toFixed(2)}`}
                  className="input-dark mt-3 w-full"
                />
              </div>
            ) : null}

            {orderPlaced ? (
              <div className="rounded-xl p-4 text-sm" style={{ border: "1px solid rgba(2,132,199,0.20)", background: "rgba(2,132,199,0.08)" }}>
                <p className="font-semibold text-sky-700">Order placed: {orderPlaced.orderCode}</p>
                <p className="mt-1" style={{ color: "#3a5470" }}>Status: {orderPlaced.status}</p>
                <p className="mt-1" style={{ color: "#3a5470" }}>Expected delivery: {orderPlaced.expectedDelivery}</p>
              </div>
            ) : null}

            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={processingPayment || Boolean(orderPlaced)}
                className="w-full btn-neon rounded-xl py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {processingPayment
                ? "Processing..."
                : paymentOption === "upi"
                  ? "✅ Confirm UPI Payment & Place Order"
                  : paymentOption === "half"
                    ? "Pay Now & Place Order"
                    : "Place Order"}
            </button>

            {orderPlaced ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="btn-ghost rounded-xl px-4 py-2.5 text-sm"
                >
                  Back to Home
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="btn-neon rounded-xl px-4 py-2.5 text-sm"
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
