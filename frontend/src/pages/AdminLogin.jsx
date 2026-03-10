import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../config/api";

function AdminLogin() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (event) => {

    event.preventDefault();

    try {
      if (!email.trim() || !password || !adminKey.trim()) {
        setError("Email, password and admin key are required");
        return;
      }

      setLoading(true);
      setError("");

      const response = await fetch(apiUrl("/auth/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          adminKey: adminKey.trim(),
          asAdmin: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Invalid admin credentials");
      }

      localStorage.setItem("email", data?.user?.email || email.trim().toLowerCase());
        localStorage.setItem("role", data?.role || "admin");
        localStorage.setItem("adminKey", adminKey.trim());
      navigate("/admin-dashboard");
    } catch (loginError) {
      setError(loginError.message || "Invalid admin credentials");
    } finally {
      setLoading(false);
    }

  };

  return(

    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-100 via-slate-200 to-slate-300 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-slate-900">Admin Login</h1>
        <p className="mt-2 text-sm text-slate-600">Login with email, password and admin key.</p>

        {error ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p> : null}

        <form onSubmit={handleLogin} className="mt-5 space-y-4">
          <input
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-slate-500"
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 pr-16 text-sm outline-none transition focus:border-slate-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-3 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <input
            type="password"
            placeholder="Admin Key"
            value={adminKey}
            onChange={(event) => setAdminKey(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-slate-500"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );

}

export default AdminLogin;