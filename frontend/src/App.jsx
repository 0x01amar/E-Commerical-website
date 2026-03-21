import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProductPage from "./pages/ProductPage";
import UserLogin from "./pages/UserLogin";
import AdminLogin from "./pages/AdminLogin";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import EditProductPage from "./pages/admin/EditProductPage";
import AddProductPage from "./pages/admin/AddProductPage";
import LoginPassword from "./pages/LoginPassword";
import Home from "./pages/Home";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Contact from "./pages/Contact";
import ToastHost from "./components/ToastHost";
import ScrollToTop from "./components/ScrollToTop";
import MainLayout from "./components/layout/MainLayout";

function App() {
  const [search, setSearch] = useState("");

  return (
    <MainLayout search={search} setSearch={setSearch}>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home search={search} />} />
        <Route path="/product/:id" element={<ProductPage />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout/:productId" element={<Checkout />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/signup" element={<UserLogin />} />
        <Route path="/login" element={<LoginPassword />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/edit-product/:id" element={<EditProductPage />} />
        <Route path="/admin/add-product" element={<AddProductPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/complete-profile" element={<Navigate replace to="/signup" />} />
        <Route path="/login-password" element={<Navigate replace to="/login" />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
      <ToastHost />
    </MainLayout>
  );
}

export default App;
