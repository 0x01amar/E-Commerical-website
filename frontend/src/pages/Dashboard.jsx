import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import OrderTimeline from "../components/OrderTimeline";
import { apiFetchJson, mediaUrl } from "../config/api";
import ImageLightbox from "../components/ImageLightbox";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import UserSidebar from "./user/UserSidebar";
import { showToast } from "../config/toast";
import { CreditCardIcon, ArrowLeftOnRectangleIcon, XMarkIcon } from "@heroicons/react/24/outline";

const EMPTY_ADDRESS = {
  line1: "", landmark: "", villageTown: "", wardNo: "",
  district: "", state: "", pincode: "", fullAddress: ""
};

const CANCELLATION_REASONS = [
  { code: "ordered_by_mistake", label: "Ordered by mistake" },
  { code: "found_better_price", label: "Found a better price elsewhere" },
  { code: "delivery_takes_too_long", label: "Delivery time is too long" },
  { code: "shipping_too_high", label: "Shipping charges are too high" },
  { code: "product_details_unclear", label: "Product details were not clear" },
  { code: "changed_requirements", label: "My requirements changed" },
  { code: "duplicate_order", label: "Placed a duplicate order" },
  { code: "payment_issue", label: "Facing payment issues" },
  { code: "update_delivery_address", label: "Need to update delivery address" },
  { code: "other_personal_reason", label: "Other personal reason" },
];

// Updated CancelOrderModal with dropdown
const CancelOrderModal = ({ isOpen, onClose, onSubmit, isSubmitting }) => {
  const [reasonCode, setReasonCode] = useState("");
  const [comment, setComment] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-md p-6 space-y-6 shadow-2xl rounded-sm max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h3 className="font-heading font-bold text-xl">Cancel Your Order</h3>
          <button onClick={onClose} className="p-1 hover:bg-neutral-dark/5 rounded-full transition-colors">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-4 font-body">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Reason for Cancellation</label>
            <select 
              className="w-full p-3 text-sm border border-neutral-dark/10 rounded-sm focus:outline-none focus:border-primary bg-white cursor-pointer"
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
            >
              <option value="">Select a reason...</option>
              {CANCELLATION_REASONS.map(r => (
                <option key={r.code} value={r.code}>{r.label}</option>
              ))}
            </select>
          </div>

          {reasonCode === 'other_personal_reason' && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Additional Comments (Optional)</label>
              <textarea
                className="w-full h-24 p-3 text-sm border border-neutral-dark/10 rounded-sm focus:outline-none focus:border-primary resize-none"
                placeholder="Tell us more..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-neutral-dark/5">
          <Button 
            variant="outline" 
            className="w-full min-h-12 h-auto py-3 order-2 sm:order-1" 
            onClick={onClose}
          >
            Keep Order
          </Button>
          <Button 
            className="w-full min-h-12 h-auto bg-rose-600 hover:bg-rose-700 text-white whitespace-normal py-3 px-4 leading-tight order-1 sm:order-2" 
            disabled={isSubmitting || !reasonCode} 
            onClick={() => onSubmit({ reasonCode, comment })}
          >
            {isSubmitting ? "Cancelling..." : "Confirm Cancellation"}
          </Button>
        </div>
      </Card>
    </div>
  );
};

function Dashboard() {
  const [activeTab, setActiveTab] = useState("profile");
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: EMPTY_ADDRESS });
  const [previewImage, setPreviewImage] = useState("");
  const [processingPayment, setProcessingPayment] = useState(null);
  
  // Cancellation state
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const email = localStorage.getItem("email");
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const [profRes, orderRes] = await Promise.all([
        apiFetchJson(`/auth/profile/${encodeURIComponent(email)}`),
        apiFetchJson(`/orders/my?email=${encodeURIComponent(email)}`)
      ]);

      if (profRes.response.ok) {
        setUser(profRes.data);
        setForm({
          name: profRes.data.name || "",
          phone: profRes.data.phone || "",
          address: profRes.data.address || EMPTY_ADDRESS
        });
      }
      if (orderRes.response.ok) setOrders(orderRes.data);
    } catch (err) {
      showToast("Failed to load dashboard data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!email) {
      navigate("/login");
      return;
    }
    loadData();
  }, [email, navigate]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const { response, data } = await apiFetchJson(`/auth/profile/${encodeURIComponent(email)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (response.ok) {
        setUser(data);
        setIsEditing(false);
        showToast("Profile updated", "success");
      }
    } catch (err) {
      showToast("Update failed", "error");
    }
  };

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayAdvance = async (order) => {
    try {
      setProcessingPayment(order._id);
      const res = await loadRazorpay();
      if (!res) {
        showToast("Razorpay SDK failed to load", "error");
        return;
      }

      const { response: orderRes, data: orderData } = await apiFetchJson("/payment/custom-advance", {
        method: "POST",
        body: JSON.stringify({ email, orderId: order._id })
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
            const { response: verifyRes } = await apiFetchJson("/payment/verify", {
              method: "POST",
              body: JSON.stringify({
                email,
                internalOrderId: orderData.internalOrderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              })
            });

            if (verifyRes.ok) {
              showToast("Advance payment successful!", "success");
              loadData();
            } else {
              showToast("Payment verification failed", "error");
            }
          } catch (err) {
            showToast("Error verifying payment", "error");
          }
        },
        prefill: orderData.prefill,
        theme: { color: "#4A5D4E" }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      showToast("An error occurred", "error");
    } finally {
      setProcessingPayment(null);
    }
  };

  const handleCancelOrder = async ({ reasonCode, comment }) => {
    if (!cancellingOrderId) return;
    
    try {
      setIsCancelling(true);
      const selectedReason = CANCELLATION_REASONS.find(r => r.code === reasonCode)?.label || reasonCode;
      const finalReason = comment ? `${selectedReason}: ${comment}` : selectedReason;

      const { response, data } = await apiFetchJson(`/orders/${cancellingOrderId}/cancel`, {
        method: "PUT",
        body: JSON.stringify({ 
          email, 
          reasonCode, 
          cancellationReasonCode: reasonCode, 
          cancellationReason: finalReason 
        })
      });

      if (response.ok) {
        showToast("Order cancelled successfully", "success");
        setCancellingOrderId(null);
        loadData(); // Refresh orders
      } else {
        showToast(data.message || "Cancellation failed", "error");
      }
    } catch (err) {
      showToast("An error occurred", "error");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  if (loading) return <div className="py-32 text-center">Loading dashboard...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-8 md:space-y-12 pb-20 pt-24">
      <header className="space-y-4 px-2 md:px-0">
        <h1 className="text-3xl md:text-5xl font-heading font-bold">Hello, {user?.name || 'Artisan'}</h1>
        <p className="text-neutral-dark/40 font-body text-sm md:text-base">Manage your account and track your artisanal pieces.</p>
      </header>

      <div className="flex flex-col md:flex-row gap-8 md:gap-16">
        <UserSidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />

        <div className="grow space-y-8 animate-in fade-in duration-300 overflow-hidden">
          {activeTab === 'profile' && (
            <Card className="p-4 md:p-8 border-none bg-white shadow-sm rounded-sm space-y-6 md:space-y-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl md:text-2xl font-heading font-bold">Account Information</h2>
                {!isEditing && <Button variant="outline" onClick={() => setIsEditing(true)} className="w-full sm:w-auto">Edit Profile</Button>}
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-6 md:space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Full Name</label>
                    {isEditing ? <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /> : <p className="font-body font-bold">{user?.name || '-'}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Email Address</label>
                    <p className="font-body font-bold text-neutral-dark/40 italic">{user?.email}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Phone Number</label>
                    {isEditing ? <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /> : <p className="font-body font-bold">{user?.phone || '-'}</p>}
                  </div>
                </div>

                <div className="space-y-4 border-t border-neutral-dark/5 pt-8">
                  <h3 className="font-heading text-lg font-bold">Delivery Address</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Address Line</label>
                      {isEditing ? <Input value={form.address.line1} onChange={e => setForm({...form, address: {...form.address, line1: e.target.value}})} /> : <p className="font-body text-sm text-neutral-dark/60">{user?.address?.line1 || '-'}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Village / Town</label>
                      {isEditing ? <Input value={form.address.villageTown} onChange={e => setForm({...form, address: {...form.address, villageTown: e.target.value}})} /> : <p className="font-body text-sm text-neutral-dark/60">{user?.address?.villageTown || '-'}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">State</label>
                      {isEditing ? <Input value={form.address.state} onChange={e => setForm({...form, address: {...form.address, state: e.target.value}})} /> : <p className="font-body text-sm text-neutral-dark/60">{user?.address?.state || '-'}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Pincode</label>
                      {isEditing ? <Input value={form.address.pincode} onChange={e => setForm({...form, address: {...form.address, pincode: e.target.value}})} /> : <p className="font-body text-sm text-neutral-dark/60">{user?.address?.pincode || '-'}</p>}
                    </div>
                  </div>
                </div>

                {isEditing && (
                  <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-4">
                    <Button type="submit" className="w-full sm:w-auto h-12 md:h-14 rounded-xl md:rounded-sm shadow-lg md:shadow-none">Save Changes</Button>
                    <Button variant="outline" type="button" className="w-full sm:w-auto h-12 md:h-14 rounded-xl md:rounded-sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                  </div>
                )}
              </form>
            </Card>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-heading font-bold">Your Orders</h2>
              {orders.map((order) => {
                const paidNow = Number(order.paidNowAmount || 0);
                const total = Number(order.totalAmount || 0);
                const remainingAmount = Math.max(total - paidNow, 0);
                const isCancellable = !["Delivered", "Cancelled", "Shipped", "Out for Delivery"].includes(order.status);

                return (
                <Card key={order._id} className="p-4 md:p-8 border-none bg-white shadow-sm rounded-sm space-y-6 overflow-hidden">
                  <div className="flex flex-col md:flex-row gap-6">
                    <img src={mediaUrl(order.productImage)} className="w-20 h-28 object-cover rounded-sm bg-neutral-cream shrink-0" alt="" />
                    <div className="grow space-y-2 min-w-0">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                        <div className="space-y-1 min-w-0">
                          <h3 className="font-heading text-lg font-bold flex items-center gap-2">
                            <span className="truncate">{order.productName}</span>
                            {order.isCustom && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase tracking-tighter font-bold shrink-0">Custom</span>}
                          </h3>
                          <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-neutral-dark/40">#{order.orderCode} • Placed {new Date(order.createdAt).toLocaleDateString()}</p>
                        </div>
                        <span className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shrink-0 ${
                          order.status === 'Delivered' ? 'bg-emerald-50 text-emerald-600' : 
                          order.status === 'Cancelled' ? 'bg-rose-50 text-rose-600' :
                          'bg-primary/5 text-primary'
                        }`}>{order.status}</span>
                      </div>
                      
                      <div className="flex flex-col md:flex-row justify-between items-end gap-4 pt-2">
                        <div className="space-y-2 w-full min-w-0">
                          <p className="font-body font-bold text-primary text-xl">₹{Number(order.totalAmount).toLocaleString()}</p>
                          {order.isCustom && order.customDetails && (
                            <div className="p-4 bg-neutral-cream rounded-sm space-y-1">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/50">Your Custom Request</p>
                              <p className="text-sm italic text-neutral-dark/70 break-words font-body">"{order.customDetails}"</p>
                            </div>
                          )}
                          {order.isCustom && order.customStatus && (
                            <div className="p-4 bg-primary/5 border-l-4 border-primary rounded-r-sm space-y-1">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Artisan's Note</p>
                              <p className="text-sm italic text-neutral-dark/70 font-body break-words">"{order.customStatus}"</p>
                            </div>
                          )}
                          {order.isCustom && order.isAdvancePaid && order.status !== "Delivered" && (
                            <p className="text-xs font-bold uppercase tracking-widest text-neutral-dark/50">
                              Remaining At Delivery: ₹{remainingAmount.toLocaleString()}
                            </p>
                          )}
                          {order.isCustom && order.status === "Delivered" && (
                            <p className="text-xs font-bold uppercase tracking-widest text-neutral-dark/50 truncate">
                              {order.paymentStatus === "paid"
                                ? "Payment Completed"
                                : `Remaining Payable On Delivery: ₹${remainingAmount.toLocaleString()}`}
                            </p>
                          )}
                          {order.status === "Cancelled" && order.cancellationReason && (
                            <div className="p-4 bg-rose-50 border-l-4 border-rose-500 rounded-r-sm space-y-1">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-rose-600">Cancellation Reason</p>
                              <p className="text-sm italic text-neutral-dark/70 font-body break-words">"{order.cancellationReason}"</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
                          {order.status === "Advance Payment Requested" && !order.isAdvancePaid && (
                            <Button 
                              className="h-12 px-8" 
                              onClick={() => handlePayAdvance(order)}
                              disabled={processingPayment === order._id}
                            >
                              <CreditCardIcon className="w-5 h-5 mr-2" />
                              {processingPayment === order._id ? "Processing..." : `Pay Advance ₹${order.advanceAmount?.toLocaleString()}`}
                            </Button>
                          )}
                          
                          {isCancellable && (
                            <Button 
                              variant="outline"
                              className="h-12 px-8 text-rose-600 border-rose-100 hover:bg-rose-50 hover:text-rose-700 whitespace-nowrap"
                              onClick={() => setCancellingOrderId(order._id)}
                            >
                              <XMarkIcon className="w-5 h-5 mr-2" />
                              Cancel Order
                            </Button>
                          )}
                        </div>

                        {order.isAdvancePaid && order.status !== "Delivered" && order.status !== "Cancelled" && (
                          <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-widest shrink-0">
                            <CreditCardIcon className="w-4 h-4" /> Advance Paid
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="pt-6 border-t border-neutral-dark/5 overflow-x-auto scrollbar-hide">
                    <OrderTimeline status={order.status} compact isCustom={Boolean(order.isCustom)} />
                  </div>
                </Card>
                );
              })}
              {orders.length === 0 && (
                <div className="py-20 text-center bg-neutral-cream rounded-sm italic text-neutral-dark/40">
                  No orders yet.
                </div>
              )}
            </div>
          )}

          {/* Mobile Only Logout */}
          <div className="md:hidden flex justify-center pt-8">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout} 
              className="text-accent border-accent/20 h-10 px-6 rounded-xl text-[10px] font-bold uppercase tracking-widest"
            >
              <ArrowLeftOnRectangleIcon className="w-4 h-4 mr-2" />
              Logout Account
            </Button>
          </div>
        </div>
      </div>
      
      <CancelOrderModal 
        isOpen={Boolean(cancellingOrderId)} 
        onClose={() => setCancellingOrderId(null)}
        onSubmit={handleCancelOrder}
        isSubmitting={isCancelling}
      />

      <ImageLightbox isOpen={!!previewImage} imageSrc={previewImage} onClose={() => setPreviewImage("")} />
    </div>
  );
}

export default Dashboard;
