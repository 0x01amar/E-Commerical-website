import { Link, useLocation } from "react-router-dom";
import {
  HomeIcon,
  MagnifyingGlassIcon,
  ShoppingCartIcon,
  UserIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeSolid,
  MagnifyingGlassIcon as SearchSolid,
  ShoppingCartIcon as CartSolid,
  UserIcon as UserSolid,
  Squares2X2Icon as SquaresSolid,
} from "@heroicons/react/24/solid";

function MobileBottomNav({ setIsSearchOpen }) {
  const location = useLocation();
  const isLoggedIn = Boolean(localStorage.getItem("email"));
  const isAdminSession = localStorage.getItem("role") === "admin";

  const navItems = [
    {
      name: "Home",
      path: "/",
      icon: HomeIcon,
      activeIcon: HomeSolid,
    },
    {
      name: "Catalog",
      path: "/collections", // This might need to trigger a scroll or a page
      icon: Squares2X2Icon,
      activeIcon: SquaresSolid,
      onClick: (e) => {
        if (location.pathname === "/") {
          e.preventDefault();
          const el = document.getElementById("collections");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }
      }
    },
    {
      name: "Search",
      icon: MagnifyingGlassIcon,
      activeIcon: SearchSolid,
      onClick: () => setIsSearchOpen(true),
    },
    {
      name: "Cart",
      path: "/cart",
      icon: ShoppingCartIcon,
      activeIcon: CartSolid,
    },
    {
      name: "Profile",
      path: isLoggedIn ? (isAdminSession ? "/admin" : "/dashboard") : "/login",
      icon: UserIcon,
      activeIcon: UserSolid,
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-neutral-dark/5 px-6 pb-6 pt-3 z-50 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.03)] rounded-t-[32px]">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = isActive ? item.activeIcon : item.icon;

        if (item.onClick && !item.path) {
          return (
            <button
              key={item.name}
              onClick={item.onClick}
              className="flex flex-col items-center gap-1 group"
            >
              <div className={`p-2 rounded-2xl transition-all duration-300 ${isActive ? 'bg-primary text-white scale-110' : 'text-neutral-dark/40 group-active:scale-90'}`}>
                <Icon className="w-6 h-6" />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${isActive ? 'text-primary' : 'text-neutral-dark/40'}`}>
                {item.name}
              </span>
            </button>
          );
        }

        return (
          <Link
            key={item.name}
            to={item.path}
            onClick={item.onClick}
            className="flex flex-col items-center gap-1 group"
          >
            <div className={`p-2 rounded-2xl transition-all duration-300 ${isActive ? 'bg-primary text-white scale-110' : 'text-neutral-dark/40 group-active:scale-90'}`}>
              <Icon className="w-6 h-6" />
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${isActive ? 'text-primary' : 'text-neutral-dark/40'}`}>
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export default MobileBottomNav;
