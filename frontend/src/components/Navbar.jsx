import { useLocation, useNavigate } from "react-router-dom";
import SearchBar from "./SearchBar";

function Navbar({ search, setSearch }) {
  const navigate = useNavigate();
  const location = useLocation();
  const showSearch = location.pathname === "/";

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Satyam Iron Art
        </button>

        <div className="order-3 w-full md:order-2 md:flex-1">
          {showSearch ? (
            <SearchBar
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          ) : null}
        </div>

        <div className="order-2 ml-auto flex items-center gap-2 md:order-3">
          <button
            type="button"
            onClick={() => navigate("/cart")}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Cart
          </button>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-400"
          >
            User Login
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin-login")}
            className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Admin Login
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;