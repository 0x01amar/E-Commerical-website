import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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
        const response = await fetch(`http://localhost:5000/api/auth/profile/${email}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message || "Failed to load profile");
        }

        setUser(data);
        setForm({
          name: data?.name || "",
          phone: data?.phone || "",
          address: data?.address || "",
        });
        setError("");
      } catch (loadError) {
        setError(loadError.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    loadUser();

  }, [email]);

  const updateProfile = async () => {
    try {
      if (form.phone && !/^\d{10}$/.test(form.phone)) {
        setError("Phone number must be exactly 10 digits");
        return;
      }

      setSaving(true);
      setError("");

      const response = await fetch(`http://localhost:5000/api/auth/profile/${email}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to update profile");
      }

      setUser(data);
      setIsEditing(false);
    } catch (updateError) {
      setError(updateError.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("email");
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">User Dashboard</h1>
        <button
          type="button"
          onClick={logout}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Logout
        </button>
      </div>

      {error ? <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Profile</h2>

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
              <textarea
                value={form.address}
                onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-400"
              />
            ) : (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800">{user.address || "-"}</p>
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
                    address: user?.address || "",
                  });
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
    </div>
  );

}

export default Dashboard;