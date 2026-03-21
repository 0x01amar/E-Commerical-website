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
import { CreditCardIcon, ArrowLeftOnRectangleIcon } from "@heroicons/react/24/outline";

const EMPTY_ADDRESS = {
  line1: "", landmark: "", villageTown: "", wardNo: "",
  district: "", state: "", pincode: "", fullAddress: ""
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

        <div className="grow space-y-8 animate-in fade-in duration-300">
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

                return (
                <Card key={order._id} className="p-4 md:p-8 border-none bg-white shadow-sm rounded-sm space-y-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    <img src={mediaUrl(order.productImage)} className="w-20 h-28 object-cover rounded-sm bg-neutral-cream" alt="" />
                    <div className="grow space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h3 className="font-heading text-lg font-bold flex items-center gap-2">
                            {order.productName}
                            {order.isCustom && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase tracking-tighter font-bold">Custom Piece</span>}
                          </h3>
                          <p className="text-xs font-bold uppercase tracking-widest text-neutral-dark/40">#{order.orderCode} • Placed {new Date(order.createdAt).toLocaleDateString()}</p>
                        </div>
                        <span className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                          order.status === 'Delivered' ? 'bg-emerald-50 text-emerald-600' : 'bg-primary/5 text-primary'
                        }`}>{order.status}</span>
                      </div>
                      
                      <div className="flex flex-col md:flex-row justify-between items-end gap-4 pt-2">
                        <div className="space-y-2 w-full">
                          <p className="font-body font-bold text-primary text-xl">₹{Number(order.totalAmount).toLocaleString()}</p>
                          {order.isCustom && order.customDetails && (
                            <div className="p-4 bg-neutral-cream rounded-sm space-y-1">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/50">Your Custom Request</p>
                              <p className="text-sm italic text-neutral-dark/70">"{order.customDetails}"</p>
                            </div>
                          )}
                          {order.isCustom && order.customStatus && (
                            <div className="p-4 bg-primary/5 border-l-4 border-primary rounded-r-sm space-y-1">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Artisan's Note</p>
                              <p className="text-sm italic text-neutral-dark/70 font-body">"{order.customStatus}"</p>
                            </div>
                          )}
                          {order.isCustom && order.isAdvancePaid && order.status !== "Delivered" && (
                            <p className="text-xs font-bold uppercase tracking-widest text-neutral-dark/50">
                              Remaining At Delivery: ₹{remainingAmount.toLocaleString()}
                            </p>
                          )}
                          {order.isCustom && order.status === "Delivered" && (
                            <p className="text-xs font-bold uppercase tracking-widest text-neutral-dark/50">
                              {order.paymentStatus === "paid"
                                ? "Payment Completed"
                                : `Remaining Payable On Delivery: ₹${remainingAmount.toLocaleString()}`}
                            </p>
                          )}
                        </div>
                        
                        {order.status === "Advance Payment Requested" && !order.isAdvancePaid && (
                          <Button 
                            className="w-full md:w-auto h-12 px-8" 
                            onClick={() => handlePayAdvance(order)}
                            disabled={processingPayment === order._id}
                          >
                            <CreditCardIcon className="w-5 h-5 mr-2" />
                            {processingPayment === order._id ? "Processing..." : `Pay Advance ₹${order.advanceAmount?.toLocaleString()}`}
                          </Button>
                        )}
                        {order.isAdvancePaid && order.status !== "Delivered" && (
                          <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-widest">
                            <CreditCardIcon className="w-4 h-4" /> Advance Paid
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="pt-6 border-t border-neutral-dark/5 overflow-x-auto">
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
      <ImageLightbox isOpen={!!previewImage} imageSrc={previewImage} onClose={() => setPreviewImage("")} />
    </div>
  );
}

export default Dashboard;
