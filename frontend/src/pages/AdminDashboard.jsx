import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import OrderTimeline, { ORDER_STATUS_STEPS } from "../components/OrderTimeline";
import ProductCard from "../components/ProductCard";
import StarRating from "../components/StarRating";
import ImageLightbox from "../components/ImageLightbox";
import { apiFetch, apiFetchJson, mediaUrl, parseApiResponseJson, resolveApiErrorMessage } from "../config/api";
import { showToast } from "../config/toast";

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
  taxRatePercent: "",
  shippingCharge: "",
};

const defaultSectionForm = {
  name: "",
  displayOrder: "",
};

const defaultPricingForm = {
  taxRatePercent: "8",
  shippingCharge: "79",
};

const defaultSiteContentForm = {
  shopName: "",
  tagline: "",
  contactNumber: "",
  whatsAppNumber: "",
  address: "",
  email: "",
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

const fetchApiWithFallback = async (path, options = {}) => {
  return apiFetch(path, options);
};

const parseApiResponse = async (response) => {
  return parseApiResponseJson(response);
};

const wait = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const isValidPhoneNumber = (value = "") => {
  const digits = String(value || "").replace(/\D+/g, "");
  return digits.length >= 10 && digits.length <= 15;
};

const getOrderTimestamp = (order = {}) => {
  const source = order?.cancelledAt || order?.updatedAt || order?.createdAt;
  const timestamp = new Date(source || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const formatOrderAddress = (address = {}) => {
  if (typeof address === "string") {
    return address;
  }

  const fullAddress = String(address?.fullAddress || "").trim();

  if (fullAddress) {
    return fullAddress;
  }

  return [
    address?.line1,
    address?.landmark,
    address?.villageTown,
    address?.wardNo ? `Ward No ${address.wardNo}` : "",
    address?.district,
    address?.state,
    address?.pincode,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(", ");
};

function AdminDashboard() {
  const [products, setProducts] = useState([]);
  const [sections, setSections] = useState([]);
  const [orders, setOrders] = useState([]);

  const [productForm, setProductForm] = useState(defaultProductForm);
  const [sectionForm, setSectionForm] = useState(defaultSectionForm);
  const [pricingForm, setPricingForm] = useState(defaultPricingForm);
  const [siteContentForm, setSiteContentForm] = useState(defaultSiteContentForm);

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
  const [pricingSaving, setPricingSaving] = useState(false);
  const [siteContentSaving, setSiteContentSaving] = useState(false);
  const [statusUpdatingOrderId, setStatusUpdatingOrderId] = useState("");

  const [error, setError] = useState("");
  const [sectionError, setSectionError] = useState("");
  const [pricingError, setPricingError] = useState("");
  const [siteContentError, setSiteContentError] = useState("");
  const [pricingNotice, setPricingNotice] = useState("");
  const [ordersError, setOrdersError] = useState("");
  const [statusDrafts, setStatusDrafts] = useState({});
  const [deliveryDateDrafts, setDeliveryDateDrafts] = useState({});
  const [deliveryUpdatingOrderId, setDeliveryUpdatingOrderId] = useState("");
  const [cancelNotifications, setCancelNotifications] = useState([]);
  const [deletingOrderId, setDeletingOrderId] = useState("");
  const [previewImage, setPreviewImage] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80");
  const [heroImageFile, setHeroImageFile] = useState(null);
  const [heroImageSaving, setHeroImageSaving] = useState(false);
  const [heroImageError, setHeroImageError] = useState("");

  const latestUserCancellationTsRef = useRef(0);
  const productEditorRef = useRef(null);

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
        setPricingError("");
        setSiteContentError("");
        setPricingNotice("");
        setOrdersError("");

        const [productsResult, sectionsResult] = await Promise.all([
          apiFetchJson("/products"),
          apiFetchJson("/products/sections"),
        ]);

        const productsResponse = productsResult.response;
        const sectionsResponse = sectionsResult.response;
        const productsData = productsResult.data;
        const sectionsData = sectionsResult.data;

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

        try {
          const { response: pricingResponse, data: pricingData } = await apiFetchJson("/settings/checkout-pricing");

          if (pricingResponse.ok) {
            const taxPercent = Number(pricingData?.taxRate || 0) * 100;

            setPricingForm({
              taxRatePercent: Number.isFinite(taxPercent) ? String(Number(taxPercent.toFixed(2))) : defaultPricingForm.taxRatePercent,
              shippingCharge: Number.isFinite(Number(pricingData?.shippingCharge))
                ? String(Number(pricingData.shippingCharge).toFixed(2))
                : defaultPricingForm.shippingCharge,
            });
          }
        } catch {
          setPricingError("Failed to load checkout pricing settings");
        }

        try {
          const { response: siteContentResponse, data: siteContentData } = await apiFetchJson("/site-content");

          if (siteContentResponse.ok) {
            setSiteContentForm({
              shopName: String(siteContentData?.shopName || "").trim(),
              tagline: String(siteContentData?.tagline || "").trim(),
              contactNumber: String(siteContentData?.contactNumber || "").trim(),
              whatsAppNumber: String(siteContentData?.whatsAppNumber || "").trim(),
              address: String(siteContentData?.address || "").trim(),
              email: String(siteContentData?.email || "").trim(),
            });
          }
        } catch {
          setSiteContentError("Failed to load top showcase/contact content");
        }

        const { response: ordersResponse, data: ordersData } = await apiFetchJson("/orders/admin/all", {
          headers: {
            "x-admin-key": adminKey,
          },
        });

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
        setDeliveryDateDrafts(
          normalizedOrders.reduce((accumulator, order) => {
            accumulator[order._id] = order.expectedDelivery || "10-15 days";
            return accumulator;
          }, {})
        );

        latestUserCancellationTsRef.current = normalizedOrders.reduce((maxTimestamp, order) => {
          if (order?.status !== "Cancelled" || order?.cancelledBy !== "user") {
            return maxTimestamp;
          }

          return Math.max(maxTimestamp, getOrderTimestamp(order));
        }, 0);
        setCancelNotifications([]);
      } catch (loadError) {
        const message = resolveApiErrorMessage(loadError, "Failed to load admin dashboard");
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

  useEffect(() => {
    if (!isAdmin || !adminKey) {
      return undefined;
    }

    const intervalId = setInterval(async () => {
      try {
        const { response, data } = await apiFetchJson("/orders/admin/all", {
          headers: {
            "x-admin-key": adminKey,
          },
        });

        if (!response.ok) {
          return;
        }

        const normalizedOrders = Array.isArray(data) ? data : [];
        const previousLatest = latestUserCancellationTsRef.current || 0;

        const newUserCancellations = normalizedOrders
          .filter((order) => order?.status === "Cancelled" && order?.cancelledBy === "user")
          .filter((order) => getOrderTimestamp(order) > previousLatest)
          .sort((first, second) => getOrderTimestamp(second) - getOrderTimestamp(first));

        if (newUserCancellations.length) {
          latestUserCancellationTsRef.current = newUserCancellations.reduce(
            (maxTimestamp, order) => Math.max(maxTimestamp, getOrderTimestamp(order)),
            previousLatest
          );

          setCancelNotifications((prev) => [
            ...newUserCancellations.map((order) => ({
              id: `${order._id}-${order.cancelledAt || order.updatedAt || Date.now()}`,
              orderId: order._id,
              orderCode: order.orderCode,
              userName: order.userName,
              reason: order.cancellationReason || "Cancelled by user",
            })),
            ...prev,
          ].slice(0, 12));
        } else {
          latestUserCancellationTsRef.current = normalizedOrders.reduce((maxTimestamp, order) => {
            if (order?.status !== "Cancelled" || order?.cancelledBy !== "user") {
              return maxTimestamp;
            }

            return Math.max(maxTimestamp, getOrderTimestamp(order));
          }, previousLatest);
        }

        setOrders(normalizedOrders);
        setStatusDrafts(
          normalizedOrders.reduce((accumulator, order) => {
            accumulator[order._id] = order.status;
            return accumulator;
          }, {})
        );
        setDeliveryDateDrafts((prev) =>
          normalizedOrders.reduce((accumulator, order) => {
            accumulator[order._id] = prev[order._id] || order.expectedDelivery || "10-15 days";
            return accumulator;
          }, {})
        );
      } catch {}
    }, 10000);

    return () => {
      clearInterval(intervalId);
    };
  }, [adminKey, isAdmin]);

  useEffect(() => {
    const loadHeroImage = async () => {
      try {
        const { response, data } = await apiFetchJson("/settings/hero-image");

        if (response.ok && data?.heroImageUrl) {
          setHeroImageUrl(data.heroImageUrl);
        }
      } catch (error) {
        // Use default fallback image
      }
    };

    loadHeroImage();
  }, []);

  const saveHeroImage = async (event) => {
    event.preventDefault();

    if (!heroImageFile && !heroImageUrl) {
      setHeroImageError("Please select or enter a hero image URL");
      return;
    }

    try {
      setHeroImageSaving(true);
      setHeroImageError("");

      const formData = new FormData();

      if (heroImageFile) {
        formData.append("heroImage", heroImageFile);
      } else {
        formData.append("heroImageUrl", heroImageUrl);
      }

      const { response, data } = await apiFetchJson("/settings/hero-image", {
        method: "PUT",
        body: formData,
        headers: {
          "x-admin-key": adminKey,
        },
      });

      if (!response.ok) {
        throw new Error(data?.message || "Failed to update hero image");
      }

      setHeroImageUrl(data?.heroImageUrl || heroImageUrl);
      setHeroImageFile(null);
      showToast("Hero image updated", "success");
    } catch (saveError) {
      setHeroImageError(resolveApiErrorMessage(saveError, "Failed to update hero image"));
      showToast("Failed to update hero image", "error");
    } finally {
      setHeroImageSaving(false);
    }
  };

  const saveSiteContent = async (event) => {
    event.preventDefault();

    const shopName = String(siteContentForm.shopName || "").trim();
    const tagline = String(siteContentForm.tagline || "").trim();
    const contactNumber = String(siteContentForm.contactNumber || "").trim();
    const whatsAppNumber = String(siteContentForm.whatsAppNumber || "").trim();
    const address = String(siteContentForm.address || "").trim();
    const email = String(siteContentForm.email || "").trim();

    if (!shopName) {
      setSiteContentError("Shop name is required");
      return;
    }

    if (!tagline) {
      setSiteContentError("Tagline is required");
      return;
    }

    if (contactNumber && !isValidPhoneNumber(contactNumber)) {
      setSiteContentError("Contact number must contain 10 to 15 digits");
      return;
    }

    if (whatsAppNumber && !isValidPhoneNumber(whatsAppNumber)) {
      setSiteContentError("WhatsApp number must contain 10 to 15 digits");
      return;
    }

    try {
      setSiteContentSaving(true);
      setSiteContentError("");

      const { response, data } = await apiFetchJson("/site-content", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({
          shopName,
          tagline,
          contactNumber,
          whatsAppNumber,
          address,
          email,
        }),
      });

      if (!response.ok) {
        throw new Error(data?.message || "Failed to update site content");
      }

      const nextContent = data?.siteContent || {
        shopName,
        tagline,
        contactNumber,
        whatsAppNumber,
        address,
        email,
      };

      setSiteContentForm({
        shopName: String(nextContent?.shopName || ""),
        tagline: String(nextContent?.tagline || ""),
        contactNumber: String(nextContent?.contactNumber || ""),
        whatsAppNumber: String(nextContent?.whatsAppNumber || ""),
        address: String(nextContent?.address || ""),
        email: String(nextContent?.email || ""),
      });

      showToast("Top showcase and contact details updated", "success");
    } catch (saveError) {
      setSiteContentError(resolveApiErrorMessage(saveError, "Failed to update site content"));
      showToast("Failed to update site content", "error");
    } finally {
      setSiteContentSaving(false);
    }
  };

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

  const userCancelledOrders = useMemo(
    () => orders.filter((order) => order?.status === "Cancelled" && order?.cancelledBy === "user"),
    [orders]
  );

  const managedOrders = useMemo(
    () => orders.filter((order) => !(order?.status === "Cancelled" && order?.cancelledBy === "user")),
    [orders]
  );

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

  const startAddProductForSection = (sectionName = "") => {
    const normalizedSection = String(sectionName || "").trim() || sections[0]?.name || "General";

    resetForm();
    setProductForm((prev) => ({
      ...prev,
      section: normalizedSection,
      category: normalizedSection,
    }));

    window.setTimeout(() => {
      productEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  const deleteSection = async (section) => {
    const sectionId = String(section?._id || "");
    const sectionName = String(section?.name || "").trim();

    if (!sectionId || !sectionName) {
      return;
    }

    if (sectionName.toLowerCase() === "general") {
      setSectionError("General section cannot be deleted");
      return;
    }

    const confirmed = window.confirm(`Delete section '${sectionName}'? Products will be moved to General.`);

    if (!confirmed) {
      return;
    }

    try {
      setSectionSaving(true);
      setSectionError("");

      const { response, data } = await apiFetchJson(`/products/sections/${sectionId}`, {
        method: "DELETE",
        headers: {
          "x-admin-key": adminKey,
        },
      });

      if (!response.ok) {
        throw new Error(data?.message || "Failed to delete section");
      }

      setSections((prev) => prev.filter((item) => item._id !== sectionId));
      setProducts((prev) => prev.map((product) => {
        const currentSection = String(product?.section || product?.category || "").trim();

        if (currentSection !== sectionName) {
          return product;
        }

        return {
          ...product,
          section: "General",
          category: "General",
        };
      }));

      if (editingSectionId === sectionId) {
        resetSectionForm();
      }

      setProductForm((prev) => {
        if (String(prev.section || "").trim() !== sectionName) {
          return prev;
        }

        return {
          ...prev,
          section: "General",
          category: "General",
        };
      });

      showToast("Section deleted successfully", "success");
    } catch (deleteError) {
      setSectionError(resolveApiErrorMessage(deleteError, "Failed to delete section"));
      showToast("Failed to delete section", "error");
    } finally {
      setSectionSaving(false);
    }
  };

  const saveCheckoutPricing = async (event) => {
    event.preventDefault();

    const taxPercent = Number(pricingForm.taxRatePercent);
    const shippingCharge = Number(pricingForm.shippingCharge);

    if (!Number.isFinite(taxPercent) || taxPercent < 0 || taxPercent > 100) {
      setPricingError("Tax rate must be between 0 and 100");
      setPricingNotice("");
      return;
    }

    if (!Number.isFinite(shippingCharge) || shippingCharge < 0) {
      setPricingError("Shipping charge must be a non-negative number");
      setPricingNotice("");
      return;
    }

    try {
      setPricingSaving(true);
      setPricingError("");
      setPricingNotice("");

      const { response, data } = await apiFetchJson("/settings/checkout-pricing", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({
          taxRate: Number((taxPercent / 100).toFixed(4)),
          shippingCharge: Number(shippingCharge.toFixed(2)),
        }),
      });

      if (!response.ok) {
        throw new Error(data?.message || "Failed to update checkout pricing settings");
      }

      const settings = data?.settings || {};
      setPricingForm({
        taxRatePercent: String(Number((Number(settings.taxRate || 0) * 100).toFixed(2))),
        shippingCharge: String(Number(Number(settings.shippingCharge || 0).toFixed(2))),
      });
      setPricingNotice("Checkout pricing settings updated successfully");
    } catch (saveError) {
      setPricingError(resolveApiErrorMessage(saveError, "Failed to update checkout pricing settings"));
    } finally {
      setPricingSaving(false);
    }
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

      const sectionPath = editingSectionId ? `/products/sections/${editingSectionId}` : "/products/sections";
      const { response, data } = await apiFetchJson(sectionPath, {
        method: editingSectionId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({
          name: sectionName,
          displayOrder: Number(sectionForm.displayOrder || 0),
        }),
      });

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
      showToast(editingSectionId ? "Section updated" : "Section added", "success");
    } catch (saveError) {
      setSectionError(resolveApiErrorMessage(saveError, "Failed to save section"));
      showToast("Failed to save section", "error");
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

      const requestCandidates = editingId
        ? [
          { path: `/products/${editingId}/update`, method: "POST" },
          { path: `/products/${editingId}`, method: "PUT" },
        ]
        : [{ path: "/products", method: "POST" }];

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
      formData.append("taxRatePercent", String(productForm.taxRatePercent || "").trim());
      formData.append("shippingCharge", String(productForm.shippingCharge || "").trim());
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

      let data = {};
      let saveSucceeded = false;

      for (let index = 0; index < requestCandidates.length; index += 1) {
        const candidate = requestCandidates[index];
        let response = null;

        for (let attempt = 1; attempt <= 3; attempt += 1) {
          try {
            response = await fetchApiWithFallback(candidate.path, {
              method: candidate.method,
              headers: {
                "x-admin-key": adminKey,
              },
              body: formData,
            });
          } catch (requestError) {
            const isNetworkError =
              requestError instanceof TypeError &&
              /failed to fetch/i.test(String(requestError.message || ""));

            if (isNetworkError && attempt < 3) {
              await wait(1200 * attempt);
              continue;
            }

            throw requestError;
          }

          data = await parseApiResponse(response);

          if (response.ok) {
            saveSucceeded = true;
            break;
          }

          const responseMessage = String(data?.message || "");
          const isTransientGatewayError = [502, 503, 504].includes(response.status)
            || /hibernate|gateway|service unavailable|temporarily unavailable/i.test(responseMessage);

          if (isTransientGatewayError && attempt < 3) {
            await wait(1200 * attempt);
            continue;
          }

          break;
        }

        if (saveSucceeded) {
          break;
        }

        if (!response) {
          throw new Error("Failed to save product");
        }

        const responseMessage = String(data?.message || "");
        const shouldRetryWithLegacyEditRoute =
          Boolean(editingId) &&
          index === 0 &&
          (response.status === 404 ||
            response.status === 405 ||
            /cannot\s+post/i.test(responseMessage));

        if (shouldRetryWithLegacyEditRoute) {
          continue;
        }

        throw new Error(data?.message || `Failed to save product (HTTP ${response.status})`);
      }

      if (!saveSucceeded) {
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
      showToast(editingId ? "Product updated" : "Product added", "success");
    } catch (saveError) {
      const isNetworkError =
        saveError instanceof TypeError &&
        /failed to fetch/i.test(String(saveError.message || ""));

      setError(
        isNetworkError
          ? "Failed to connect to backend while saving product. Please check backend server/API URL and try again."
          : resolveApiErrorMessage(saveError, "Failed to save product")
      );
      showToast("Failed to save product", "error");
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

      const { response, data } = await apiFetchJson(`/products/${id}`, {
        method: "DELETE",
        headers: {
          "x-admin-key": adminKey,
        },
      });

      if (!response.ok) {
        throw new Error(data?.message || "Failed to delete product");
      }

      setProducts((prev) => prev.filter((product) => product._id !== id));
      showToast("Product deleted", "success");
    } catch (deleteError) {
      setError(resolveApiErrorMessage(deleteError, "Failed to delete product"));
      showToast("Failed to delete product", "error");
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
      taxRatePercent: product.taxRatePercent !== null && product.taxRatePercent !== undefined
        ? String(product.taxRatePercent)
        : Number.isFinite(Number(product.taxRate))
          ? String(Number((Number(product.taxRate) * 100).toFixed(2)))
          : "",
      shippingCharge: product.shippingCharge !== null && product.shippingCharge !== undefined
        ? String(product.shippingCharge)
        : "",
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
    const requestPayload = { status };

    if (status === "Cancelled") {
      const reasonInput = window.prompt("Enter cancellation reason", "Cancelled by admin");

      if (reasonInput === null) {
        return;
      }

      const normalizedReason = String(reasonInput || "").trim();

      requestPayload.cancellationReasonCode = "cancelled_by_admin";
      requestPayload.cancellationReason = normalizedReason || "Cancelled by admin";
    }

    try {
      setStatusUpdatingOrderId(orderId);
      setOrdersError("");

      const { response, data } = await apiFetchJson(`/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        throw new Error(data?.message || "Failed to update order status");
      }

      setOrders((prev) => prev.map((order) => (order._id === orderId ? data.order : order)));
    } catch (updateError) {
      setOrdersError(resolveApiErrorMessage(updateError, "Failed to update order status"));
    } finally {
      setStatusUpdatingOrderId("");
    }
  };

  const updateDeliveryDate = async (orderId) => {
    const expectedDelivery = deliveryDateDrafts[orderId] || "10-15 days";

    try {
      setDeliveryUpdatingOrderId(orderId);
      setOrdersError("");

      const { response, data } = await apiFetchJson(`/orders/${orderId}/delivery-date`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({ expectedDelivery }),
      });

      if (!response.ok) {
        throw new Error(data?.message || "Failed to update delivery date");
      }

      setOrders((prev) => prev.map((order) => (order._id === orderId ? data.order : order)));
    } catch (updateError) {
      setOrdersError(resolveApiErrorMessage(updateError, "Failed to update delivery date"));
    } finally {
      setDeliveryUpdatingOrderId("");
    }
  };

  const deleteCancelledOrder = async (orderId) => {
    try {
      const confirmed = window.confirm("Delete this cancelled order permanently?");

      if (!confirmed) {
        return;
      }

      setDeletingOrderId(orderId);
      setOrdersError("");

      const { response, data } = await apiFetchJson(`/orders/${orderId}/admin-delete`, {
        method: "DELETE",
        headers: {
          "x-admin-key": adminKey,
        },
      });

      if (!response.ok) {
        throw new Error(data?.message || "Failed to delete cancelled order");
      }

      setOrders((prev) => prev.filter((order) => order._id !== orderId));
      setStatusDrafts((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      setDeliveryDateDrafts((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      setCancelNotifications((prev) => prev.filter((notification) => notification.orderId !== orderId));
    } catch (deleteError) {
      setOrdersError(resolveApiErrorMessage(deleteError, "Failed to delete cancelled order"));
    } finally {
      setDeletingOrderId("");
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
          <p style={{ color: "#3a5470" }}>Admin access required.</p>
          <button
            type="button"
            onClick={() => navigate("/admin")}
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
        <h1 className="text-3xl font-bold" style={{ background: "linear-gradient(135deg,#0284c7,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Admin Dashboard</h1>
        <button
          type="button"
          onClick={logout}
          className="btn-danger rounded-lg px-4 py-2 text-sm"
        >
          Logout
        </button>
      </div>

      {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null}
      {sectionError ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{sectionError}</p> : null}
      {pricingError ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{pricingError}</p> : null}
      {siteContentError ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{siteContentError}</p> : null}
      {pricingNotice ? <p className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">{pricingNotice}</p> : null}

      {cancelNotifications.length ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-amber-800">New User Cancellation Notifications</h2>
            <button
              type="button"
              onClick={() => setCancelNotifications([])}
              className="rounded-lg border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100"
            >
              Clear
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {cancelNotifications.map((notification) => (
              <div key={notification.id} className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-amber-900">
                <p className="font-semibold">{notification.orderCode} • {notification.userName}</p>
                <p className="mt-0.5">Reason: {notification.reason}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_2fr]">
        <div className="space-y-6">
          <form onSubmit={saveSiteContent} className="glass rounded-2xl p-5">
            <h2 className="text-lg font-semibold" style={{ color: "#1a2f48" }}>Top Showcase & Contact Content</h2>
            <p className="mt-1 text-xs" style={{ color: "#6080a0" }}>
              Manage top showcase details and home page contact section content.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#6080a0" }}>
                  Shop Name
                </label>
                <input
                  value={siteContentForm.shopName}
                  onChange={(event) => setSiteContentForm((prev) => ({ ...prev, shopName: event.target.value }))}
                  className="input-dark w-full"
                  placeholder="Maa Sheela Iron Art"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#6080a0" }}>
                  Tagline
                </label>
                <textarea
                  value={siteContentForm.tagline}
                  onChange={(event) => setSiteContentForm((prev) => ({ ...prev, tagline: event.target.value }))}
                  className="input-dark min-h-20 w-full"
                  placeholder="We provide high-quality furniture, iron works, wooden products, custom designs, and more at the best prices."
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#6080a0" }}>
                  Contact Number
                </label>
                <input
                  value={siteContentForm.contactNumber}
                  onChange={(event) => setSiteContentForm((prev) => ({ ...prev, contactNumber: event.target.value }))}
                  className="input-dark w-full"
                  placeholder="9876543210"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#6080a0" }}>
                  WhatsApp Number
                </label>
                <input
                  value={siteContentForm.whatsAppNumber}
                  onChange={(event) => setSiteContentForm((prev) => ({ ...prev, whatsAppNumber: event.target.value }))}
                  className="input-dark w-full"
                  placeholder="919876543210"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#6080a0" }}>
                  Address
                </label>
                <textarea
                  value={siteContentForm.address}
                  onChange={(event) => setSiteContentForm((prev) => ({ ...prev, address: event.target.value }))}
                  className="input-dark min-h-20 w-full"
                  placeholder="Enter full shop address"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#6080a0" }}>
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={siteContentForm.email}
                  onChange={(event) => setSiteContentForm((prev) => ({ ...prev, email: event.target.value }))}
                  className="input-dark w-full"
                  placeholder="example@domain.com"
                />
              </div>

              <button
                type="submit"
                disabled={siteContentSaving}
                className="btn-neon rounded-xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {siteContentSaving ? "Saving..." : "Save Showcase & Contact"}
              </button>
            </div>
          </form>

          <form onSubmit={saveCheckoutPricing} className="glass rounded-2xl p-5">
            <h2 className="text-lg font-semibold" style={{ color: "#1a2f48" }}>Checkout Pricing Settings</h2>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#6080a0" }}>
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={pricingForm.taxRatePercent}
                  onChange={(event) => setPricingForm((prev) => ({ ...prev, taxRatePercent: event.target.value }))}
                  className="input-dark w-full"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#6080a0" }}>
                  Shipping Charge (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pricingForm.shippingCharge}
                  onChange={(event) => setPricingForm((prev) => ({ ...prev, shippingCharge: event.target.value }))}
                  className="input-dark w-full"
                />
              </div>

              <button
                type="submit"
                disabled={pricingSaving}
                className="btn-neon rounded-xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pricingSaving ? "Saving..." : "Save Pricing"}
              </button>
            </div>
          </form>

          <form onSubmit={saveHeroImage} className="glass rounded-2xl p-5">
            <h2 className="text-lg font-semibold" style={{ color: "#1a2f48" }}>Hero Section Image</h2>
            <p className="mt-1 text-xs" style={{ color: "#6080a0" }}>
              Upload or enter a URL for the hero section image displayed on the homepage.
            </p>

            {heroImageUrl ? (
              <div className="mt-4 rounded-xl overflow-hidden border border-blue-200" style={{ background: "rgba(255,255,255,0.78)" }}>
                <img
                  src={heroImageUrl}
                  alt="Hero preview"
                  className="h-40 w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80";
                  }}
                />
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#1a2f48" }}>Upload Image (or enter URL below)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    setHeroImageFile(event.target.files?.[0] || null);
                    if (event.target.files?.[0]) {
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        setHeroImageUrl(e.target?.result || "");
                      };
                      reader.readAsDataURL(event.target.files[0]);
                    }
                  }}
                  className="input-dark w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#1a2f48" }}>Or enter Image URL</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={heroImageFile ? "" : heroImageUrl}
                  onChange={(event) => setHeroImageUrl(event.target.value)}
                  disabled={Boolean(heroImageFile)}
                  className="input-dark w-full disabled:opacity-60"
                />
              </div>
            </div>

            {heroImageError ? (
              <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
                {heroImageError}
              </p>
            ) : null}

            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                disabled={heroImageSaving}
                className="btn-neon rounded-xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60 flex-1"
              >
                {heroImageSaving ? "Saving..." : "Save Hero Image"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setHeroImageFile(null);
                  setHeroImageUrl("https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80");
                }}
                className="btn-ghost rounded-xl px-4 py-2 text-sm"
              >
                Reset to Default
              </button>
            </div>
          </form>

          <form onSubmit={submitSection} className="glass rounded-2xl p-5">
            <h2 className="text-lg font-semibold" style={{ color: "#1a2f48" }}>Manage Sections</h2>
            <p className="mt-1 text-xs" style={{ color: "#6080a0" }}>
              Create, edit, delete sections and directly launch the full product editor for any section.
            </p>

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

                <button
                  type="button"
                  onClick={() => startAddProductForSection(sectionForm.name)}
                  className="btn-ghost rounded-xl px-4 py-2 text-sm"
                >
                  Add Product Here
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {sections.map((section) => (
                <div key={section._id || section.name} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2" style={{ border: "1px solid rgba(100,160,220,0.18)", background: "rgba(255,255,255,0.78)" }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#1a2f48" }}>{section.name}</p>
                    <p className="text-xs" style={{ color: "#6080a0" }}>Order: {Number(section.displayOrder || 0)}</p>
                  </div>

                  <div className="flex flex-wrap justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => startAddProductForSection(section.name)}
                      className="btn-neon rounded-lg px-3 py-1.5 text-xs"
                    >
                      Add Product
                    </button>
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
                    <button
                      type="button"
                      onClick={() => deleteSection(section)}
                      disabled={sectionSaving || String(section?.name || "").trim().toLowerCase() === "general"}
                      className="btn-danger rounded-lg px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </form>
        </div>

        <form ref={productEditorRef} onSubmit={submitProduct} className="glass rounded-2xl p-6 scroll-mt-28">
        <h2 className="text-xl font-semibold" style={{ color: "#1a2f48" }}>
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

            <input
              placeholder="Product Tax Rate % (optional)"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={productForm.taxRatePercent}
              onChange={(event) => setProductForm((prev) => ({ ...prev, taxRatePercent: event.target.value }))}
              className="input-dark"
            />

            <input
              placeholder="Product Shipping ₹ (optional)"
              type="number"
              min="0"
              step="0.01"
              value={productForm.shippingCharge}
              onChange={(event) => setProductForm((prev) => ({ ...prev, shippingCharge: event.target.value }))}
              className="input-dark"
            />

            <textarea
              placeholder="Description"
              value={productForm.description}
              onChange={(event) => setProductForm((prev) => ({ ...prev, description: event.target.value }))}
              className="input-dark min-h-24 md:col-span-2"
            />

            <p className="text-xs md:col-span-2" style={{ color: "#6080a0" }}>
              Leave tax and shipping fields empty to use global checkout pricing defaults.
            </p>
          </div>

          <div className="mt-5 rounded-2xl p-4" style={{ border: "1px solid rgba(100,160,220,0.18)", background: "rgba(255,255,255,0.78)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "#1a2f48" }}>Add Product Pictures</h3>
            <p className="mt-1 text-xs" style={{ color: "#6080a0" }}>
              Upload multiple pictures and mark one as main image.
            </p>

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onAddNewImages}
              className="mt-3 block w-full text-sm text-[#3a5470] file:mr-3 file:rounded-lg file:border-0 file:bg-sky-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-sky-700 hover:file:bg-sky-200"
            />

            <div className="mt-4 space-y-3">
              {existingImages.length ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "#6080a0" }}>Saved Images</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {existingImages.map((imagePath) => (
                      <div key={imagePath} className="rounded-xl p-2" style={{ border: "1px solid rgba(100,160,220,0.18)", background: "rgba(255,255,255,0.82)" }}>
                        <img src={mediaUrl(imagePath)} alt="Existing product" className="h-20 w-full rounded-lg object-cover" />
                        <label className="mt-2 flex items-center gap-2 text-[11px] text-[#3a5470]">
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
                          className="mt-1 w-full rounded-md bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-100"
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
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "#6080a0" }}>New Uploads</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {newImages.map((entry, index) => (
                      <div key={entry.id} className="rounded-xl p-2" style={{ border: "1px solid rgba(100,160,220,0.18)", background: "rgba(255,255,255,0.82)" }}>
                        <img src={entry.preview} alt="New product" className="h-20 w-full rounded-lg object-cover" />
                        <label className="mt-2 flex items-center gap-2 text-[11px] text-[#3a5470]">
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
                          className="mt-1 w-full rounded-md bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-100"
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

      {loading ? <p className="text-sky-700">Loading products...</p> : null}

      {!loading ? (
        groupedProducts.length ? (
          <div className="space-y-8">
            {groupedProducts.map((sectionGroup) => (
              <div key={sectionGroup.name} className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold" style={{ color: "#1a2f48" }}>{sectionGroup.name}</h2>
                    <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "rgba(2,132,199,0.08)", color: "#0284c7", border: "1px solid rgba(2,132,199,0.22)" }}>
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
                        <div className="rounded-xl px-3 py-2" style={{ border: "1px solid rgba(100,160,220,0.18)", background: "rgba(255,255,255,0.72)" }}>
                          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6080a0" }}>Rating Snapshot</p>
                        <StarRating
                          value={Number(product?.ratingAverage || 0)}
                          count={Number(product?.ratingCount || 0)}
                          size="sm"
                          className="mt-1"
                        />
                        <p className="mt-1 text-[11px]" style={{ color: "#3a5470" }}>
                          Tax: {product?.taxRatePercent !== null && product?.taxRatePercent !== undefined
                            ? `${Number(product.taxRatePercent).toFixed(2)}%`
                            : "Global default"}
                        </p>
                        <p className="text-[11px]" style={{ color: "#3a5470" }}>
                          Shipping: {product?.shippingCharge !== null && product?.shippingCharge !== undefined
                            ? `₹${Number(product.shippingCharge).toFixed(2)}`
                            : "Global default"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          ) : (
            <p className="glass rounded-xl p-6 text-center" style={{ color: "#3a5470" }}>No products yet.</p>
        )
      ) : null}

      <div className="glass rounded-2xl p-6">
          <h2 className="text-xl font-semibold" style={{ color: "#1a2f48" }}>Order Tracking Management</h2>
          {ordersError ? <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{ordersError}</p> : null}
          {ordersLoading ? <p className="mt-4 text-sm text-sky-700">Loading orders...</p> : null}

        {!ordersLoading ? (
          managedOrders.length ? (
            <div className="mt-4 space-y-4">
              {managedOrders.map((order) => {
                const selectedStatus = statusDrafts[order._id] || order.status;
                const imagePath = order.productImage || "";
                const isOnlinePayment = order.paymentOption === "upi" || order.paymentOption === "half";
                const paymentDate = order.paymentPaidAt ? new Date(order.paymentPaidAt) : null;
                const hasPaymentDate = paymentDate && !Number.isNaN(paymentDate.getTime());

                return (
                    <div key={order._id} className="rounded-xl p-4 transition" style={{ border: "1px solid rgba(100,160,220,0.22)", background: "rgba(255,255,255,0.78)" }}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex gap-3 flex-1">
                        <img
                          src={imagePath ? mediaUrl(imagePath) : "https://placehold.co/140x100?text=No+Image"}
                          alt={order.productName}
                          className="h-20 w-24 cursor-zoom-in rounded-lg object-cover shadow-sm"
                          onClick={() => setPreviewImage(imagePath ? mediaUrl(imagePath) : "https://placehold.co/700x500/dce8f5/0284c7?text=No+Image")}
                          onError={(e) => {
                            e.currentTarget.src = "https://placehold.co/140x100?text=No+Image";
                          }}
                        />

                          <div className="space-y-1 flex-1">
                            <p className="text-sm font-semibold" style={{ color: "#1a2f48" }}>{order.productName}</p>
                            <p className="text-xs text-[#3a5470]">Order ID: <span className="font-medium">{order.orderCode}</span></p>
                            <p className="text-xs text-[#3a5470]">Customer: {order.userName} • {order.userEmail}</p>
                            <p className="text-xs text-[#3a5470]">Qty: {order.quantity} • Total: ₹{Number(order.totalAmount || 0).toFixed(2)}</p>
                            {isOnlinePayment ? (
                              <div className="mt-1 space-y-1 rounded-lg px-2 py-2 text-xs" style={{ background: "rgba(124,58,237,0.10)", border: "1px solid rgba(124,58,237,0.22)" }}>
                                <p className="font-medium" style={{ color: "#7c3aed" }}>
                                  📱 {order.paymentOption === "half" ? "Half UPI Payment" : "Full UPI Payment"}
                                </p>
                                <p style={{ color: "#5b21b6" }}>
                                  Txn ID: <span className="font-semibold">{order.upiTransactionId || "-"}</span>
                                </p>
                                <p style={{ color: "#5b21b6" }}>
                                  Paid Amount: <span className="font-semibold">₹{Number(order.paidNowAmount || 0).toFixed(2)}</span>
                                </p>
                                <p style={{ color: "#5b21b6" }}>
                                  App: <span className="font-semibold">{order.paymentApp || "UPI"}</span>
                                </p>
                                <p style={{ color: "#5b21b6" }}>
                                  Date: <span className="font-semibold">{hasPaymentDate ? paymentDate.toLocaleDateString() : "-"}</span>
                                  {" • "}
                                  Time: <span className="font-semibold">{hasPaymentDate ? paymentDate.toLocaleTimeString() : "-"}</span>
                                </p>
                                <p style={{ color: "#5b21b6" }}>
                                  Payment Status: <span className="font-semibold">{order.paymentStatus || "-"}</span>
                                </p>
                              </div>
                            ) : (
                              <p className="mt-1 text-xs" style={{ color: "#059669" }}>💵 Cash on Delivery</p>
                            )}
                            {order.status === "Cancelled" ? (
                              <div className="mt-2 rounded-lg px-2 py-2 text-xs" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)" }}>
                                <p style={{ color: "#b91c1c" }}>
                                  Cancelled By: <span className="font-semibold">{order.cancelledBy || "admin"}</span>
                                </p>
                                <p style={{ color: "#b91c1c" }}>
                                  Reason: <span className="font-semibold">{order.cancellationReason || "Cancelled"}</span>
                                </p>
                              </div>
                            ) : null}
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                              <div className="rounded px-2 py-1" style={{ background: "rgba(37,99,235,0.10)", border: "1px solid rgba(37,99,235,0.20)" }}><p className="text-blue-600">📅 Placed: {new Date(order.createdAt).toLocaleDateString()}</p></div>
                              <div className="rounded px-2 py-1" style={{ background: "rgba(13,148,136,0.10)", border: "1px solid rgba(13,148,136,0.22)" }}><p className="text-teal-700">🚚 Delivery: {order.expectedDelivery}</p></div>
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

                        {order.status === "Cancelled" ? (
                          <button
                            type="button"
                            onClick={() => deleteCancelledOrder(order._id)}
                            disabled={deletingOrderId === order._id}
                            className="btn-danger rounded-lg px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingOrderId === order._id ? "Deleting..." : "Delete Permanently"}
                          </button>
                        ) : null}
                      </div>
                    </div>

                      <div className="mt-4 rounded-xl p-3" style={{ border: "1px solid rgba(100,160,220,0.18)", background: "rgba(240,248,255,0.78)" }}>
                      <OrderTimeline status={order.status} compact />
                    </div>
                  </div>
                );
              })}
            </div>
            ) : (
              <p className="mt-4 text-sm" style={{ color: "#6080a0" }}>No orders found.</p>
          )
        ) : null}
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="text-xl font-semibold" style={{ color: "#1a2f48" }}>Orders Cancelled by User</h2>

        {userCancelledOrders.length ? (
          <div className="mt-4 space-y-4">
            {userCancelledOrders.map((order) => (
              <div key={order._id} className="rounded-xl p-4" style={{ border: "1px solid rgba(239,68,68,0.24)", background: "rgba(255,255,255,0.82)" }}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold" style={{ color: "#1a2f48" }}>{order.productName}</p>
                    <p className="text-xs" style={{ color: "#3a5470" }}>Order ID: <span className="font-semibold">{order.orderCode}</span></p>
                    <p className="text-xs" style={{ color: "#3a5470" }}>Customer: {order.userName} • {order.userEmail}</p>
                    <p className="text-xs" style={{ color: "#3a5470" }}>Phone: {order.userPhone || "-"}</p>
                    <p className="text-xs" style={{ color: "#3a5470" }}>Address: {formatOrderAddress(order.address) || "-"}</p>
                    <p className="text-xs" style={{ color: "#b91c1c" }}>
                      Reason: <span className="font-semibold">{order.cancellationReason || "Cancelled by user"}</span>
                    </p>
                    <p className="text-xs" style={{ color: "#b91c1c" }}>
                      Cancelled At: {order.cancelledAt ? new Date(order.cancelledAt).toLocaleString() : "-"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteCancelledOrder(order._id)}
                    disabled={deletingOrderId === order._id}
                    className="btn-danger rounded-lg px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingOrderId === order._id ? "Deleting..." : "Delete Permanently"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm" style={{ color: "#6080a0" }}>No user-cancelled orders yet.</p>
        )}
      </div>

      <ImageLightbox
        isOpen={Boolean(previewImage)}
        imageSrc={previewImage}
        alt="Order product preview"
        onClose={() => setPreviewImage("")}
      />
    </section>
  );
}

export default AdminDashboard;