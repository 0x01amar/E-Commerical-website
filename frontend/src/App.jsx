import { useState } from "react";
import Navbar from "./components/Navbar";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import ProductPage from "./pages/ProductPage";
import UserLogin from "./pages/UserLogin";
import AdminLogin from "./pages/AdminLogin";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import LoginPassword from "./pages/LoginPassword";
import Home from "./pages/Home";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";

function App() {
  const [search, setSearch] = useState("");
  const location = useLocation();

  const hideNavbarRoutes = [
    "/signup",
    "/login",
    "/admin-login",
  ];

  const shouldHideNavbar = hideNavbarRoutes.includes(location.pathname);

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 via-indigo-50/40 to-slate-100 text-slate-900">
      {!shouldHideNavbar && <Navbar search={search} setSearch={setSearch} />}

      <main className={shouldHideNavbar ? "" : "mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"}>
        <Routes>
          <Route path="/" element={<Home search={search} />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout/:productId" element={<Checkout />} />
          <Route path="/signup" element={<UserLogin />} />
          <Route path="/login" element={<LoginPassword />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/complete-profile" element={<Navigate replace to="/signup" />} />
          <Route path="/login-password" element={<Navigate replace to="/login" />} />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </main>
    </div>
  );

}

export default App;