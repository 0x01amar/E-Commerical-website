import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProductCard from "../components/ProductCard";

function AdminDashboard() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    name: "",
    price: "",
    category: "",
    description: "",
    stock: "",
    warranty: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const isAdmin = localStorage.getItem("role") === "admin";

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const loadProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch("http://localhost:5000/api/products");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message || "Failed to load products");
        }

        setProducts(data);
        setError("");
      } catch (loadError) {
        setError(loadError.message || "Failed to load products");
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [isAdmin]);

  const resetForm = () => {
    setForm({
      name: "",
      price: "",
      category: "",
      description: "",
      stock: "",
      warranty: "",
    });
    setImageFile(null);
    setEditingId(null);
  };

  const submitProduct = async (event) => {
    event.preventDefault();

    try {
      if (!form.name.trim() || !form.category.trim()) {
        setError("Name and category are required");
        return;
      }

      setSaving(true);
      setError("");

      const url = editingId
        ? `http://localhost:5000/api/products/${editingId}`
        : "http://localhost:5000/api/products";

      const method = editingId ? "PUT" : "POST";

      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("price", form.price || "0");
      formData.append("category", form.category.trim());
      formData.append("description", form.description.trim());
      formData.append("stock", form.stock || "0");
      formData.append("warranty", form.warranty.trim());

      if (imageFile) {
        formData.append("image", imageFile);
      }

      const response = await fetch(url, {
        method,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to save product");
      }

      if (editingId) {
        setProducts((prev) => prev.map((product) => (product._id === data._id ? data : product)));
      } else {
        setProducts((prev) => [data, ...prev]);
      }

      resetForm();
    } catch (saveError) {
      setError(saveError.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (id) => {
    try {
      const confirmed = window.confirm("Delete this product?");
      if (!confirmed) {
        return;
      }

      const response = await fetch(`http://localhost:5000/api/products/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to delete product");
      }

      setProducts((prev) => prev.filter((product) => product._id !== id));
    } catch (deleteError) {
      setError(deleteError.message || "Failed to delete product");
    }
  };

  const editProduct = (product) => {
    setEditingId(product._id);
    setForm({
      name: product.name || "",
      price: String(product.price || ""),
      category: product.category || "",
      description: product.description || "",
      stock: String(product.stock || ""),
      warranty: product.warranty || "",
    });
    setImageFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const logout = () => {
    localStorage.removeItem("role");
    navigate("/admin-login");
  };

  if (!isAdmin) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-slate-600">Admin access required.</p>
          <button
            type="button"
            onClick={() => navigate("/admin-login")}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Go to Admin Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
        <button
          type="button"
          onClick={logout}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Logout
        </button>
      </div>

      {error ? <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null}

      <form onSubmit={submitProduct} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">
          {editingId ? "Edit Product" : "Add New Product"}
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <input
            placeholder="Product Name"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-400"
          />
          <input
            placeholder="Category"
            value={form.category}
            onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-400"
          />
          <input
            placeholder="Price"
            type="number"
            min="0"
            value={form.price}
            onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-400"
          />
          <input
            placeholder="Stock"
            type="number"
            min="0"
            value={form.stock}
            onChange={(event) => setForm((prev) => ({ ...prev, stock: event.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-400"
          />
          <input
            placeholder="Warranty"
            value={form.warranty}
            onChange={(event) => setForm((prev) => ({ ...prev, warranty: event.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-400 md:col-span-2"
          />
          <textarea
            placeholder="Description"
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            className="min-h-24 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-400 md:col-span-2"
          />
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setImageFile(event.target.files?.[0] || null)}
            className="md:col-span-2"
          />
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : editingId ? "Update Product" : "Add Product"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Cancel Edit
            </button>
          ) : null}
        </div>
      </form>

      {loading ? <p className="text-slate-600">Loading products...</p> : null}

      {!loading ? (
        products.length ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                showAdminActions
                onView={() => navigate(`/product/${product._id}`)}
                onEdit={editProduct}
                onDelete={deleteProduct}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-xl bg-white p-6 text-center text-slate-600 shadow-sm">No products yet.</p>
        )
      ) : null}
    </section>
  );
}

export default AdminDashboard;