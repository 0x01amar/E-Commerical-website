import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { apiUrl, mediaUrl } from "../config/api";

const DEFAULT_TAX_RATE = 0.08;
const DEFAULT_SHIPPING_CHARGE = 79;

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

const loadRazorpayScript = async () => {
  if (typeof window !== "undefined" && window.Razorpay) {
    return true;
  }

  return new Promise((resolve) => {
    const existing = document.getElementById("razorpay-checkout-js");

    if (existing) {
      existing.addEventListener("load", () => resolve(Boolean(window.Razorpay)), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "razorpay-checkout-js";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
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
  const [addressMode, setAddressMode] = useState("saved");
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS);
  const [savedAddress, setSavedAddress] = useState(EMPTY_ADDRESS);
  const [savedAddressText, setSavedAddressText] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [paymentOption, setPaymentOption] = useState("cod");
  const [pricingSettings, setPricingSettings] = useState({
    taxRate: DEFAULT_TAX_RATE,
    shippingCharge: DEFAULT_SHIPPING_CHARGE,
  });
  const [processingPayment, setProcessingPayment] = useState(false);
  const [gatewayLoading, setGatewayLoading] = useState(false);
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
    const loadPricing = async () => {
      try {
        const response = await fetch(apiUrl("/settings/checkout-pricing"));
        const data = await response.json();

        if (!response.ok) {
          return;
        }

        setPricingSettings({
          taxRate: Number(data?.taxRate ?? DEFAULT_TAX_RATE),
          shippingCharge: Number(data?.shippingCharge ?? DEFAULT_SHIPPING_CHARGE),
        });
      } catch {
        setPricingSettings({
          taxRate: DEFAULT_TAX_RATE,
          shippingCharge: DEFAULT_SHIPPING_CHARGE,
        });
      }
    };

    loadPricing();
  }, []);

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

  const subtotal = useMemo(() => Number(product?.price || 0) * quantity, [product?.price, quantity]);

  const taxRate = useMemo(() => {
    const parsed = Number(pricingSettings.taxRate);
    return Number.isFinite(parsed) ? parsed : DEFAULT_TAX_RATE;
  }, [pricingSettings.taxRate]);

  const configuredShippingCharge = useMemo(() => {
    const parsed = Number(pricingSettings.shippingCharge);
    return Number.isFinite(parsed) ? parsed : DEFAULT_SHIPPING_CHARGE;
  }, [pricingSettings.shippingCharge]);

  const taxAmount = useMemo(() => subtotal * taxRate, [subtotal, taxRate]);
  const shippingCharge = useMemo(() => (subtotal > 0 ? configuredShippingCharge : 0), [configuredShippingCharge, subtotal]);
  const totalPrice = useMemo(() => subtotal + taxAmount + shippingCharge, [shippingCharge, subtotal, taxAmount]);
  const expectedHalfAmount = useMemo(() => Number((totalPrice / 2).toFixed(2)), [totalPrice]);
  const deliveryAddressText = useMemo(() => formatAddress(addressForm), [addressForm]);

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

  const validateCheckoutInputs = () => {
    if (!email || !product) {
      setError("Please login first");
      return null;
    }

    const normalizedAddress = normalizeAddress(addressForm);
    const addressError = validateAddress(normalizedAddress);

    if (addressError) {
      setError(addressError);
      setStep(2);
      return null;
    }

    if (!/^\d{10}$/.test(contactPhone.trim())) {
      setError("Please enter a valid 10-digit phone number");
      setStep(2);
      return null;
    }

    return {
      ...normalizedAddress,
      fullAddress: formatAddress(normalizedAddress),
    };
  };

  const placeCodOrder = async () => {
    const finalAddress = validateCheckoutInputs();

    if (!finalAddress) {
      return;
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
          paymentOption: "cod",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to place order");
      }

      setOrderPlaced(data?.order || null);
      syncCartAfterOrder();
      setNotice("Order placed successfully. Confirmation has been sent by email.");
    } catch (placeOrderError) {
      setError(placeOrderError.message || "Failed to place order");
    } finally {
      setProcessingPayment(false);
    }
  };

  const verifyGatewayPaymentAndPlaceOrder = async (payload, internalOrderId) => {
    try {
      setProcessingPayment(true);
      setError("");
      setNotice("Verifying payment...");

      const response = await fetch(apiUrl("/payment/verify"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          internalOrderId,
          razorpayOrderId: payload.razorpay_order_id,
          razorpayPaymentId: payload.razorpay_payment_id,
          razorpaySignature: payload.razorpay_signature,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Payment verification failed");
      }

      setOrderPlaced(data?.order || null);
      syncCartAfterOrder();
      setNotice("Payment successful and verified. Order placed successfully. Track your product in Profile.");
      window.alert("Payment successful. Your order has been placed.");
    } catch (verifyError) {
      const message = verifyError.message || "Payment verification failed";
      setError(message);
      setNotice("");
      window.alert(`Payment Failed: ${message}`);
    } finally {
      setProcessingPayment(false);
      setGatewayLoading(false);
    }
  };

  const startVerifiedOnlinePayment = async () => {
    if (!["upi", "half"].includes(paymentOption)) {
      return;
    }

    const finalAddress = validateCheckoutInputs();

    if (!finalAddress) {
      return;
    }

    const payableAmount = paymentOption === "half" ? expectedHalfAmount : totalPrice;

    try {
      setGatewayLoading(true);
      setError("");
      setNotice("Initiating secure payment...");

      const createResponse = await fetch(apiUrl("/payment/orders"), {
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
          amount: Number(payableAmount.toFixed(2)),
        }),
      });

      const createData = await createResponse.json();

      if (!createResponse.ok) {
        throw new Error(createData?.message || "Failed to initiate payment");
      }

      const loaded = await loadRazorpayScript();

      if (!loaded || !window.Razorpay) {
        throw new Error("Unable to load payment gateway. Please try again.");
      }

      const gatewayOrderId = createData?.order?.id;
      const internalOrderId = createData?.internalOrderId;

      if (!gatewayOrderId || !internalOrderId) {
        throw new Error("Invalid order response from payment gateway");
      }

      const options = {
        key: createData?.key,
        amount: createData?.order?.amount,
        currency: createData?.order?.currency || "INR",
        name: createData?.name || "Apna Furniture House",
        description: createData?.description || "Secure payment",
        order_id: gatewayOrderId,
        prefill: {
          name: createData?.prefill?.name || "Customer",
          email: createData?.prefill?.email || email,
          contact: createData?.prefill?.contact || contactPhone,
        },
        theme: {
          color: "#0284c7",
        },
        handler: (paymentPayload) => {
          verifyGatewayPaymentAndPlaceOrder(paymentPayload, internalOrderId);
        },
        modal: {
          ondismiss: () => {
            setGatewayLoading(false);
            setNotice("");
            setError("Payment cancelled");
            window.alert("Payment Failed: Payment was cancelled.");
          },
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on("payment.failed", async (event) => {
        const reason =
          event?.error?.description ||
          event?.error?.reason ||
          "Payment failed";

        setGatewayLoading(false);
        setNotice("");
        setError(reason);
        window.alert(`Payment Failed: ${reason}`);
      });

      razorpay.open();
    } catch (startError) {
      setGatewayLoading(false);
      setNotice("");
      setError(startError.message || "Failed to start payment");
      window.alert(`Payment Failed: ${startError.message || "Failed to start payment"}`);
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
  const onlinePayAmount = paymentOption === "half" ? expectedHalfAmount : totalPrice;

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
                <span>Tax ({Math.round(taxRate * 100)}%)</span>
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
                <span>📱 Full Online Payment (Verified)</span>
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
                <span>⚡ Half Online Payment now, half on delivery (Verified)</span>
              </label>
            </div>

            {paymentOption === "cod" ? (
              <button
                type="button"
                onClick={placeCodOrder}
                disabled={processingPayment || gatewayLoading || Boolean(orderPlaced)}
                className="w-full btn-neon rounded-xl py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {processingPayment ? "Processing..." : "Place Order"}
              </button>
            ) : (
              <div className="rounded-xl p-4" style={{ border: "1px solid rgba(124,58,237,0.24)", background: "rgba(124,58,237,0.08)" }}>
                <p className="text-sm font-medium" style={{ color: "#5b21b6" }}>
                  {paymentOption === "half"
                    ? `Pay ₹${onlinePayAmount.toFixed(2)} now. Remaining ₹${(totalPrice - onlinePayAmount).toFixed(2)} on delivery.`
                    : `Pay ₹${onlinePayAmount.toFixed(2)} securely now.`}
                </p>
                <p className="mt-1 text-xs" style={{ color: "#6d28d9" }}>
                  Order is placed automatically only after payment is verified by the gateway.
                </p>
                <button
                  type="button"
                  onClick={startVerifiedOnlinePayment}
                  disabled={processingPayment || gatewayLoading || Boolean(orderPlaced)}
                  className="mt-3 w-full btn-neon rounded-xl py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {processingPayment
                    ? "Verifying Payment..."
                    : gatewayLoading
                      ? "Opening Payment..."
                      : `Pay ₹${onlinePayAmount.toFixed(2)} Securely`}
                </button>
              </div>
            )}

            {orderPlaced ? (
              <div className="rounded-xl p-4 text-sm" style={{ border: "1px solid rgba(2,132,199,0.20)", background: "rgba(2,132,199,0.08)" }}>
                <p className="font-semibold text-sky-700">Order placed: {orderPlaced.orderCode}</p>
                <p className="mt-1" style={{ color: "#3a5470" }}>Status: {orderPlaced.status}</p>
                <p className="mt-1" style={{ color: "#3a5470" }}>Expected delivery: {orderPlaced.expectedDelivery}</p>
              </div>
            ) : null}

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
