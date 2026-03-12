import { useLocation, useNavigate } from "react-router-dom";
import SearchBar from "./SearchBar";

function Navbar({ search, setSearch }) {
  const navigate = useNavigate();
  const location = useLocation();
  const showSearch = location.pathname === "/";
  const isLoggedIn = Boolean(localStorage.getItem("email"));
  const isAdminSession = localStorage.getItem("role") === "admin";

  const goToProfile = () => {
    if (isAdminSession) {
      navigate("/admin-dashboard");
      return;
    }
    navigate("/dashboard");
  };

  return (
    <header
      style={{
        background: "rgba(5, 6, 15, 0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(0,212,255,0.12)",
        boxShadow: "0 4px 30px rgba(0,0,0,0.5), 0 0 60px rgba(0,212,255,0.03)",
      }}
      className="sticky top-0 z-20"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-3 py-3 sm:gap-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            background: "linear-gradient(135deg, #00d4ff, #a855f7)",
            boxShadow: "0 0 20px rgba(0,212,255,0.3), 0 4px 15px rgba(0,0,0,0.3)",
          }}
          className="rounded-xl px-3 py-2 text-xs font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(0,212,255,0.5)] sm:px-4 sm:text-sm"
        >
          ✦ Satyam Iron Art
        </button>

        {/* Search */}
        <div className="order-3 w-full md:order-2 md:flex-1">
          {showSearch ? (
            <SearchBar
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          ) : null}
        </div>

        {/* Nav Buttons */}
        <div className="order-2 ml-auto flex items-center gap-1.5 sm:gap-2 md:order-3">
          {!isAdminSession && (
            <button
              type="button"
              onClick={() => navigate("/cart")}
              style={{
                background: "rgba(251,191,36,0.08)",
                border: "1px solid rgba(251,191,36,0.25)",
                color: "#fbbf24",
              }}
              className="rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-250 hover:bg-[rgba(251,191,36,0.15)] hover:border-[rgba(251,191,36,0.45)] hover:shadow-[0_0_15px_rgba(251,191,36,0.2)] sm:px-3 sm:text-sm"
            >
              🛒 Cart
            </button>
          )}

          {isLoggedIn ? (
            <button
              type="button"
              onClick={goToProfile}
              style={{
                background: "linear-gradient(135deg, #00d4ff22, #a855f722)",
                border: "1px solid rgba(0,212,255,0.25)",
                color: "#00d4ff",
              }}
              className="rounded-lg px-2.5 py-2 text-xs font-semibold transition-all duration-250 hover:bg-[rgba(0,212,255,0.12)] hover:shadow-[0_0_15px_rgba(0,212,255,0.25)] sm:px-3 sm:text-sm"
            >
              {isAdminSession ? "⚙️ Dashboard" : "👤 Profile"}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => navigate("/signup")}
                style={{
                  background: "linear-gradient(135deg, #2dd4bf, #06b6d4)",
                  boxShadow: "0 0 15px rgba(45,212,191,0.2)",
                  color: "#fff",
                }}
                className="rounded-lg px-2.5 py-2 text-xs font-semibold transition-all duration-250 hover:shadow-[0_0_25px_rgba(45,212,191,0.4)] hover:scale-105 sm:px-3 sm:text-sm"
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={() => navigate("/login")}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#94a3b8",
                }}
                className="rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-250 hover:bg-[rgba(255,255,255,0.08)] hover:text-white hover:border-[rgba(255,255,255,0.2)] sm:px-3 sm:text-sm"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => navigate("/admin-login")}
                style={{
                  background: "rgba(168,85,247,0.12)",
                  border: "1px solid rgba(168,85,247,0.25)",
                  color: "#c084fc",
                }}
                className="rounded-lg px-2.5 py-2 text-xs font-semibold transition-all duration-250 hover:bg-[rgba(168,85,247,0.2)] hover:shadow-[0_0_15px_rgba(168,85,247,0.25)] sm:px-3 sm:text-sm"
              >
                Admin
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;