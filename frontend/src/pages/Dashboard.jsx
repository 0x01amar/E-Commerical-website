import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import OrderTimeline from "../components/OrderTimeline";
import { apiFetchJson, mediaUrl, resolveApiErrorMessage } from "../config/api";
import ImageLightbox from "../components/ImageLightbox";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import UserSidebar from "./user/UserSidebar";
import { showToast } from "../config/toast";

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

  const email = localStorage.getItem("email");
  const navigate = useNavigate();

  useEffect(() => {
    if (!email) {
      navigate("/login");
      return;
    }

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

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  if (loading) return <div className="py-32 text-center">Loading dashboard...</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 space-y-12 pb-20 pt-24">
      <header className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-heading font-bold">Hello, {user?.name || 'Artisan'}</h1>
        <p className="text-neutral-dark/40 font-body">Manage your account and track your artisanal pieces.</p>
      </header>

      <div className="flex flex-col md:flex-row gap-16">
        <UserSidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />

        <div className="flex-grow space-y-8 animate-in fade-in slide-in-from-bottom duration-700">
          {activeTab === 'profile' && (
            <Card className="p-8 border-none bg-white shadow-sm rounded-sm space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-heading font-bold">Account Information</h2>
                {!isEditing && <Button variant="outline" onClick={() => setIsEditing(true)}>Edit Profile</Button>}
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <div className="flex gap-4 pt-4">
                    <Button type="submit">Save Changes</Button>
                    <Button variant="outline" type="button" onClick={() => setIsEditing(false)}>Cancel</Button>
                  </div>
                )}
              </form>
            </Card>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-heading font-bold">Your Orders</h2>
              {orders.map((order) => (
                <Card key={order._id} className="p-8 border-none bg-white shadow-sm rounded-sm space-y-6">
                  <div className="flex gap-6">
                    <img src={mediaUrl(order.productImage)} className="w-20 h-28 object-cover rounded-sm bg-neutral-cream" alt="" />
                    <div className="flex-grow space-y-2">
                      <div className="flex justify-between items-start">
                        <h3 className="font-heading text-lg font-bold">{order.productName}</h3>
                        <span className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                          order.status === 'Delivered' ? 'bg-emerald-50 text-emerald-600' : 'bg-primary/5 text-primary'
                        }`}>{order.status}</span>
                      </div>
                      <p className="text-xs font-bold uppercase tracking-widest text-neutral-dark/40">#{order.orderCode} • Placed {new Date(order.createdAt).toLocaleDateString()}</p>
                      <p className="font-body font-bold text-primary">₹{Number(order.totalAmount).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="pt-6 border-t border-neutral-dark/5 overflow-x-auto">
                    <OrderTimeline status={order.status} compact />
                  </div>
                </Card>
              ))}
              {orders.length === 0 && (
                <div className="py-20 text-center bg-neutral-cream rounded-sm italic text-neutral-dark/40">
                  No orders yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <ImageLightbox isOpen={!!previewImage} imageSrc={previewImage} onClose={() => setPreviewImage("")} />
    </div>
  );
}

export default Dashboard;
