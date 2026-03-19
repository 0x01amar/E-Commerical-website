import { useLocation } from "react-router-dom";
import Navbar from "../Navbar";
import Footer from "../Footer";

function MainLayout({ children, search, setSearch }) {
  const location = useLocation();
  
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
        <Navbar search={search} setSearch={setSearch} />
      )}
      
      <main className={`flex-grow ${shouldHideNavbar || isAdminDashboard ? "" : "pb-12"}`}>
        {children}
      </main>

      {!shouldHideNavbar && !isAdminDashboard && <Footer />}
    </div>
  );
}

export default MainLayout;
