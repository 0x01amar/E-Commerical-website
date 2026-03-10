import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../config/api";

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
    navigate("/login");
  };

  if (!email) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-slate-600">You are not logged in.</p>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="p-6 text-slate-600">Loading profile...</div>;
  }

  if (!user) {
    return <div className="p-6 text-rose-600">{error || "User not found"}</div>;
  }

  const displayPhoto = photoPreview || user.photo || "https://placehold.co/160x160?text=Photo";
  const displayAddress = formatAddress(form.address) || "-";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-slate-900">User Dashboard</h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Back to Home
          </button>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600"
          >
            Logout
          </button>
        </div>
      </div>

      {error ? <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Profile</h2>

        <div className="mt-5 flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center">
          <img
            src={displayPhoto}
            alt={user.name || "User profile"}
            className="h-24 w-24 rounded-full border border-slate-200 object-cover"
          />
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Profile Photo</p>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
            />
            <p className="text-xs text-slate-500">Choose a photo and click Save Changes.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-sm text-slate-500">Name</p>
            {isEditing ? (
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-400"
              />
            ) : (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800">{user.name || "-"}</p>
            )}
          </div>

          <div>
            <p className="mb-1 text-sm text-slate-500">Phone</p>
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-400"
              />
            ) : (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800">{user.phone || "-"}</p>
            )}
          </div>

          <div className="sm:col-span-2">
            <p className="mb-1 text-sm text-slate-500">Email</p>
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800">{user.email}</p>
          </div>

          <div className="sm:col-span-2">
            <p className="mb-1 text-sm text-slate-500">Address</p>
            {isEditing ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={form.address.line1}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      address: {
                        ...prev.address,
                        line1: event.target.value,
                      },
                    }))
                  }
                  placeholder="Address line"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-400"
                />
                <input
                  value={form.address.landmark}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      address: {
                        ...prev.address,
                        landmark: event.target.value,
                      },
                    }))
                  }
                  placeholder="Landmark"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-400"
                />
                <input
                  value={form.address.villageTown}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      address: {
                        ...prev.address,
                        villageTown: event.target.value,
                      },
                    }))
                  }
                  placeholder="Village/Town"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-400"
                />
                <input
                  value={form.address.wardNo}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      address: {
                        ...prev.address,
                        wardNo: event.target.value,
                      },
                    }))
                  }
                  placeholder="Ward No"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-400"
                />
                <input
                  value={form.address.district}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      address: {
                        ...prev.address,
                        district: event.target.value,
                      },
                    }))
                  }
                  placeholder="District"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-400"
                />
                <input
                  value={form.address.state}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      address: {
                        ...prev.address,
                        state: event.target.value,
                      },
                    }))
                  }
                  placeholder="State"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-400"
                />
                <input
                  value={form.address.pincode}
                  maxLength={6}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      address: {
                        ...prev.address,
                        pincode: event.target.value.replace(/[^0-9]/g, ""),
                      },
                    }))
                  }
                  placeholder="Pincode"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-400"
                />
              </div>
            ) : (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800">{displayAddress}</p>
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
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Changes"}
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
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-400"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Order Status Tracking</h2>
        {ordersLoading ? <p className="mt-4 text-sm text-slate-600">Loading orders...</p> : null}
        {ordersError ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{ordersError}</p> : null}

        {!ordersLoading && !ordersError ? (
          orders.length ? (
            <div className="mt-4 space-y-3">
              {orders.map((order) => (
                <div key={order._id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-semibold text-slate-900">{order.productName}</p>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">Order ID: {order.orderCode}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Qty: {order.quantity} • Total: ₹{Number(order.totalAmount || 0).toFixed(2)} • Payment: {order.paymentOption === "half" ? "Half Payment" : "COD"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">Expected delivery: {order.expectedDelivery}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-600">No orders yet.</p>
          )
        ) : null}
      </div>
    </div>
  );

}

export default Dashboard;