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

  const logout = () => {
    localStorage.removeItem("email");
    localStorage.removeItem("role");
    localStorage.removeItem("adminKey");
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
          className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600"
        >
          Logout
        </button>
      </div>

      {error ? <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null}
      {sectionError ? <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">{sectionError}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_2fr]">
        <form onSubmit={submitSection} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Manage Sections</h2>

          <div className="mt-4 space-y-3">
            <input
              placeholder="Section name (e.g. Wooden Chair)"
              value={sectionForm.name}
              onChange={(event) => setSectionForm((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            />
            <input
              placeholder="Display order"
              type="number"
              value={sectionForm.displayOrder}
              onChange={(event) => setSectionForm((prev) => ({ ...prev, displayOrder: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={sectionSaving}
                className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sectionSaving ? "Saving..." : editingSectionId ? "Update Section" : "Add Section"}
              </button>
              {editingSectionId ? (
                <button
                  type="button"
                  onClick={resetSectionForm}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {sections.map((section) => (
              <div key={section._id || section.name} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{section.name}</p>
                  <p className="text-xs text-slate-500">Order: {Number(section.displayOrder || 0)}</p>
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
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        </form>

        <form onSubmit={submitProduct} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            {editingId ? "Edit Product" : "Add New Product"}
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input
              placeholder="Product Name"
              value={productForm.name}
              onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))}
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
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
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
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
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            />

            <input
              placeholder="Price"
              type="number"
              min="0"
              value={productForm.price}
              onChange={(event) => setProductForm((prev) => ({ ...prev, price: event.target.value }))}
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            />

            <input
              placeholder="Stock"
              type="number"
              min="0"
              value={productForm.stock}
              onChange={(event) => setProductForm((prev) => ({ ...prev, stock: event.target.value }))}
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            />

            <input
              placeholder="Warranty"
              value={productForm.warranty}
              onChange={(event) => setProductForm((prev) => ({ ...prev, warranty: event.target.value }))}
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            />

            <input
              placeholder="Rating Average (0 to 5)"
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={productForm.ratingAverage}
              onChange={(event) => setProductForm((prev) => ({ ...prev, ratingAverage: event.target.value }))}
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            />

            <input
              placeholder="Rating Count"
              type="number"
              min="0"
              value={productForm.ratingCount}
              onChange={(event) => setProductForm((prev) => ({ ...prev, ratingCount: event.target.value }))}
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            />

            <textarea
              placeholder="Description"
              value={productForm.description}
              onChange={(event) => setProductForm((prev) => ({ ...prev, description: event.target.value }))}
              className="min-h-24 rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 md:col-span-2"
            />
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Add Product Pictures</h3>
            <p className="mt-1 text-xs text-slate-600">
              Upload multiple pictures and mark one as main image.
            </p>

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onAddNewImages}
              className="mt-3 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-700 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-indigo-600"
            />

            <div className="mt-4 space-y-3">
              {existingImages.length ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Saved Images</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {existingImages.map((imagePath) => (
                      <div key={imagePath} className="rounded-xl border border-slate-200 bg-white p-2">
                        <img src={mediaUrl(imagePath)} alt="Existing product" className="h-20 w-full rounded-lg object-cover" />
                        <label className="mt-2 flex items-center gap-2 text-[11px] text-slate-600">
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
                          className="mt-1 w-full rounded-md bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-100"
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
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">New Uploads</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {newImages.map((entry, index) => (
                      <div key={entry.id} className="rounded-xl border border-slate-200 bg-white p-2">
                        <img src={entry.preview} alt="New product" className="h-20 w-full rounded-lg object-cover" />
                        <label className="mt-2 flex items-center gap-2 text-[11px] text-slate-600">
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
                          className="mt-1 w-full rounded-md bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-100"
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
              className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : editingId ? "Update Product" : "Add Product"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>
      </div>

      {loading ? <p className="text-slate-600">Loading products...</p> : null}

      {!loading ? (
        groupedProducts.length ? (
          <div className="space-y-8">
            {groupedProducts.map((sectionGroup) => (
              <div key={sectionGroup.name} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900">{sectionGroup.name}</h2>
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
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
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rating Snapshot</p>
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
          <p className="rounded-xl bg-white p-6 text-center text-slate-600 shadow-sm">No products yet.</p>
        )
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Order Tracking Management</h2>
        {ordersError ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{ordersError}</p> : null}
        {ordersLoading ? <p className="mt-4 text-sm text-slate-600">Loading orders...</p> : null}

        {!ordersLoading ? (
          orders.length ? (
            <div className="mt-4 space-y-4">
              {orders.map((order) => {
                const selectedStatus = statusDrafts[order._id] || order.status;
                const imagePath = order.productImage || "";

                return (
                  <div key={order._id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex gap-3">
                        <img
                          src={imagePath ? mediaUrl(imagePath) : "https://placehold.co/140x100?text=No+Image"}
                          alt={order.productName}
                          className="h-20 w-24 rounded-lg object-cover"
                        />

                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-900">{order.productName}</p>
                          <p className="text-xs text-slate-500">Order ID: {order.orderCode}</p>
                          <p className="text-xs text-slate-500">Customer: {order.userName} • {order.userEmail}</p>
                          <p className="text-xs text-slate-500">
                            Qty: {order.quantity} • Total: ₹{Number(order.totalAmount || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={selectedStatus}
                          onChange={(event) =>
                            setStatusDrafts((prev) => ({
                              ...prev,
                              [order._id]: event.target.value,
                            }))
                          }
                          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400"
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
                          className="rounded-xl bg-indigo-700 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {statusUpdatingOrderId === order._id ? "Updating..." : "Update Status"}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <OrderTimeline status={order.status} compact />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-600">No orders found.</p>
          )
        ) : null}
      </div>
    </section>
  );
}

export default AdminDashboard;