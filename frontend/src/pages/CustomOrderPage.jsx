import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiFetchJson, mediaUrl } from "../config/api";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { showToast } from "../config/toast";
import { 
  CameraIcon, 
  ArrowLeftIcon, 
  SparklesIcon,
  InformationCircleIcon,
  PhotoIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";

function CustomOrderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = localStorage.getItem("email");
  const queryParams = new URLSearchParams(location.search);
  const baseProductId = queryParams.get("productId");

  const [loading, setLoading] = useState(false);
  const [baseProduct, setBaseProduct] = useState(null);
  const [formData, setForm] = useState({
    details: "",
    phone: "",
    address: ""
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  useEffect(() => {
    if (!email) {
      showToast("Please login to request customization", "info");
      navigate("/login", { state: { redirectTo: location.pathname + location.search } });
      return;
    }

    const loadBaseProduct = async () => {
      if (!baseProductId) return;
      try {
        const { response, data } = await apiFetchJson(`/products/${baseProductId}`);
        if (response.ok) setBaseProduct(data);
      } catch (err) {
        console.error("Failed to load base product", err);
      }
    };

    const loadProfile = async () => {
      try {
        const { response, data } = await apiFetchJson(`/auth/profile/${encodeURIComponent(email)}`);
        if (response.ok) {
          setForm(prev => ({
            ...prev,
            phone: data.phone || "",
            address: data.address?.fullAddress || data.address?.line1 || ""
          }));
        }
      } catch (err) {
        console.error("Failed to load profile", err);
      }
    };

    loadBaseProduct();
    loadProfile();
  }, [email, baseProductId, navigate, location.pathname, location.search]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast("Image size should be less than 5MB", "warning");
        return;
      }
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.details.trim()) {
      showToast("Please provide customization details", "warning");
      return;
    }
    if (!formData.phone.match(/^\d{10}$/)) {
      showToast("Please provide a valid 10-digit phone number", "warning");
      return;
    }

    try {
      setLoading(true);
      
      const body = new FormData();
      body.append("email", email);
      body.append("productId", baseProductId || "600000000000000000000000"); // Dummy ID if generic
      body.append("customDetails", formData.details);
      body.append("phone", formData.phone);
      if (image) {
        body.append("demoImage", image);
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/orders/custom-request`, {
        method: "POST",
        headers: {
          "x-user-email": email
        },
        body
      });

      const data = await response.json();

      if (response.ok) {
        showToast("Custom request submitted!", "success");
        navigate("/dashboard");
      } else {
        showToast(data.message || "Failed to submit request", "error");
      }
    } catch (err) {
      showToast("An error occurred", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 pt-24 pb-20 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="space-y-4">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-neutral-dark/40 hover:text-primary transition-colors group"
        >
          <ArrowLeftIcon className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Back
        </button>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center shrink-0">
            <SparklesIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-heading font-bold">Custom Creation</h1>
            <p className="text-neutral-dark/40 font-body text-sm">Tell us your vision, and we'll craft it for you.</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 md:p-8 border-none bg-white shadow-sm rounded-sm">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40 flex items-center gap-2">
                  <InformationCircleIcon className="w-4 h-4" />
                  What customizations do you want?
                </label>
                <textarea
                  required
                  className="w-full h-48 p-4 text-sm border border-neutral-dark/10 rounded-sm focus:outline-none focus:border-primary transition-all font-body resize-none"
                  placeholder="Example: I want the iron frame in matte black finish and the wooden seat in darker teak wood..."
                  value={formData.details}
                  onChange={e => setForm({...formData, details: e.target.value})}
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40 flex items-center gap-2">
                  <PhotoIcon className="w-4 h-4" />
                  Reference Image (Optional)
                </label>
                <div className="flex flex-wrap gap-4">
                  {imagePreview ? (
                    <div className="relative w-32 h-32 rounded-sm overflow-hidden border border-neutral-dark/5 shadow-inner">
                      <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                      <button 
                        type="button"
                        onClick={() => { setImage(null); setImagePreview(""); }}
                        className="absolute top-1 right-1 p-1 bg-white/80 backdrop-blur-sm rounded-full text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-32 h-32 rounded-sm border-2 border-dashed border-neutral-dark/10 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-neutral-dark/20 hover:text-primary group">
                      <CameraIcon className="w-8 h-8 group-hover:scale-110 transition-transform" />
                      <span className="text-[8px] font-bold uppercase tracking-widest">Upload Photo</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    </label>
                  )}
                  <div className="flex-1 min-w-[200px] flex items-center">
                    <p className="text-[10px] text-neutral-dark/40 font-body leading-relaxed">
                      Upload a drawing or photo of a similar design to help our artisans understand your requirements better.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-neutral-dark/5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Contact Phone</label>
                  <Input 
                    required
                    maxLength={10}
                    placeholder="10-digit mobile"
                    value={formData.phone}
                    onChange={e => setForm({...formData, phone: e.target.value})}
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    type="submit" 
                    className="w-full h-12 rounded-sm shadow-xl md:shadow-none"
                    disabled={loading}
                  >
                    {loading ? "Submitting..." : "Send Request to Admin"}
                  </Button>
                </div>
              </div>
            </form>
          </Card>
        </div>

        <aside className="space-y-6">
          {baseProduct ? (
            <Card className="p-6 border-none bg-neutral-cream rounded-sm space-y-4">
              <h3 className="font-heading font-bold text-lg">Base Selection</h3>
              <div className="flex gap-4">
                <img 
                  src={mediaUrl(baseProduct.image || baseProduct.images?.[0])} 
                  className="w-16 h-20 object-cover rounded-sm bg-white" 
                  alt="" 
                />
                <div className="space-y-1">
                  <p className="font-heading font-bold text-sm">{baseProduct.name}</p>
                  <p className="text-[10px] text-neutral-dark/40 font-bold uppercase tracking-widest">{baseProduct.section}</p>
                  <p className="text-primary font-bold">₹{Number(baseProduct.price).toLocaleString()}</p>
                </div>
              </div>
              <p className="text-[10px] text-neutral-dark/40 italic font-body leading-relaxed border-t border-neutral-dark/5 pt-4">
                * Final price will be shared by the artisan after reviewing your customizations.
              </p>
            </Card>
          ) : (
            <Card className="p-6 border-none bg-neutral-cream rounded-sm space-y-4">
              <h3 className="font-heading font-bold text-lg">General Request</h3>
              <p className="text-[11px] text-neutral-dark/60 font-body leading-relaxed">
                You're requesting a completely custom piece not based on our existing catalog. Please be as detailed as possible.
              </p>
            </Card>
          )}

          <div className="p-6 bg-primary/5 rounded-sm border border-primary/10 space-y-4">
            <h4 className="font-heading font-bold text-primary flex items-center gap-2">
              <SparklesIcon className="w-5 h-5" />
              Process
            </h4>
            <ul className="space-y-3">
              {[
                "Submit your request",
                "Artisan reviews & sets price",
                "Approve & pay advance (50%)",
                "Crafting begins",
                "Balance on delivery"
              ].map((step, i) => (
                <li key={i} className="flex gap-3 text-[10px] font-bold uppercase tracking-widest text-neutral-dark/60">
                  <span className="w-4 h-4 bg-primary text-white rounded-full flex items-center justify-center shrink-0">{i+1}</span>
                  {step}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default CustomOrderPage;
