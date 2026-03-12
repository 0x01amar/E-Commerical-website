import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import OrderTimeline, { ORDER_STATUS_STEPS } from "../components/OrderTimeline";
import ProductCard from "../components/ProductCard";
import StarRating from "../components/StarRating";
import { apiUrl, mediaUrl } from "../config/api";

const defaultProductForm = {
  name: "",
  price: "",
  section: "",
  category: "",
  description: "",
  stock: "",
  warranty: "",
  ratingAverage: "",
  ratingCount: "",
};

const defaultSectionForm = {
  name: "",
  displayOrder: "",
};

const sortSections = (items = []) => {
  return [...items].sort((first, second) => {
    const orderA = Number(first?.displayOrder || 0);
    const orderB = Number(second?.displayOrder || 0);

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return String(first?.name || "").localeCompare(String(second?.name || ""));
  });
};

const uniqueImages = (images = []) => {
  return Array.from(new Set(images.filter(Boolean).map((imagePath) => String(imagePath).trim())));
};

function AdminDashboard() {
  const [products, setProducts] = useState([]);
  const [sections, setSections] = useState([]);
  const [orders, setOrders] = useState([]);

  const [productForm, setProductForm] = useState(defaultProductForm);
  const [sectionForm, setSectionForm] = useState(defaultSectionForm);

  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [mainImageSelection, setMainImageSelection] = useState({
    type: "existing",
    value: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [editingSectionId, setEditingSectionId] = useState("");

  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sectionSaving, setSectionSaving] = useState(false);
  const [statusUpdatingOrderId, setStatusUpdatingOrderId] = useState("");

  const [error, setError] = useState("");
  const [sectionError, setSectionError] = useState("");
  const [ordersError, setOrdersError] = useState("");
  const [statusDrafts, setStatusDrafts] = useState({});
  const [deliveryDateDrafts, setDeliveryDateDrafts] = useState({});
  const [deliveryUpdatingOrderId, setDeliveryUpdatingOrderId] = useState("");

  const navigate = useNavigate();
  const isAdmin = localStorage.getItem("role") === "admin";
  const adminKey = localStorage.getItem("adminKey") || "";

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      setOrdersLoading(false);
      return;
    }

    const loadAdminData = async () => {
      try {
        setLoading(true);
        setOrdersLoading(true);
        setError("");
        setSectionError("");
        setOrdersError("");

        const [productsResponse, sectionsResponse] = await Promise.all([
          fetch(apiUrl("/products")),
          fetch(apiUrl("/products/sections")),
        ]);

        const productsData = await productsResponse.json();
        const sectionsData = await sectionsResponse.json();

        if (!productsResponse.ok) {
          throw new Error(productsData?.message || "Failed to load products");
        }

        if (!sectionsResponse.ok) {
          throw new Error(sectionsData?.message || "Failed to load sections");
        }

        const normalizedProducts = Array.isArray(productsData) ? productsData : [];
        const normalizedSections = sortSections(Array.isArray(sectionsData) ? sectionsData : []);

        setProducts(normalizedProducts);
        setSections(normalizedSections);

        const ordersResponse = await fetch(apiUrl("/orders/admin/all"), {
          headers: {
            "x-admin-key": adminKey,
          },
        });

        const ordersData = await ordersResponse.json();

        if (!ordersResponse.ok) {
          throw new Error(ordersData?.message || "Failed to load orders");
        }

        const normalizedOrders = Array.isArray(ordersData) ? ordersData : [];
        setOrders(normalizedOrders);
        setStatusDrafts(
          normalizedOrders.reduce((accumulator, order) => {
            accumulator[order._id] = order.status;
            return accumulator;
          }, {})
        );
      } catch (loadError) {
        const message = loadError.message || "Failed to load admin dashboard";
        setError(message);
        setOrdersError(message);
      } finally {
        setLoading(false);
        setOrdersLoading(false);
      }
    };

    loadAdminData();
  }, [adminKey, isAdmin]);

  useEffect(() => {
    if (!productForm.section && sections.length && !editingId) {
      setProductForm((prev) => ({
        ...prev,
        section: sections[0].name,
        category: prev.category || sections[0].name,
      }));
    }
  }, [editingId, productForm.section, sections]);

  const groupedProducts = useMemo(() => {
    const productSections = new Set([
      ...sections.map((section) => String(section?.name || "").trim()).filter(Boolean),
      ...products.map((product) => String(product?.section || product?.category || "General").trim()),
    ]);

    return Array.from(productSections)
      .filter(Boolean)
      .map((sectionName) => ({
        name: sectionName,
        products: products.filter(
          (product) => String(product?.section || product?.category || "General").trim() === sectionName
        ),
      }))
      .filter((group) => group.products.length)
      .sort((first, second) => first.name.localeCompare(second.name));
  }, [products, sections]);

  const resetForm = () => {
    newImages.forEach((entry) => {
      if (entry.preview) {
        URL.revokeObjectURL(entry.preview);
      }
    });

    setProductForm({
      ...defaultProductForm,
      section: sections[0]?.name || "",
      category: sections[0]?.name || "",
    });
    setExistingImages([]);
    setNewImages([]);
    setMainImageSelection({
      type: "existing",
      value: "",
    });
    setEditingId(null);
  };

  const resetSectionForm = () => {
    setSectionForm(defaultSectionForm);
    setEditingSectionId("");
  };

  const onAddNewImages = (event) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"));

    if (!files.length) {
      return;
    }

    const nextEntries = files.map((file, index) => ({
      id: `${Date.now()}-${index}-${file.name}`,
      file,
      preview: URL.createObjectURL(file),
    }));

    const nextImages = [...newImages, ...nextEntries];
    setNewImages(nextImages);

    if (!mainImageSelection.value && !existingImages.length && nextImages.length) {
      setMainImageSelection({
        type: "new",
        value: 0,
      });
    }

    event.target.value = "";
  };

  const removeExistingImage = (imagePath) => {
    const nextExisting = existingImages.filter((currentPath) => currentPath !== imagePath);
    setExistingImages(nextExisting);

    if (mainImageSelection.type === "existing" && mainImageSelection.value === imagePath) {
      if (nextExisting.length) {
        setMainImageSelection({
          type: "existing",
          value: nextExisting[0],
        });
      } else if (newImages.length) {
        setMainImageSelection({
          type: "new",
          value: 0,
        });
      } else {
        setMainImageSelection({
          type: "existing",
          value: "",
        });
      }
    }
  };

  const removeNewImage = (indexToRemove) => {
    const removed = newImages[indexToRemove];

    if (removed?.preview) {
      URL.revokeObjectURL(removed.preview);
    }

    const nextNewImages = newImages.filter((_, index) => index !== indexToRemove);
    setNewImages(nextNewImages);

    if (mainImageSelection.type === "new") {
      const selectedIndex = Number(mainImageSelection.value);

      if (selectedIndex === indexToRemove) {
        if (existingImages.length) {
          setMainImageSelection({
            type: "existing",
            value: existingImages[0],
          });
        } else if (nextNewImages.length) {
          setMainImageSelection({
            type: "new",
            value: 0,
          });
        } else {
          setMainImageSelection({
            type: "existing",
            value: "",
          });
        }
      } else if (selectedIndex > indexToRemove) {
        setMainImageSelection((prev) => ({
          ...prev,
          value: selectedIndex - 1,
        }));
      }
    }
  };

  const submitSection = async (event) => {
    event.preventDefault();

    const sectionName = sectionForm.name.trim();

    if (!sectionName) {
      setSectionError("Section name is required");
      return;
    }

    try {
      setSectionSaving(true);
      setSectionError("");

      const response = await fetch(
        editingSectionId ? apiUrl(`/products/sections/${editingSectionId}`) : apiUrl("/products/sections"),
        {
          method: editingSectionId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminKey,
          },
          body: JSON.stringify({
            name: sectionName,
            displayOrder: Number(sectionForm.displayOrder || 0),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to save section");
      }

      if (editingSectionId) {
        setSections((prev) =>
          sortSections(prev.map((section) => (section._id === data._id ? data : section)))
        );
      } else {
        setSections((prev) => sortSections([data, ...prev]));
      }

      if (!editingId) {
        setProductForm((prev) => ({
          ...prev,
          section: sectionName,
          category: prev.category || sectionName,
        }));
      }

      resetSectionForm();
    } catch (saveError) {
      setSectionError(saveError.message || "Failed to save section");
    } finally {
      setSectionSaving(false);
    }
  };

  const submitProduct = async (event) => {
    event.preventDefault();

    try {
      const productName = productForm.name.trim();
      const sectionName = productForm.section.trim();

      if (!productName || !sectionName) {
        setError("Product name and section are required");
        return;
      }

      if (!existingImages.length && !newImages.length) {
        setError("Please add at least one product image");
        return;
      }

      setSaving(true);
      setError("");

      const url = editingId
        ? apiUrl(`/products/${editingId}`)
        : apiUrl("/products");

      const method = editingId ? "PUT" : "POST";

      const formData = new FormData();

      formData.append("name", productName);
      formData.append("price", productForm.price || "0");
      formData.append("section", sectionName);
      formData.append("category", productForm.category.trim() || sectionName);
      formData.append("description", productForm.description.trim());
      formData.append("stock", productForm.stock || "0");
      formData.append("warranty", productForm.warranty.trim());
      formData.append("ratingAverage", productForm.ratingAverage || "0");
      formData.append("ratingCount", productForm.ratingCount || "0");
      formData.append("existingImages", JSON.stringify(existingImages));

      newImages.forEach((entry) => {
        formData.append("images", entry.file);
      });

      if (mainImageSelection.type === "existing" && mainImageSelection.value) {
        formData.append("mainImage", String(mainImageSelection.value));
      }

      if (mainImageSelection.type === "new") {
        const selectedNewIndex = Number(mainImageSelection.value);

        if (Number.isInteger(selectedNewIndex) && selectedNewIndex >= 0) {
          formData.append("mainImageIndex", String(existingImages.length + selectedNewIndex));
        }
      }

      const response = await fetch(url, {
        method,
        headers: {
          "x-admin-key": adminKey,
        },
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

      if (!sections.some((section) => section.name === data.section)) {
        setSections((prev) =>
          sortSections([
            ...prev,
            {
              _id: `temp-${Date.now()}`,
              name: data.section,
              displayOrder: prev.length,
            },
          ])
        );
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

      const response = await fetch(apiUrl(`/products/${id}`), {
        method: "DELETE",
        headers: {
          "x-admin-key": adminKey,
        },
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
    const normalizedImages = uniqueImages([...(product?.images || []), product?.image || ""]);

    setEditingId(product._id);
    setProductForm({
      name: product.name || "",
      price: String(product.price || ""),
      section: product.section || product.category || sections[0]?.name || "",
      category: product.category || "",
      description: product.description || "",
      stock: String(product.stock || ""),
      warranty: product.warranty || "",
      ratingAverage: String(product.ratingAverage ?? 0),
      ratingCount: String(product.ratingCount ?? 0),
    });

    newImages.forEach((entry) => {
      if (entry.preview) {
        URL.revokeObjectURL(entry.preview);
      }
    });

    setExistingImages(normalizedImages);
    setNewImages([]);
    setMainImageSelection({
      type: "existing",
      value: product.image || normalizedImages[0] || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateOrderStatus = async (orderId) => {
    const status = statusDrafts[orderId] || "Order Placed";

    try {
      setStatusUpdatingOrderId(orderId);
      setOrdersError("");

      const response = await fetch(apiUrl(`/orders/${orderId}/status`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to update order status");
      }

      setOrders((prev) => prev.map((order) => (order._id === orderId ? data.order : order)));
    } catch (updateError) {
      setOrdersError(updateError.message || "Failed to update order status");
    } finally {
      setStatusUpdatingOrderId("");
    }
  };

  const updateDeliveryDate = async (orderId) => {
    const expectedDelivery = deliveryDateDrafts[orderId] || "10-15 days";

    try {
      setDeliveryUpdatingOrderId(orderId);
      setOrdersError("");

      const response = await fetch(apiUrl(`/orders/${orderId}/delivery-date`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({ expectedDelivery }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to update delivery date");
      }

      setOrders((prev) => prev.map((order) => (order._id === orderId ? data.order : order)));
    } catch (updateError) {
      setOrdersError(updateError.message || "Failed to update delivery date");
    } finally {
      setDeliveryUpdatingOrderId("");
    }
  };

  const logout = () => {
    localStorage.removeItem("email");
    localStorage.removeItem("role");
    localStorage.removeItem("adminKey");
    navigate("/");
  };

  if (!isAdmin) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-slate-300">Admin access required.</p>
          <button
            type="button"
            onClick={() => navigate("/admin-login")}
            className="mt-4 btn-neon rounded-lg px-4 py-2 text-sm"
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
        <h1 className="text-3xl font-bold" style={{ background: "linear-gradient(135deg,#00d4ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Admin Dashboard</h1>
        <button
          type="button"
          onClick={logout}
          className="btn-danger rounded-lg px-4 py-2 text-sm"
        >
          Logout
        </button>
      </div>

      {error ? <p className="rounded-lg bg-rose-900/40 border border-rose-500/30 px-4 py-3 text-sm text-rose-400">{error}</p> : null}
      {sectionError ? <p className="rounded-lg bg-rose-900/40 border border-rose-500/30 px-4 py-3 text-sm text-rose-400">{sectionError}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_2fr]">
        <form onSubmit={submitSection} className="glass rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-white">Manage Sections</h2>

          <div className="mt-4 space-y-3">
            <input
              placeholder="Section name (e.g. Wooden Chair)"
              value={sectionForm.name}
              onChange={(event) => setSectionForm((prev) => ({ ...prev, name: event.target.value }))}
              className="input-dark w-full"
              />
              <input
                placeholder="Display order"
                type="number"
                value={sectionForm.displayOrder}
                onChange={(event) => setSectionForm((prev) => ({ ...prev, displayOrder: event.target.value }))}
                className="input-dark w-full"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={sectionSaving}
                className="btn-neon rounded-xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sectionSaving ? "Saving..." : editingSectionId ? "Update Section" : "Add Section"}
              </button>
              {editingSectionId ? (
                <button
                  type="button"
                  onClick={resetSectionForm}
                  className="btn-ghost rounded-xl px-4 py-2 text-sm"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {sections.map((section) => (
              <div key={section._id || section.name} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ border: "1px solid rgba(0,212,255,0.1)", background: "rgba(0,0,0,0.2)" }}>
                <div>
                  <p className="text-sm font-semibold text-white">{section.name}</p>
                  <p className="text-xs text-slate-400">Order: {Number(section.displayOrder || 0)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSectionId(section._id || "");
                    setSectionForm({
                      name: section.name,
                      displayOrder: String(section.displayOrder || 0),
                    });
                  }}
                  className="btn-ghost rounded-lg px-3 py-1.5 text-xs"
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        </form>

        <form onSubmit={submitProduct} className="glass rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white">
            {editingId ? "Edit Product" : "Add New Product"}
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input
              placeholder="Product Name"
              value={productForm.name}
              onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))}
              className="input-dark"
            />

            <select
              value={productForm.section}
              onChange={(event) =>
                setProductForm((prev) => ({
                  ...prev,
                  section: event.target.value,
                  category: prev.category || event.target.value,
                }))
              }
              className="input-dark"
            >
              <option value="">Select Section</option>
              {sections.map((section) => (
                <option key={section._id || section.name} value={section.name}>
                  {section.name}
                </option>
              ))}
            </select>

            <input
              placeholder="Category (optional)"
              value={productForm.category}
              onChange={(event) => setProductForm((prev) => ({ ...prev, category: event.target.value }))}
              className="input-dark"
            />

            <input
              placeholder="Price"
              type="number"
              min="0"
              value={productForm.price}
              onChange={(event) => setProductForm((prev) => ({ ...prev, price: event.target.value }))}
              className="input-dark"
            />

            <input
              placeholder="Stock"
              type="number"
              min="0"
              value={productForm.stock}
              onChange={(event) => setProductForm((prev) => ({ ...prev, stock: event.target.value }))}
              className="input-dark"
            />

            <input
              placeholder="Warranty"
              value={productForm.warranty}
              onChange={(event) => setProductForm((prev) => ({ ...prev, warranty: event.target.value }))}
              className="input-dark"
            />

            <input
              placeholder="Rating Average (0 to 5)"
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={productForm.ratingAverage}
              onChange={(event) => setProductForm((prev) => ({ ...prev, ratingAverage: event.target.value }))}
              className="input-dark"
            />

            <input
              placeholder="Rating Count"
              type="number"
              min="0"
              value={productForm.ratingCount}
              onChange={(event) => setProductForm((prev) => ({ ...prev, ratingCount: event.target.value }))}
              className="input-dark"
            />

            <textarea
              placeholder="Description"
              value={productForm.description}
              onChange={(event) => setProductForm((prev) => ({ ...prev, description: event.target.value }))}
              className="input-dark min-h-24 md:col-span-2"
            />
          </div>

          <div className="mt-5 rounded-2xl p-4" style={{ border: "1px solid rgba(0,212,255,0.12)", background: "rgba(0,0,0,0.3)" }}>
            <h3 className="text-sm font-semibold text-white">Add Product Pictures</h3>
            <p className="mt-1 text-xs text-slate-400">
              Upload multiple pictures and mark one as main image.
            </p>

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onAddNewImages}
              className="mt-3 block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-500 file:px-3 file:py-2 file:text-sm file:font-medium file:text-black hover:file:bg-cyan-400"
            />

            <div className="mt-4 space-y-3">
              {existingImages.length ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Saved Images</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {existingImages.map((imagePath) => (
                      <div key={imagePath} className="rounded-xl p-2" style={{ border: "1px solid rgba(0,212,255,0.1)", background: "rgba(255,255,255,0.05)" }}>
                        <img src={mediaUrl(imagePath)} alt="Existing product" className="h-20 w-full rounded-lg object-cover" />
                        <label className="mt-2 flex items-center gap-2 text-[11px] text-slate-300">
                          <input
                            type="radio"
                            name="main-image"
                            checked={mainImageSelection.type === "existing" && mainImageSelection.value === imagePath}
                            onChange={() => setMainImageSelection({ type: "existing", value: imagePath })}
                          />
                          Main
                        </label>
                        <button
                          type="button"
                          onClick={() => removeExistingImage(imagePath)}
                          className="mt-1 w-full rounded-md bg-rose-900/40 px-2 py-1 text-[11px] font-medium text-rose-300 hover:bg-rose-900/60"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {newImages.length ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">New Uploads</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {newImages.map((entry, index) => (
                      <div key={entry.id} className="rounded-xl p-2" style={{ border: "1px solid rgba(0,212,255,0.1)", background: "rgba(255,255,255,0.05)" }}>
                        <img src={entry.preview} alt="New product" className="h-20 w-full rounded-lg object-cover" />
                        <label className="mt-2 flex items-center gap-2 text-[11px] text-slate-300">
                          <input
                            type="radio"
                            name="main-image"
                            checked={mainImageSelection.type === "new" && Number(mainImageSelection.value) === index}
                            onChange={() => setMainImageSelection({ type: "new", value: index })}
                          />
                          Main
                        </label>
                        <button
                          type="button"
                          onClick={() => removeNewImage(index)}
                          className="mt-1 w-full rounded-md bg-rose-900/40 px-2 py-1 text-[11px] font-medium text-rose-300 hover:bg-rose-900/60"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="btn-neon rounded-xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : editingId ? "Update Product" : "Add Product"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="btn-ghost rounded-xl px-4 py-2 text-sm"
              >
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>
      </div>

      {loading ? <p className="text-cyan-400">Loading products...</p> : null}

      {!loading ? (
        groupedProducts.length ? (
          <div className="space-y-8">
            {groupedProducts.map((sectionGroup) => (
              <div key={sectionGroup.name} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">{sectionGroup.name}</h2>
                  <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "rgba(0,212,255,0.12)", color: "#00d4ff", border: "1px solid rgba(0,212,255,0.2)" }}>
                    {sectionGroup.products.length} products
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {sectionGroup.products.map((product) => (
                    <div key={product._id} className="space-y-2">
                      <ProductCard
                        product={product}
                        showAdminActions
                        onView={() => navigate(`/product/${product._id}`)}
                        onEdit={editProduct}
                        onDelete={deleteProduct}
                      />
                      <div className="rounded-xl px-3 py-2" style={{ border: "1px solid rgba(0,212,255,0.08)", background: "rgba(255,255,255,0.04)" }}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Rating Snapshot</p>
                        <StarRating
                          value={Number(product?.ratingAverage || 0)}
                          count={Number(product?.ratingCount || 0)}
                          size="sm"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="glass rounded-xl p-6 text-center text-slate-300">No products yet.</p>
        )
      ) : null}

      <div className="glass rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-white">Order Tracking Management</h2>
        {ordersError ? <p className="mt-3 rounded-lg bg-rose-900/40 border border-rose-500/30 px-3 py-2 text-sm text-rose-400">{ordersError}</p> : null}
        {ordersLoading ? <p className="mt-4 text-sm text-cyan-400">Loading orders...</p> : null}

        {!ordersLoading ? (
          orders.length ? (
            <div className="mt-4 space-y-4">
              {orders.map((order) => {
                const selectedStatus = statusDrafts[order._id] || order.status;
                const imagePath = order.productImage || "";

                return (
                  <div key={order._id} className="rounded-xl p-4 transition" style={{ border: "1px solid rgba(0,212,255,0.1)", background: "rgba(255,255,255,0.04)" }}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex gap-3 flex-1">
                        <img
                          src={imagePath ? mediaUrl(imagePath) : "https://placehold.co/140x100?text=No+Image"}
                          alt={order.productName}
                          className="h-20 w-24 rounded-lg object-cover shadow-sm"
                          onError={(e) => {
                            e.currentTarget.src = "https://placehold.co/140x100?text=No+Image";
                          }}
                        />

                        <div className="space-y-1 flex-1">
                          <p className="text-sm font-semibold text-white">{order.productName}</p>
                          <p className="text-xs text-slate-300">Order ID: <span className="font-medium">{order.orderCode}</span></p>
                          <p className="text-xs text-slate-300">Customer: {order.userName} • {order.userEmail}</p>
                          <p className="text-xs text-slate-300">Qty: {order.quantity} • Total: ₹{Number(order.totalAmount || 0).toFixed(2)}</p>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded px-2 py-1" style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.25)" }}><p className="text-cyan-300">📅 Placed: {new Date(order.createdAt).toLocaleDateString()}</p></div>
                            <div className="rounded px-2 py-1" style={{ background: "rgba(45,212,191,0.1)", border: "1px solid rgba(45,212,191,0.25)" }}><p className="text-teal-300">🚚 Delivery: {order.expectedDelivery}</p></div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 lg:min-w-80">
                        <div className="flex gap-2">
                          <select
                            value={selectedStatus}
                            onChange={(event) =>
                              setStatusDrafts((prev) => ({
                                ...prev,
                                [order._id]: event.target.value,
                              }))
                            }
                            className="input-dark flex-1"
                          >
                            {ORDER_STATUS_STEPS.map((statusOption) => (
                              <option key={statusOption} value={statusOption}>
                                {statusOption}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => updateOrderStatus(order._id)}
                            disabled={statusUpdatingOrderId === order._id}
                            className="btn-neon rounded-lg px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {statusUpdatingOrderId === order._id ? "..." : "Update"}
                          </button>
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={deliveryDateDrafts[order._id] || order.expectedDelivery || "10-15 days"}
                            onChange={(e) =>
                              setDeliveryDateDrafts((prev) => ({
                                ...prev,
                                [order._id]: e.target.value,
                              }))
                            }
                            placeholder="e.g., 5-7 days"
                            className="input-dark flex-1 text-xs"
                          />

                          <button
                            type="button"
                            onClick={() => updateDeliveryDate(order._id)}
                            disabled={deliveryUpdatingOrderId === order._id}
                            className="btn-ghost rounded-lg px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deliveryUpdatingOrderId === order._id ? "..." : "Set"}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl p-3" style={{ border: "1px solid rgba(0,212,255,0.12)", background: "rgba(0,0,0,0.25)" }}>
                      <OrderTimeline status={order.status} compact />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">No orders found.</p>
          )
        ) : null}
      </div>
    </section>
  );
}

export default AdminDashboard;