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

  const shouldHideNavbar = hideNavbarRoutes.includes(location.pathname);
  const isAdminDashboard = location.pathname === "/admin";

  return (
    <div className="flex flex-col min-h-screen">
      {!shouldHideNavbar && !isAdminDashboard && (
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
      
      <main className={`flex-grow min-h-screen ${shouldHideNavbar || isAdminDashboard ? "" : "pt-16 md:pt-0 pb-24 md:pb-12"}`}>
        {children}
      </main>

      {!shouldHideNavbar && !isAdminDashboard && <Footer />}
    </div>
  );
}

export default MainLayout;
