import { useState } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "../Navbar";
import Footer from "../Footer";
import MobileHeader from "../MobileHeader";
import MobileBottomNav from "../MobileBottomNav";
import MobileSearchOverlay from "../MobileSearchOverlay";

function MainLayout({ children, search, setSearch }) {
  const location = useLocation();
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  
  const hideNavbarRoutes = [
    "/signup",
    "/login",
    "/admin",
    "/admin-login",
  ];

  const isAdminRoute = location.pathname.startsWith("/admin");
  const shouldHideNavbar = hideNavbarRoutes.includes(location.pathname) || isAdminRoute;
  const isAuthPage = ["/signup", "/login", "/admin-login"].includes(location.pathname);

  return (
    <div className="flex flex-col min-h-screen">
      {!shouldHideNavbar && (
        <>
          <div className="hidden md:block">
            <Navbar search={search} setSearch={setSearch} />
          </div>
          <MobileHeader />
          <MobileBottomNav setIsSearchOpen={setIsMobileSearchOpen} />
          <MobileSearchOverlay 
            isOpen={isMobileSearchOpen} 
            onClose={() => setIsMobileSearchOpen(false)}
            search={search}
            setSearch={setSearch}
          />
        </>
      )}
      
      <main className={`flex-grow min-h-screen ${shouldHideNavbar ? "" : "pt-16 md:pt-0 pb-24 md:pb-12"}`}>
        {children}
      </main>

      {!shouldHideNavbar && <Footer />}
    </div>
  );
}

export default MainLayout;
