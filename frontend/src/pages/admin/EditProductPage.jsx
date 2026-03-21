import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetchJson } from "../../config/api";
import { showToast } from "../../config/toast";
import ProductForm from "./ProductForm";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { Button } from "../../components/ui/button";

function EditProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isAdmin = localStorage.getItem("role") === "admin";
  const adminKey = localStorage.getItem("adminKey") || "";

  useEffect(() => {
    if (!isAdmin) {
      navigate("/admin-login");
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const [prodRes, secRes] = await Promise.all([
          apiFetchJson(`/products/${id}`),
          apiFetchJson("/products/sections")
        ]);

        if (prodRes.response.ok) setProduct(prodRes.data);
        if (secRes.response.ok) setSections(secRes.data);
      } catch (err) {
        showToast("Failed to load product data", "error");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, isAdmin, navigate]);

  const handleSubmit = async (formData) => {
    try {
      setIsSubmitting(true);
      const { response, data } = await apiFetchJson(`/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        showToast("Product updated successfully", "success");
        navigate("/admin");
      } else {
        showToast(data?.message || "Update failed", "error");
      }
    } catch (err) {
      showToast("An error occurred", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen font-heading text-xl">Loading Product...</div>;
  if (!product) return <div className="flex items-center justify-center min-h-screen font-heading text-xl">Product not found</div>;

  return (
    <div className="min-h-screen bg-neutral-cream pt-24 pb-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeftIcon className="w-6 h-6" />
          </Button>
          <h1 className="text-2xl font-heading font-bold">Edit Product</h1>
        </div>

        <div className="bg-white p-6 rounded-sm shadow-sm">
          <ProductForm 
            initialData={product} 
            sections={sections} 
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            onCancel={() => navigate("/admin")}
          />
        </div>
      </div>
    </div>
  );
}

export default EditProductPage;
