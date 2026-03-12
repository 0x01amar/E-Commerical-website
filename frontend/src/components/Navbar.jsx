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
        background: "rgba(240,248,255,0.93)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        borderBottom: "1px solid rgba(100,160,220,0.28)",
        boxShadow: "0 2px 16px rgba(30,60,110,0.10)",
      }}
      className="sticky top-0 z-20"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-3 py-3 sm:gap-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            background: "linear-gradient(135deg, #0284c7, #7c3aed)",
            boxShadow: "0 0 16px rgba(2,132,199,0.28), 0 4px 12px rgba(0,0,0,0.12)",
          }}
          className="rounded-xl px-3 py-2 text-xs font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-[0_0_24px_rgba(2,132,199,0.28)] sm:px-4 sm:text-sm"
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
                background: "rgba(245,170,30,0.10)",
                border: "1px solid rgba(245,158,11,0.30)",
                color: "#b45309",
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
                background: "linear-gradient(135deg, rgba(2,132,199,0.12), rgba(124,58,237,0.10))",
                border: "1px solid rgba(2,132,199,0.28)",
                color: "#0284c7",
              }}
              className="rounded-lg px-2.5 py-2 text-xs font-semibold transition-all duration-250 hover:bg-[rgba(2,132,199,0.14)] hover:shadow-[0_0_15px_rgba(2,132,199,0.16)] sm:px-3 sm:text-sm"
            >
              {isAdminSession ? "⚙️ Dashboard" : "👤 Profile"}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => navigate("/signup")}
                style={{
                  background: "linear-gradient(135deg, #0891b2, #0284c7)",
                  boxShadow: "0 0 12px rgba(14,165,233,0.22)",
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
                  background: "rgba(255,255,255,0.85)",
                  border: "1px solid rgba(100,160,220,0.32)",
                  color: "#3a5470",
                }}
                className="rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-250 hover:bg-[rgba(255,255,255,0.96)] hover:text-[#1a2f48] hover:border-[rgba(100,160,220,0.42)] sm:px-3 sm:text-sm"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => navigate("/admin-login")}
                style={{
                  background: "rgba(124,58,237,0.09)",
                  border: "1px solid rgba(124,58,237,0.25)",
                  color: "#7c3aed",
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