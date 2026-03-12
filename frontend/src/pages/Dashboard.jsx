import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import OrderTimeline from "../components/OrderTimeline";
import { apiUrl, mediaUrl } from "../config/api";

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

const getStatusClasses = (status = "") => {
  if (status === "Delivered") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "Cancelled") {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-amber-100 text-amber-700";
};

function Dashboard() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: EMPTY_ADDRESS,
    photo: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState("");
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");

  const email = localStorage.getItem("email");
  const navigate = useNavigate();

  useEffect(() => {

    if (!email) {
      setLoading(false);
      return;
    }

    const loadUser = async () => {
      try {
        setLoading(true);
        const response = await fetch(apiUrl(`/auth/profile/${encodeURIComponent(email)}`));
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message || "Failed to load profile");
        }

        setUser(data);
        const normalizedAddress = normalizeAddress(data?.address || data?.addressText || {});

        setForm({
          name: data?.name || "",
          phone: data?.phone || "",
          address: normalizedAddress,
          photo: data?.photo || "",
        });
        setPhotoPreview(data?.photo || "");
        setError("");
      } catch (loadError) {
        setError(loadError.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    loadUser();

  }, [email]);

  useEffect(() => {
    if (!email) {
      setOrdersLoading(false);
      return;
    }

    const loadOrders = async () => {
      try {
        setOrdersLoading(true);
        const response = await fetch(apiUrl(`/orders/my?email=${encodeURIComponent(email)}`));
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message || "Failed to load orders");
        }

        setOrders(Array.isArray(data) ? data : []);
        setOrdersError("");
      } catch (loadError) {
        setOrdersError(loadError.message || "Failed to load orders");
      } finally {
        setOrdersLoading(false);
      }
    };

    loadOrders();
  }, [email]);

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const encodedPhoto = String(reader.result || "");

      if (!encodedPhoto) {
        return;
      }

      setForm((prev) => ({
        ...prev,
        photo: encodedPhoto,
      }));
      setPhotoPreview(encodedPhoto);
      setIsEditing(true);
      setError("");
    };

    reader.readAsDataURL(file);
  };

  const updateProfile = async () => {
    try {
      if (form.phone && !/^\d{10}$/.test(form.phone)) {
        setError("Phone number must be exactly 10 digits");
        return;
      }

      setSaving(true);
      setError("");

      const response = await fetch(apiUrl(`/auth/profile/${encodeURIComponent(email)}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          address: {
            ...form.address,
            fullAddress: formatAddress(form.address),
          },
          photo: form.photo,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to update profile");
      }

      setUser(data);
      setForm((prev) => ({
        ...prev,
        address: normalizeAddress(data?.address || prev.address),
      }));
      setPhotoPreview(data?.photo || "");
      setIsEditing(false);
    } catch (updateError) {
      setError(updateError.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("email");
    localStorage.removeItem("role");
    localStorage.removeItem("adminKey");
    localStorage.removeItem("cartItems");
    navigate("/");
  };

  if (!email) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="glass rounded-2xl p-8 text-center">
          <p style={{ color: "#3a5470" }}>You are not logged in.</p>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="mt-4 btn-neon"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-8">
        <div className="h-5 w-5 rounded-full animate-spin" style={{ border: "2px solid rgba(2,132,199,0.18)", borderTopColor: "#0284c7" }} />
        <p style={{ color: "#3a5470" }}>Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#dc2626" }}>
        {error || "User not found"}
      </div>
    );
  }

  const displayPhoto = photoPreview || user.photo || "https://placehold.co/160x160/dce8f5/0284c7?text=U";
  const displayAddress = formatAddress(form.address) || "-";

  return (
    <div className="space-y-6">
      {/* Hero */}
        <div
          className="hero-dark rounded-3xl p-6 sm:p-8"
        >
          <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#0284c7" }}>👤 User Portal</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl" style={{ color: "#1a2f48" }}>Your Dashboard</h1>
          <p className="mt-1 text-sm" style={{ color: "#3a5470" }}>Manage your profile and track your orders</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded-full px-4 py-2 text-sm font-semibold transition-all duration-250 hover:scale-105"
              style={{ background: "rgba(2,132,199,0.10)", border: "1px solid rgba(2,132,199,0.25)", color: "#0284c7" }}
          >
            Browse Products
          </button>
          <button
            type="button"
            onClick={logout}
            className="rounded-full px-4 py-2 text-sm font-semibold transition-all duration-250 hover:scale-105"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", color: "#dc2626" }}
          >
            Logout
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#dc2626" }}>
          {error}
        </p>
      ) : null}

        <div className="glass rounded-2xl p-6">
          <h2 className="text-xl font-semibold" style={{ color: "#1a2f48" }}>Profile</h2>

        <div
          className="mt-5 flex flex-col gap-4 rounded-xl p-4 sm:flex-row sm:items-center"
            style={{ background: "rgba(240,248,255,0.78)", border: "1px solid rgba(2,132,199,0.14)" }}
        >
          <img
            src={displayPhoto}
            alt={user.name || "User profile"}
            className="h-24 w-24 rounded-full object-cover"
              style={{ border: "2px solid rgba(2,132,199,0.24)", boxShadow: "0 10px 24px rgba(2,132,199,0.10)" }}
          />
          <div className="space-y-2">
              <p className="text-sm font-medium" style={{ color: "#3a5470" }}>Profile Photo</p>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="block w-full text-sm"
                style={{ color: "#3a5470" }}
            />
              <p className="text-xs" style={{ color: "#6080a0" }}>Choose a photo and click Save Changes.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
              <p className="mb-1 text-xs font-medium" style={{ color: "#6080a0" }}>Name</p>
            {isEditing ? (
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="input-dark"
              />
            ) : (
                <p className="rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(255,255,255,0.85)", border: "1px solid rgba(100,160,220,0.22)", color: "#1a2f48" }}>{user.name || "-"}</p>
            )}
          </div>

          <div>
              <p className="mb-1 text-xs font-medium" style={{ color: "#6080a0" }}>Phone</p>
            {isEditing ? (
              <input
                value={form.phone}
                maxLength={10}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    phone: event.target.value.replace(/[^0-9]/g, ""),
                  }))
                }
                className="input-dark"
              />
            ) : (
                <p className="rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(255,255,255,0.85)", border: "1px solid rgba(100,160,220,0.22)", color: "#1a2f48" }}>{user.phone || "-"}</p>
            )}
          </div>

          <div className="sm:col-span-2">
              <p className="mb-1 text-xs font-medium" style={{ color: "#6080a0" }}>Email</p>
              <p className="rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(255,255,255,0.85)", border: "1px solid rgba(100,160,220,0.22)", color: "#3a5470" }}>{user.email}</p>
          </div>

          <div className="sm:col-span-2">
              <p className="mb-1 text-xs font-medium" style={{ color: "#6080a0" }}>Address</p>
            {isEditing ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[["line1","Address line"],["landmark","Landmark"],["villageTown","Village/Town"],["wardNo","Ward No"],["district","District"],["state","State"],["pincode","Pincode",6]].map(([field, ph, maxLen]) => (
                  <input
                    key={field}
                    value={form.address[field]}
                    maxLength={maxLen || 100}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, address: { ...prev.address, [field]: field === "pincode" ? event.target.value.replace(/[^0-9]/g,"") : event.target.value } }))
                    }
                    placeholder={ph}
                    className="input-dark"
                  />
                ))}
              </div>
            ) : (
                <p className="rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(255,255,255,0.85)", border: "1px solid rgba(100,160,220,0.22)", color: "#3a5470" }}>{displayAddress}</p>
            )}
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={updateProfile}
                disabled={saving}
                className="btn-neon disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "✓ Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setForm({
                    name: user?.name || "",
                    phone: user?.phone || "",
                    address: normalizeAddress(user?.address || {}),
                    photo: user?.photo || "",
                  });
                  setPhotoPreview(user?.photo || "");
                }}
                className="btn-ghost"
              >
                ✕ Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-250 hover:scale-105"
                style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.26)", color: "#b45309" }}
            >
              ✏️ Edit Profile
            </button>
          )}
        </div>
      </div>

        <div className="glass rounded-2xl p-6">
          <h2 className="text-xl font-semibold" style={{ color: "#1a2f48" }}>📦 My Orders</h2>
        {ordersLoading ? (
          <div className="flex items-center gap-3 mt-4">
              <div className="h-4 w-4 rounded-full animate-spin" style={{ border: "2px solid rgba(2,132,199,0.18)", borderTopColor: "#0284c7" }} />
              <p className="text-sm" style={{ color: "#3a5470" }}>Loading orders...</p>
          </div>
        ) : null}
        {ordersError ? (
            <p className="mt-4 rounded-xl px-3 py-2 text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#dc2626" }}>
            {ordersError}
          </p>
        ) : null}

        {!ordersLoading && !ordersError ? (
          orders.length ? (
            <div className="mt-4 space-y-4">
              {orders.map((order) => (
                <div
                  key={order._id}
                  className="glass-hover rounded-xl p-4"
                    style={{ background: "rgba(255,255,255,0.78)", border: "1px solid rgba(100,160,220,0.22)" }}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-3">
                      <img
                          src={order.productImage ? mediaUrl(order.productImage) : "https://placehold.co/160x110/dce8f5/0284c7?text=No+Image"}
                        alt={order.productName}
                        className="h-16 w-20 rounded-lg object-cover shrink-0"
                          style={{ border: "1px solid rgba(100,160,220,0.22)" }}
                          onError={(e) => { e.target.src = "https://placehold.co/160x110/dce8f5/0284c7?text=No+Image"; }}
                      />
                      <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold" style={{ color: "#1a2f48" }}>{order.productName}</p>
                          <p className="mt-0.5 text-xs" style={{ color: "#3a5470" }}>
                            ID: <span style={{ color: "#0284c7" }}>{order.orderCode}</span>
                        </p>
                          <p className="mt-0.5 text-xs" style={{ color: "#3a5470" }}>
                          Qty: {order.quantity} • ₹{Number(order.totalAmount || 0).toFixed(2)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <span className="rounded-lg px-2 py-0.5 text-xs font-medium" style={{ background: "rgba(37,99,235,0.10)", border: "1px solid rgba(37,99,235,0.20)", color: "#2563eb" }}>
                            📅 {new Date(order.createdAt).toLocaleDateString()}
                          </span>
                            <span className="rounded-lg px-2 py-0.5 text-xs font-medium" style={{ background: "rgba(13,148,136,0.10)", border: "1px solid rgba(13,148,136,0.22)", color: "#0f766e" }}>
                            🚚 {order.expectedDelivery}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{
                          background: order.status === "Delivered" ? "rgba(20,184,166,0.15)" : order.status === "Cancelled" ? "rgba(239,68,68,0.12)" : "rgba(251,191,36,0.12)",
                          border: order.status === "Delivered" ? "1px solid rgba(20,184,166,0.3)" : order.status === "Cancelled" ? "1px solid rgba(239,68,68,0.25)" : "1px solid rgba(251,191,36,0.25)",
                            color: order.status === "Delivered" ? "#0f766e" : order.status === "Cancelled" ? "#dc2626" : "#b45309",
                        }}
                      >
                        {order.status}
                      </span>
                      {order.productId ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/product/${order.productId}`)}
                          className="btn-ghost text-xs px-3 py-1.5"
                        >
                          View
                        </button>
                      ) : null}
                      {order.status !== "Delivered" && order.status !== "Cancelled" ? (
                        <button
                          type="button"
                          onClick={() => window.confirm("Cancel this order?")}
                          className="btn-danger text-xs px-3 py-1.5"
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div
                    className="mt-3 rounded-xl p-3"
                      style={{ background: "rgba(240,248,255,0.72)", border: "1px solid rgba(100,160,220,0.18)" }}
                  >
                    <OrderTimeline status={order.status} compact />
                  </div>

                    <p className="mt-2 text-xs" style={{ color: "#3a5470" }}>
                    Payment: {order.paymentOption === "half" ? "Half Payment" : "Cash on Delivery"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 text-center">
                <p className="text-sm" style={{ color: "#3a5470" }}>No orders yet.</p>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="mt-3 btn-neon text-xs"
              >
                Start Shopping
              </button>
            </div>
          )
        ) : null}
      </div>
    </div>
  );

}

export default Dashboard;