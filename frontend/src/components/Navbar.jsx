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
    <header className="sticky top-0 z-20 border-b border-indigo-200 bg-gradient-to-r from-white via-indigo-50 to-white shadow-md backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-3 py-3 sm:gap-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="rounded-xl bg-gradient-to-r from-indigo-700 to-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-lg transition hover:from-indigo-600 hover:to-indigo-500 hover:shadow-xl sm:px-4 sm:text-sm"
        >
          ✨ Satyam Iron Art
        </button>

        <div className="order-3 w-full md:order-2 md:flex-1">
          {showSearch ? (
            <SearchBar
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          ) : null}
        </div>

        <div className="order-2 ml-auto flex items-center gap-1.5 sm:gap-2 md:order-3">
          {!isAdminSession && (
            <button
              type="button"
              onClick={() => navigate("/cart")}
              className="rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:border-slate-400 sm:px-3 sm:text-sm"
            >
              🛒 Cart
            </button>
          )}
          {isLoggedIn ? (
            <button
              type="button"
              onClick={goToProfile}
              className="rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 px-2.5 py-2 text-xs font-semibold text-white transition hover:from-indigo-700 hover:to-indigo-800 sm:px-3 sm:text-sm shadow-sm"
            >
              {isAdminSession ? "⚙️ Dashboard" : "👤 Profile"}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => navigate("/signup")}
                className="rounded-lg bg-amber-500 px-2.5 py-2 text-xs font-semibold text-slate-900 transition hover:bg-amber-400 sm:px-3 sm:text-sm shadow-sm"
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 sm:px-3 sm:text-sm"
              >
                User Login
              </button>
              <button
                type="button"
                onClick={() => navigate("/admin-login")}
                className="rounded-lg bg-indigo-700 px-2.5 py-2 text-xs font-semibold text-white transition hover:bg-indigo-800 sm:px-3 sm:text-sm shadow-sm"
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