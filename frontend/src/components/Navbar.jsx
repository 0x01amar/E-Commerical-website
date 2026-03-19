import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  ShoppingCartIcon,
  UserIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import SearchBar from "./SearchBar";
import { apiFetchJson } from "../config/api";
import { Button } from "./ui/button";

function Navbar({ search, setSearch }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = Boolean(localStorage.getItem("email"));
  const isAdminSession = localStorage.getItem("role") === "admin";
  
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchCatalog, setSearchCatalog] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const { response, data } = await apiFetchJson("/products");
        if (response.ok) setSearchCatalog(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load catalog", err);
      }
    };
    loadCatalog();
  }, []);

  const isHomePage = location.pathname === "/";
  // The navbar should have light text (white) if:
  // 1. We are on the home page
  // 2. We haven't scrolled past the hero image
  // 3. Search and Mobile menus are closed
  const isLightMode = isHomePage && !isScrolled && !isSearchOpen && !isMobileMenuOpen;

  const textColorClass = isLightMode ? "text-white" : "text-neutral-dark";
  const hoverColorClass = isLightMode ? "hover:text-white/70" : "hover:text-primary";
  const iconHoverBg = isLightMode ? "hover:bg-white/10" : "hover:bg-neutral-dark/5";

  const searchSuggestions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return searchCatalog
      .filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.category?.toLowerCase().includes(term) || 
        p.section?.toLowerCase().includes(term)
      )
      .slice(0, 5)
      .map(p => ({ id: p._id, label: p.name }));
  }, [search, searchCatalog]);

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${
      isScrolled || isSearchOpen || isMobileMenuOpen
        ? "bg-white/90 backdrop-blur-md shadow-sm py-2" 
        : "bg-transparent py-6"
    }`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className={`flex items-center transition-colors duration-500 ${textColorClass}`}>
          <div className="h-10 w-auto">
            <svg className="h-full w-auto" viewBox="0 0 300 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="40,10 75,30 75,70 40,90 5,70 5,30" fill={isLightMode ? "#FFFFFF" : "#4A5D4E"} />
              <path d="M20 65 V35 L40 55 L60 35 V65" stroke={isLightMode ? "#4A5D4E" : "#FFFFFF"} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
              <text x="95" y="55" fontFamily="Playfair Display, serif" fontWeight="bold" fontSize="36" fill="currentColor">Maa Sheela</text>
              <text x="95" y="82" fontFamily="Inter, sans-serif" fontWeight="bold" fontSize="14" fill="currentColor" opacity="0.6" letterSpacing="6">IRON ARTS</text>
            </svg>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-10">
          <button 
            onClick={() => {
              if (isHomePage) window.scrollTo({ top: 0, behavior: 'smooth' });
              else navigate("/");
            }} 
            className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-colors duration-500 ${textColorClass} ${hoverColorClass}`}
          >
            Home
          </button>
          <button onClick={() => {
            const el = document.getElementById("collections");
            if (el) el.scrollIntoView({ behavior: 'smooth' });
            else navigate("/");
          }} className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-colors duration-500 ${textColorClass} ${hoverColorClass}`}>
            Collections
          </button>
          <Link to="/contact" className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-colors duration-500 ${textColorClass} ${hoverColorClass}`}>
            Contact
          </Link>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`p-3 rounded-full transition-all duration-500 ${textColorClass} ${iconHoverBg}`}
          >
            <MagnifyingGlassIcon className="w-5 h-5" />
          </button>
          
          {!isAdminSession && (
            <Link to="/cart" className={`p-3 rounded-full transition-all duration-500 relative ${textColorClass} ${iconHoverBg}`}>
              <ShoppingCartIcon className="w-5 h-5" />
            </Link>
          )}

          {isLoggedIn ? (
            <Link to={isAdminSession ? "/admin" : "/dashboard"} className={`p-3 rounded-full transition-all duration-500 ${textColorClass} ${iconHoverBg}`}>
              <UserIcon className="w-5 h-5" />
            </Link>
          ) : (
            <div className="hidden md:flex items-center gap-4 ml-4">
              <button 
                onClick={() => navigate("/login")}
                className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-colors duration-500 ${textColorClass} ${hoverColorClass}`}
              >
                Login
              </button>
              <Button 
                variant={isLightMode ? "secondary" : "default"} 
                size="sm" 
                onClick={() => navigate("/signup")}
                className="transition-all duration-500 shadow-xl"
              >
                Sign Up
              </Button>
            </div>
          )}

          <button className={`md:hidden p-3 transition-colors duration-500 ${textColorClass}`} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Search Overlay */}
      {isSearchOpen && (
        <div className="absolute top-full left-0 w-full bg-white border-b border-neutral-dark/5 p-6 animate-in slide-in-from-top duration-500">
          <div className="max-w-3xl mx-auto">
            <SearchBar 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              suggestions={searchSuggestions}
              onSelectSuggestion={(s) => {
                setSearch(s.label);
                setIsSearchOpen(false);
                navigate(`/product/${s.id}`);
              }}
              placeholder="Search for furniture, collections..."
            />
          </div>
        </div>
      )}

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white shadow-2xl p-10 flex flex-col gap-10 animate-in fade-in slide-in-from-top-4 duration-500 border-t border-neutral-dark/5">
          <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-dark">Home</Link>
          <button onClick={() => {
            const el = document.getElementById("collections");
            if (el) el.scrollIntoView({ behavior: 'smooth' });
            setIsMobileMenuOpen(false);
          }} className="text-xs font-bold uppercase tracking-[0.2em] text-left text-neutral-dark">Collections</button>
          <Link to="/contact" onClick={() => setIsMobileMenuOpen(false)} className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-dark">Contact</Link>
          <Link to="/cart" onClick={() => setIsMobileMenuOpen(false)} className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-dark">Cart</Link>
          <hr className="border-neutral-dark/5" />
          {!isLoggedIn && (
            <div className="flex flex-col gap-4">
              <Button variant="outline" onClick={() => navigate("/login")}>Login</Button>
              <Button variant="default" onClick={() => navigate("/signup")}>Sign Up</Button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

export default Navbar;
