import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetchJson, resolveApiErrorMessage } from "../config/api";
import { showToast } from "../config/toast";
import AdminSidebar from "./admin/AdminSidebar";
import AdminOverview from "./admin/AdminOverview";
import AdminProducts from "./admin/AdminProducts";
import AdminOrders from "./admin/AdminOrders";
import AdminSettings from "./admin/AdminSettings";
import Modal from "../components/ui/modal";
import ProductForm from "./admin/ProductForm";
import SectionManager from "./admin/SectionManager";

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [products, setProducts] = useState([]);
  const [sections, setSections] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [siteContent, setSiteContent] = useState({});
  const [pricing, setPricing] = useState({});
  const [heroImageUrl, setHeroImageUrl] = useState("");

  const [modalState, setModal] = useState({ type: null, data: null });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const isAdmin = localStorage.getItem("role") === "admin";
  const adminKey = localStorage.getItem("adminKey") || "";

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodRes, secRes, orderRes, priceRes, contentRes, heroRes] = await Promise.all([
        apiFetchJson("/products"),
        apiFetchJson("/products/sections"),
        apiFetchJson("/orders/admin/all", { headers: { "x-admin-key": adminKey } }),
        apiFetchJson("/settings/checkout-pricing"),
        apiFetchJson("/site-content"),
        apiFetchJson("/settings/hero-image")
      ]);

      if (prodRes.response.ok) setProducts(prodRes.data);
      if (secRes.response.ok) setSections(secRes.data);
      if (orderRes.response.ok) setOrders(orderRes.data);
      if (priceRes.response.ok) {
        setPricing({
          taxRatePercent: (priceRes.data.taxRate * 100).toString(),
          shippingCharge: priceRes.data.shippingCharge.toString()
        });
      }
      if (contentRes.response.ok) setSiteContent(contentRes.data);
      if (heroRes.response.ok) setHeroImageUrl(heroRes.data.heroImageUrl);
    } catch (err) {
      showToast("Failed to load dashboard data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      navigate("/admin-login");
      return;
    }
    loadData();
  }, [isAdmin, adminKey, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("email");
    localStorage.removeItem("role");
    localStorage.removeItem("adminKey");
    navigate("/");
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      const { response, data } = await apiFetchJson(`/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        setOrders(prev => prev.map(o => o._id === orderId ? data.order : o));
        showToast("Order status updated", "success");
      }
    } catch (err) {
      showToast("Update failed", "error");
    }
  };

  const submitProduct = async (formData) => {
    try {
      setIsSubmitting(true);
      const isEdit = !!modalState.data;
      const url = isEdit ? `/products/${modalState.data._id}` : "/products";
      const method = isEdit ? "PUT" : "POST";

      const { response, data } = await apiFetchJson(url, {
        method,
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        showToast(`Product ${isEdit ? "updated" : "created"} successfully`, "success");
        setModal({ type: null, data: null });
        loadData();
      } else {
        showToast(data?.message || "Operation failed", "error");
      }
    } catch (err) {
      showToast("An error occurred", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to delete this piece?")) return;
    try {
      const { response } = await apiFetchJson(`/products/${id}`, {
        method: "DELETE",
        headers: { "x-admin-key": adminKey }
      });
      if (response.ok) {
        showToast("Product removed", "success");
        loadData();
      }
    } catch (err) {
      showToast("Delete failed", "error");
    }
  };

  const manageSection = async (action, payload) => {
    try {
      setIsSubmitting(true);
      if (action === 'add') {
        const { response } = await apiFetchJson("/products/sections", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
          body: JSON.stringify({ name: payload })
        });
        if (response.ok) {
          showToast("Section added", "success");
          loadData();
        }
      } else if (action === 'delete') {
        const { response } = await apiFetchJson(`/products/sections/${payload}`, {
          method: "DELETE",
          headers: { "x-admin-key": adminKey }
        });
        if (response.ok) {
          showToast("Section removed", "success");
          loadData();
        }
      }
    } catch (err) {
      showToast("Operation failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveBranding = async (content) => {
    try {
      const { response } = await apiFetchJson("/site-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify(content)
      });
      if (response.ok) {
        showToast("Branding updated", "success");
        loadData();
      }
    } catch (err) { showToast("Save failed", "error"); }
  };

  const savePricing = async (p) => {
    try {
      const { response } = await apiFetchJson("/settings/checkout-pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ taxRate: Number(p.taxRatePercent) / 100, shippingCharge: Number(p.shippingCharge) })
      });
      if (response.ok) {
        showToast("Pricing updated", "success");
        loadData();
      }
    } catch (err) { showToast("Save failed", "error"); }
  };

  const saveHero = async (url) => {
    try {
      const { response } = await apiFetchJson("/settings/hero-image", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ heroImageUrl: url })
      });
      if (response.ok) {
        setHeroImageUrl(url);
        showToast("Hero image updated", "success");
        loadData();
      }
    } catch (err) { showToast("Update failed", "error"); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen font-heading text-xl">Entering Vault...</div>;

  return (
    <div className="flex min-h-screen bg-neutral-cream">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      
      <main className="flex-grow ml-64 p-12 overflow-x-hidden">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'overview' && <AdminOverview products={products} orders={orders} />}
          {activeTab === 'products' && (
            <AdminProducts 
              products={products} 
              sections={sections} 
              onAddProduct={() => setModal({ type: 'product', data: null })}
              onEditProduct={(p) => setModal({ type: 'product', data: p })}
              onDeleteProduct={deleteProduct}
              onAddSection={() => setModal({ type: 'sections', data: null })}
            />
          )}
          {activeTab === 'orders' && (
            <AdminOrders 
              orders={orders} 
              onUpdateStatus={updateOrderStatus}
              onUpdateDelivery={(id, val) => showToast("Feature in development", "info")}
            />
          )}
          {activeTab === 'settings' && (
            <AdminSettings 
              siteContent={siteContent} 
              pricing={pricing} 
              heroImageUrl={heroImageUrl}
              onSaveSiteContent={saveBranding}
              onSavePricing={savePricing}
              onSaveHeroImage={saveHero}
            />
          )}
        </div>
      </main>

      {/* Modals */}
      <Modal 
        isOpen={modalState.type === 'product'} 
        onClose={() => setModal({ type: null, data: null })}
        title={modalState.data ? "Refine Piece" : "Add New Masterpiece"}
      >
        <ProductForm 
          initialData={modalState.data} 
          sections={sections} 
          isSubmitting={isSubmitting}
          onSubmit={submitProduct}
          onCancel={() => setModal({ type: null, data: null })}
        />
      </Modal>

      <Modal 
        isOpen={modalState.type === 'sections'} 
        onClose={() => setModal({ type: null, data: null })}
        title="Manage Collections"
      >
        <SectionManager 
          sections={sections}
          isSubmitting={isSubmitting}
          onAdd={(name) => manageSection('add', name)}
          onDelete={(id) => manageSection('delete', id)}
        />
      </Modal>
    </div>
  );
}

export default AdminDashboard;
