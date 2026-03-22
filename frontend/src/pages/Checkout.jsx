import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import {
  apiUrl,
  mediaUrl,
  resolveApiErrorMessage,
  apiFetchJson
} from "../config/api";
import ImageLightbox from "../components/ImageLightbox";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { 
  CheckCircleIcon, 
  TruckIcon, 
  CreditCardIcon, 
  MapPinIcon,
  ArrowLeftIcon,
  PlusIcon,
  MinusIcon,
  ShoppingBagIcon
} from "@heroicons/react/24/outline";
import { showToast } from "../config/toast";

const EMPTY_ADDRESS = {
  line1: "", landmark: "", villageTown: "", wardNo: "",
  district: "", state: "", pincode: "", fullAddress: ""
};

const formatAddress = (addr) => [
  addr.line1, addr.landmark, addr.villageTown,
  addr.wardNo ? `Ward No ${addr.wardNo}` : "",
  addr.district, addr.state, addr.pincode
].filter(Boolean).join(", ");

function Checkout() {
  const { productId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const email = localStorage.getItem("email");
  const mode = new URLSearchParams(location.search).get("mode") || "buy-now";

  const [product, setProduct] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS);
  const [savedAddress, setSavedAddress] = useState(null);
  const [useSavedAddress, setUseSavedAddress] = useState(false);
  const [contactPhone, setContactPhone] = useState("");
  const [paymentOption, setPaymentOption] = useState("cod");
  const [processing, setProcessing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(null);
  const [previewImage, setPreviewImage] = useState("");
  const [globalPricing, setGlobalPricing] = useState({ taxRate: 0.08, shippingCharge: 79 });

  useEffect(() => {
    if (!email) navigate("/login", { state: { redirectTo: location.pathname } });
  }, [email, navigate, location.pathname]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [prodRes, profRes, priceRes] = await Promise.all([
          mode === "cart" ? Promise.resolve({ response: { ok: true }, data: [] }) : apiFetchJson(`/products/${productId}`),
          apiFetchJson(`/auth/profile/${encodeURIComponent(email)}`),
          apiFetchJson("/settings/checkout-pricing")
        ]);

        if (priceRes.response.ok) {
          setGlobalPricing(priceRes.data);
        }

        if (mode === "cart") {
          const items = JSON.parse(localStorage.getItem("cartItems") || "[]");
          if (items.length === 0) {
            showToast("Your cart is empty", "error");
            navigate("/cart");
            return;
          }
          setCartItems(items);
        } else if (prodRes.response.ok) {
          setProduct(prodRes.data);
        }

        if (profRes.response.ok) {
          const addr = { ...EMPTY_ADDRESS, ...(profRes.data.address || {}) };
          const hasSaved = Boolean(addr.line1 && addr.pincode);
          if (hasSaved) {
            setSavedAddress(addr);
            setUseSavedAddress(true);
            setAddressForm(addr);
          } else {
            setAddressForm(EMPTY_ADDRESS);
          }
          setContactPhone(profRes.data.phone || "");
        }
      } catch (err) {
        showToast("Failed to load checkout data", "error");
      } finally {
        setLoading(false);
      }
    };
    if (email) loadData();
  }, [productId, email, mode, navigate]);

  useEffect(() => {
    if (!loading && window.innerWidth < 768) {
      window.scrollTo(0, 0);
    }
  }, [step, loading]);

  const pricingDetails = useMemo(() => {
    let subtotal = 0;
    let taxAmount = 0;
    let shippingCharge = 0;

    const calculateItemPricing = (item) => {
      const itemSubtotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
      const effectiveTaxRate = (item.taxRate !== undefined && item.taxRate !== null) ? item.taxRate : globalPricing.taxRate;
      const effectiveShipping = (item.shippingCharge !== undefined && item.shippingCharge !== null) ? item.shippingCharge : globalPricing.shippingCharge;
      
      return {
        subtotal: itemSubtotal,
        tax: itemSubtotal * effectiveTaxRate,
        shipping: itemSubtotal > 0 ? Number(effectiveShipping) : 0
      };
    };

    if (mode === "cart") {
      cartItems.forEach(item => {
        const p = calculateItemPricing(item);
        subtotal += p.subtotal;
        taxAmount += p.tax;
        shippingCharge += p.shipping;
      });
    } else if (product) {
      const p = calculateItemPricing({ ...product, quantity });
      subtotal = p.subtotal;
      taxAmount = p.tax;
      shippingCharge = p.shipping;
    }

    return {
      subtotal,
      taxAmount: Math.round(taxAmount * 100) / 100,
      shippingCharge,
      total: Math.round((subtotal + taxAmount + shippingCharge) * 100) / 100
    };
  }, [mode, cartItems, product, quantity, globalPricing]);

  const { subtotal, taxAmount, shippingCharge, total } = pricingDetails;

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePlaceOrder = async () => {
    try {
      setProcessing(true);
      
      const payload = mode === "cart" 
        ? {
            email,
            items: cartItems.map(item => ({ productId: item._id, quantity: item.quantity })),
            address: { ...addressForm, fullAddress: formatAddress(addressForm) },
            phone: contactPhone,
            paymentOption: paymentOption === 'online' ? 'upi' : 'cod',
            isCartOrder: true
          }
        : {
            email,
            productId: product?._id,
            quantity,
            address: { ...addressForm, fullAddress: formatAddress(addressForm) },
            phone: contactPhone,
            paymentOption: paymentOption === 'online' ? 'upi' : 'cod'
          };

      // Case 1: Cash on Delivery
      if (paymentOption === 'cod') {
        const { response, data } = await apiFetchJson("/orders", {
          method: "POST",
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          if (mode === "cart") localStorage.removeItem("cartItems");
          setOrderPlaced(data.order || data.orders?.[0]);
          setStep(4);
          showToast("Order placed successfully!", "success");
        } else {
          showToast(data.message || "Failed to place order", "error");
        }
        return;
      }

      // Case 2: Online Payment (Razorpay)
      const res = await loadRazorpay();
      if (!res) {
        showToast("Razorpay SDK failed to load. Are you online?", "error");
        setProcessing(false);
        return;
      }

      const { response: orderRes, data: orderData } = await apiFetchJson("/payment/orders", {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          paymentOption: 'upi' // Razorpay controller expects 'upi' or 'half'
        })
      });

      if (!orderRes.ok) {
        showToast(orderData.message || "Failed to initiate payment", "error");
        return;
      }

      const options = {
        key: orderData.key,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: orderData.name,
        description: orderData.description,
        order_id: orderData.order.id,
        handler: async (response) => {
          try {
            setProcessing(true);
            const { response: verifyRes, data: verifyData } = await apiFetchJson("/payment/verify", {
              method: "POST",
              body: JSON.stringify({
                email,
                internalOrderId: orderData.internalOrderId,
                internalOrderIds: orderData.internalOrderIds,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              })
            });

            if (verifyRes.ok) {
              if (mode === "cart") localStorage.removeItem("cartItems");
              setOrderPlaced(verifyData.order);
              setStep(4);
              showToast("Payment successful & Order placed!", "success");
            } else {
              showToast(verifyData.message || "Payment verification failed", "error");
            }
          } catch (err) {
            showToast("Error verifying payment", "error");
          } finally {
            setProcessing(false);
          }
        },
        prefill: orderData.prefill,
        theme: { color: "#4A5D4E" },
        modal: {
          ondismiss: () => {
            setProcessing(false);
            showToast("Payment cancelled", "info");
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (err) {
      showToast("An error occurred", "error");
    } finally {
      if (paymentOption === 'cod') setProcessing(false);
    }
  };

  if (loading) return <div className="py-32 text-center font-heading text-xl">Preparing your checkout...</div>;
  if (mode !== "cart" && !product) return <div className="py-32 text-center">Product not found.</div>;
  if (mode === "cart" && cartItems.length === 0) return null;

  const steps = [
    { id: 1, name: "Review", icon: ShoppingBagIcon },
    { id: 2, name: "Delivery", icon: MapPinIcon },
    { id: 3, name: "Payment", icon: CreditCardIcon },
    { id: 4, name: "Success", icon: CheckCircleIcon }
  ];

  const OrderSummary = () => (
    <Card className="bg-neutral-cream border-none p-8 space-y-8 rounded-sm">
      <h2 className="font-heading text-xl font-bold">Order Summary</h2>
      <div className="space-y-4 font-body text-sm text-neutral-dark/60">
        {mode === "cart" ? (
          cartItems.map(item => (
            <div key={item._id} className="flex justify-between italic text-[12px]">
              <span>{item.name} x {item.quantity}</span>
              <span>₹{(Number(item.price) * (item.quantity || 1)).toLocaleString()}</span>
            </div>
          ))
        ) : (
          <div className="flex justify-between italic">
            <span>{product?.name} x {quantity}</span>
            <span>₹{subtotal.toLocaleString()}</span>
          </div>
        )}
        <div className="pt-2 border-t border-neutral-dark/5 space-y-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>₹{subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span>₹{taxAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>{shippingCharge === 0 ? "FREE" : `₹${shippingCharge.toLocaleString()}`}</span>
          </div>
        </div>
        <div className="pt-4 border-t border-neutral-dark/10 flex justify-between text-lg font-bold text-neutral-dark">
          <span>Total</span>
          <span>₹{total.toLocaleString()}</span>
        </div>
      </div>
      <div className="pt-6 space-y-4">
        <div className="flex items-start gap-3">
          <TruckIcon className="w-5 h-5 text-primary shrink-0" />
          <p className="text-[10px] leading-relaxed">Fast & secure delivery to {addressForm.villageTown || 'your doorstep'}.</p>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="max-w-5xl mx-auto px-6 space-y-12 pb-20 pt-24">
      {/* Progress Bar */}
      <div className="flex justify-between items-center max-w-2xl mx-auto relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-neutral-dark/5 -translate-y-1/2 z-0" />
        {steps.map((s) => (
          <div key={s.id} className="relative z-10 flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
              step >= s.id ? "bg-primary border-primary text-white" : "bg-white border-neutral-dark/10 text-neutral-dark/20"
            }`}>
              <s.icon className="w-5 h-5" />
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${
              step >= s.id ? "text-primary" : "text-neutral-dark/20"
            }`}>{s.name}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {step === 1 && (
            <div className="space-y-8">
              <Card className="p-8 space-y-8 border-none bg-white shadow-sm rounded-sm">
                <h2 className="text-2xl font-heading font-bold">Review Your Selection</h2>
                <div className="space-y-6">
                  {mode === "cart" ? (
                    cartItems.map(item => (
                      <div key={item._id} className="flex gap-6 pb-6 border-b border-neutral-dark/5 last:border-0 last:pb-0">
                        <img src={mediaUrl(item.image || item.images?.[0])} className="w-20 h-24 object-cover rounded-sm bg-neutral-cream" alt="" />
                        <div className="flex-grow space-y-1">
                          <h3 className="font-heading font-bold">{item.name}</h3>
                          <p className="text-xs text-neutral-dark/40 font-body">{item.section} • Qty: {item.quantity}</p>
                          <p className="font-body font-bold text-primary text-sm">₹{Number(item.price).toLocaleString()}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex gap-6">
                        <img src={mediaUrl(product?.image || product?.images?.[0])} className="w-24 h-32 object-cover rounded-sm bg-neutral-cream" alt="" />
                        <div className="flex-grow space-y-2">
                          <h3 className="font-heading text-lg font-bold">{product?.name}</h3>
                          <p className="text-sm text-neutral-dark/40 font-body">{product?.section}</p>
                          <p className="font-body font-bold text-primary">₹{Number(product?.price).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 pt-4">
                        <span className="text-sm font-medium">Quantity</span>
                        <div className="flex items-center border border-neutral-dark/10 rounded-sm">
                          <button onClick={() => setQuantity(Math.max(1, quantity-1))} className="p-2"><MinusIcon className="w-4 h-4" /></button>
                          <span className="w-12 text-center font-bold">{quantity}</span>
                          <button onClick={() => setQuantity(quantity+1)} className="p-2"><PlusIcon className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </Card>
              <div className="lg:hidden"><OrderSummary /></div>
              <Button className="w-full h-14 md:h-16 rounded-xl md:rounded-sm shadow-xl md:shadow-none" onClick={() => setStep(2)}>Continue to Delivery</Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <Card className="p-8 space-y-8 border-none bg-white shadow-sm rounded-sm">
                <h2 className="text-2xl font-heading font-bold">Delivery Details</h2>
                <div className="space-y-6">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Select Delivery Destination</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {savedAddress && (
                      <label className={`flex items-start gap-4 p-6 rounded-sm border-2 cursor-pointer transition-all ${
                        useSavedAddress ? "border-primary bg-primary/5" : "border-neutral-dark/5 hover:border-neutral-dark/10"
                      }`}>
                        <input type="radio" name="addr_type" className="mt-1 accent-primary" checked={useSavedAddress} onChange={() => { setUseSavedAddress(true); setAddressForm(savedAddress); }} />
                        <div className="space-y-2">
                          <p className="font-heading font-bold flex items-center gap-2"><MapPinIcon className="w-4 h-4 text-primary" /> Saved Address</p>
                          <p className="text-[11px] text-neutral-dark/60 font-body leading-relaxed line-clamp-3">{formatAddress(savedAddress)}</p>
                        </div>
                      </label>
                    )}
                    <label className={`flex items-start gap-4 p-6 rounded-sm border-2 cursor-pointer transition-all ${
                      !useSavedAddress ? "border-primary bg-primary/5" : "border-neutral-dark/5 hover:border-neutral-dark/10"
                    }`}>
                      <input type="radio" name="addr_type" className="mt-1 accent-primary" checked={!useSavedAddress} onChange={() => { setUseSavedAddress(false); setAddressForm(EMPTY_ADDRESS); }} />
                      <div className="space-y-2">
                        <p className="font-heading font-bold flex items-center gap-2"><PlusIcon className="w-4 h-4 text-primary" /> New Address</p>
                        <p className="text-[11px] text-neutral-dark/60 font-body leading-relaxed">Manually enter a different delivery destination.</p>
                      </div>
                    </label>
                  </div>
                </div>
                {!useSavedAddress ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-neutral-dark/5">
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-neutral-dark/40">Address Line 1</label>
                      <Input value={addressForm.line1} onChange={e => setAddressForm({...addressForm, line1: e.target.value})} placeholder="House / Flat No, Building Name" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-neutral-dark/40">Village / Town</label>
                      <Input value={addressForm.villageTown} onChange={e => setAddressForm({...addressForm, villageTown: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-neutral-dark/40">Ward No</label>
                      <Input value={addressForm.wardNo} onChange={e => setAddressForm({...addressForm, wardNo: e.target.value})} placeholder="e.g. 5" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-neutral-dark/40">Landmark (Optional)</label>
                      <Input value={addressForm.landmark} onChange={e => setAddressForm({...addressForm, landmark: e.target.value})} placeholder="Nearby place" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-neutral-dark/40">District</label>
                      <Input value={addressForm.district} onChange={e => setAddressForm({...addressForm, district: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-neutral-dark/40">State</label>
                      <Input value={addressForm.state} onChange={e => setAddressForm({...addressForm, state: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-neutral-dark/40">Pincode</label>
                      <Input value={addressForm.pincode} onChange={e => setAddressForm({...addressForm, pincode: e.target.value})} maxLength={6} />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-neutral-dark/40">Contact Phone</label>
                      <Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} maxLength={10} placeholder="10-digit mobile number" />
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-neutral-cream rounded-sm border border-primary/10">
                    <div className="flex items-start gap-4">
                      <MapPinIcon className="w-6 h-6 text-primary shrink-0 mt-1" />
                      <div className="space-y-2">
                        <p className="font-heading font-bold text-lg text-neutral-dark">Primary Address Details</p>
                        <p className="text-sm text-neutral-dark/60 font-body leading-relaxed max-w-md">{formatAddress(savedAddress)}</p>
                        <div className="pt-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Contact Number</p>
                          <p className="text-sm font-bold text-neutral-dark">{contactPhone}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
              <div className="lg:hidden"><OrderSummary /></div>
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                <Button variant="outline" className="flex-1 h-12 md:h-14 order-2 sm:order-1 rounded-xl md:rounded-sm" onClick={() => setStep(1)}>Back</Button>
                <Button className="flex-[2] h-14 md:h-14 order-1 sm:order-2 rounded-xl md:rounded-sm shadow-xl md:shadow-none" onClick={() => {
                  const { line1, pincode } = addressForm;
                  
                  if (!line1 || !pincode || !contactPhone) {
                    showToast("Please provide at least Address Line 1, Pincode, and Contact Phone", "warning");
                    return;
                  }

                  if (pincode.length !== 6) {
                    showToast("Pincode must be 6 digits", "warning");
                    return;
                  }
                  if (contactPhone.length !== 10) {
                    showToast("Phone must be 10 digits", "warning");
                    return;
                  }
                  setStep(3);
                }}>Proceed to Payment</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
              <Card className="p-8 space-y-8 border-none bg-white shadow-sm rounded-sm">
                <h2 className="text-2xl font-heading font-bold">Payment Method</h2>
                <div className="space-y-4">
                  {[
                    { id: 'cod', name: 'Cash on Delivery', desc: 'Pay when your furniture arrives.' },
                    { id: 'online', name: 'Secure Online Payment', desc: 'Pay now via UPI, Cards or NetBanking.' }
                  ].map(opt => (
                    <label key={opt.id} className={`flex items-start gap-4 p-6 rounded-sm border-2 cursor-pointer transition-all ${
                      paymentOption === opt.id ? "border-primary bg-primary/5" : "border-neutral-dark/5 hover:border-neutral-dark/10"
                    }`}>
                      <input type="radio" name="pay" className="mt-1 accent-primary" checked={paymentOption === opt.id} onChange={() => setPaymentOption(opt.id)} />
                      <div className="space-y-1">
                        <p className="font-heading font-bold">{opt.name}</p>
                        <p className="text-sm text-neutral-dark/40 font-body">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </Card>
              <div className="lg:hidden"><OrderSummary /></div>
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                <Button variant="outline" className="flex-1 h-12 md:h-14 order-2 sm:order-1 rounded-xl md:rounded-sm" onClick={() => setStep(2)}>Back</Button>
                <Button className="flex-[2] h-14 md:h-14 order-1 sm:order-2 rounded-xl md:rounded-sm shadow-xl md:shadow-none" onClick={handlePlaceOrder} disabled={processing}>
                  {processing ? "Processing..." : paymentOption === 'cod' ? `Confirm Order - ₹${total.toLocaleString()}` : `Pay Now - ₹${total.toLocaleString()}`}
                </Button>
              </div>
            </div>
          )}

          {step === 4 && orderPlaced && (
            <Card className="p-12 space-y-8 border-none bg-white shadow-sm rounded-sm text-center animate-in zoom-in fade-in duration-1000">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircleIcon className="w-12 h-12" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-heading font-bold">Payment Successful!</h2>
                <p className="text-neutral-dark/60 font-body">Order #{orderPlaced.orderCode} is now confirmed.</p>
              </div>
              <p className="text-neutral-dark/70 max-w-sm mx-auto font-body">
                Your exquisite piece is now being prepared. We've sent the confirmation details to your email.
              </p>
              <div className="flex flex-col gap-3 max-w-xs mx-auto pt-6">
                <Button onClick={() => navigate("/dashboard")}>Track My Order</Button>
                <Button variant="outline" onClick={() => navigate("/")}>Return to Gallery</Button>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar Summary (Desktop Only) */}
        {step < 4 && (
          <aside className="hidden lg:block space-y-8 animate-in fade-in slide-in-from-right duration-700">
            <OrderSummary />
          </aside>
        )}
      </div>

      <ImageLightbox isOpen={!!previewImage} imageSrc={previewImage} onClose={() => setPreviewImage("")} />
    </div>
  );
}

export default Checkout;
