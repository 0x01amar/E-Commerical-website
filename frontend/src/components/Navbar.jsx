import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  HomeIcon,
  ShoppingCartIcon,
  UserCircleIcon,
  UserPlusIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import SearchBar from "./SearchBar";
import { apiFetchJson } from "../config/api";

function Navbar({ search, setSearch }) {
  const navigate = useNavigate();
  const location = useLocation();
  const showSearch = location.pathname === "/";
  const isLoggedIn = Boolean(localStorage.getItem("email"));
  const isAdminSession = localStorage.getItem("role") === "admin";
  const [searchCatalog, setSearchCatalog] = useState([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  useEffect(() => {
    if (!showSearch || catalogLoaded) {
      return;
    }

    const loadCatalog = async () => {
      try {
        const { response, data } = await apiFetchJson("/products");

        if (!response.ok) {
          return;
        }

        setSearchCatalog(Array.isArray(data) ? data : []);
        setCatalogLoaded(true);
      } catch {
        setSearchCatalog([]);
      }
    };

    loadCatalog();
  }, [catalogLoaded, showSearch]);

  const searchSuggestions = useMemo(() => {
    const normalizedSearch = String(search || "").trim().toLowerCase();

    if (!normalizedSearch) {
      return [];
    }

    const terms = normalizedSearch.split(/\s+/).filter(Boolean);

    return searchCatalog
      .filter((product) => {
        const text = [
          product?.name || "",
          product?.section || "",
          product?.category || "",
          product?.description || "",
        ].join(" ").toLowerCase();

        return terms.every((term) => text.includes(term));
      })
      .slice(0, 8)
      .map((product) => ({
        id: product?._id,
        label: product?.name || "Product",
        section: product?.section || product?.category || "General",
      }));
  }, [search, searchCatalog]);

  const goToProfile = () => {
    if (isAdminSession) {
      navigate("/admin-dashboard");
      return;
    }
    navigate("/dashboard");
  };

  return (
    <>
      <header
        style={{
          background: "rgba(255,255,255,0.94)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          borderBottom: "1px solid rgba(37,99,235,0.16)",
          boxShadow: "0 6px 20px rgba(30,60,110,0.08)",
        }}
        className="sticky top-0 z-50 hidden md:block"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-3 py-3 sm:gap-3 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate("/")}
            style={{
              background: "linear-gradient(135deg, #2563eb, #3b82f6)",
              boxShadow: "0 8px 18px rgba(37,99,235,0.28)",
            }}
            className="rounded-xl px-3 py-2 text-xs font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-[0_0_24px_rgba(37,99,235,0.32)] sm:px-4 sm:text-sm"
          >
            ✦ Maa Sheela Iron Art
          </button>

          <div className="order-3 w-full md:order-2 md:flex-1">
            {showSearch ? (
              <SearchBar
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                suggestions={searchSuggestions}
                onSelectSuggestion={(suggestion) => {
                  setSearch(String(suggestion?.label || ""));

                  if (location.pathname !== "/") {
                    navigate("/");
                  }
                }}
                placeholder="Search furniture, section, category..."
              />
            ) : null}
          </div>

          <div className="order-2 ml-auto flex items-center gap-1.5 sm:gap-2 md:order-3">
            {!isAdminSession && (
              <button
                type="button"
                onClick={() => navigate("/cart")}
                style={{
                  background: "rgba(37,99,235,0.08)",
                  border: "1px solid rgba(37,99,235,0.26)",
                  color: "#1d4ed8",
                }}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-250 hover:scale-105 hover:bg-[rgba(37,99,235,0.14)] hover:border-[rgba(37,99,235,0.40)] hover:shadow-[0_0_15px_rgba(37,99,235,0.18)] sm:px-3 sm:text-sm"
              >
                <ShoppingCartIcon className="h-4 w-4" /> Cart
              </button>
            )}

            {isLoggedIn ? (
              <button
                type="button"
                onClick={goToProfile}
                style={{
                  background: "linear-gradient(135deg, rgba(37,99,235,0.12), rgba(59,130,246,0.10))",
                  border: "1px solid rgba(37,99,235,0.28)",
                  color: "#1d4ed8",
                }}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-semibold transition-all duration-250 hover:scale-105 hover:bg-[rgba(37,99,235,0.16)] hover:shadow-[0_0_15px_rgba(37,99,235,0.16)] sm:px-3 sm:text-sm"
              >
                <UserCircleIcon className="h-4 w-4" />
                {isAdminSession ? "Dashboard" : "Profile"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate("/signup")}
                  style={{
                    background: "linear-gradient(135deg, #2563eb, #3b82f6)",
                    boxShadow: "0 0 12px rgba(37,99,235,0.22)",
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
                    background: "linear-gradient(135deg, #2563eb, #3b82f6)",
                    boxShadow: "0 0 12px rgba(37,99,235,0.22)",
                    color: "#fff",
                  }}
                  className="rounded-lg px-2.5 py-2 text-xs font-semibold transition-all duration-250 hover:shadow-[0_0_25px_rgba(45,212,191,0.4)] hover:scale-105 sm:px-3 sm:text-sm"
                >
                  Login
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <header
        style={{
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderBottom: "1px solid rgba(37,99,235,0.16)",
        }}
        className="sticky top-0 z-50 md:hidden"
      >
        <div className="mx-auto flex max-w-7xl items-center px-4 py-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-blue-800"
          >
            Maa Sheela Iron Art
          </button>
        </div>
      </header>

      <div
        style={{
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderTop: "1px solid rgba(37,99,235,0.2)",
          boxShadow: "0 -8px 24px rgba(15,23,42,0.14)",
        }}
        className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] pt-2 md:hidden"
      >
        <div className="mx-auto max-w-7xl">
          {showSearch ? (
            <SearchBar
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              suggestions={searchSuggestions}
              onSelectSuggestion={(suggestion) => {
                setSearch(String(suggestion?.label || ""));

                if (location.pathname !== "/") {
                  navigate("/");
                }
              }}
              placeholder="Search products..."
            />
          ) : null}

          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex min-w-20 flex-1 flex-col items-center rounded-xl border border-blue-100 bg-blue-50 px-2 py-2 text-[11px] font-semibold text-blue-800"
            >
              <HomeIcon className="h-5 w-5" />
              Home
            </button>

            {!isAdminSession ? (
              <button
                type="button"
                onClick={() => navigate("/cart")}
                className="flex min-w-20 flex-1 flex-col items-center rounded-xl border border-sky-100 bg-sky-50 px-2 py-2 text-[11px] font-semibold text-sky-800"
              >
                <ShoppingCartIcon className="h-5 w-5" />
                Cart
              </button>
            ) : null}

            {isLoggedIn ? (
              <button
                type="button"
                onClick={goToProfile}
                className="flex min-w-20 flex-1 flex-col items-center rounded-xl border border-indigo-100 bg-indigo-50 px-2 py-2 text-[11px] font-semibold text-indigo-800"
              >
                <UserCircleIcon className="h-5 w-5" />
                {isAdminSession ? "Dashboard" : "Profile"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate("/signup")}
                  className="flex min-w-20 flex-1 flex-col items-center rounded-xl border border-emerald-100 bg-emerald-50 px-2 py-2 text-[11px] font-semibold text-emerald-800"
                >
                  <UserPlusIcon className="h-5 w-5" />
                  Sign Up
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="flex min-w-20 flex-1 flex-col items-center rounded-xl border border-violet-100 bg-violet-50 px-2 py-2 text-[11px] font-semibold text-violet-800"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  Login
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default Navbar;