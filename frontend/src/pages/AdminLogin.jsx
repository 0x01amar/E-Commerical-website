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
    <div
      className="flex min-h-screen items-center justify-center px-4 py-10"
      style={{
        background: "radial-gradient(ellipse at 70% 20%, rgba(168,85,247,0.08) 0%, transparent 50%), radial-gradient(ellipse at 30% 80%, rgba(0,212,255,0.06) 0%, transparent 50%)",
      }}
    >
      <div
        className="w-full max-w-md rounded-3xl p-6 sm:p-8"
        style={{
          background: "rgba(255,255,255,0.11)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(168,85,247,0.3)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.35), 0 0 60px rgba(168,85,247,0.07)",
        }}
      >
        <div className="mb-1 text-xs uppercase tracking-widest font-semibold" style={{ color: "#c084fc" }}>Admin Portal</div>
        <h1 className="text-2xl font-bold" style={{ color: "#f1f5f9" }}>Admin Login</h1>
        <p className="mt-1 text-sm" style={{ color: "#94a3b8" }}>Login with email, password and admin key.</p>

        {error ? (
          <p className="mt-4 rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
            {error}
          </p>
        ) : null}

        <form onSubmit={handleLogin} className="mt-5 space-y-4">
          <input
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="input-dark"
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input-dark pr-14"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-3 text-xs font-semibold transition-colors"
              style={{ color: "#c084fc" }}
              onMouseEnter={e => e.currentTarget.style.color = "#e879f9"}
              onMouseLeave={e => e.currentTarget.style.color = "#c084fc"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <input
            type="password"
            placeholder="Admin Key"
            value={adminKey}
            onChange={(event) => setAdminKey(event.target.value)}
            className="input-dark"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-2.5 text-sm font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, #a855f7, #00d4ff)",
              color: "#fff",
              boxShadow: "0 4px 15px rgba(168,85,247,0.3)",
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 25px rgba(168,85,247,0.5), 0 0 50px rgba(0,212,255,0.15)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 15px rgba(168,85,247,0.3)"; e.currentTarget.style.transform = "none"; }}
          >
            {loading ? "Logging in..." : "Login as Admin"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;