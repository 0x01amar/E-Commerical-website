import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { mediaUrl } from "../config/api";
import ImageLightbox from "../components/ImageLightbox";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { 
  TrashIcon, 
  MinusIcon, 
  PlusIcon, 
  ArrowLeftIcon,
  ShoppingBagIcon
} from "@heroicons/react/24/outline";

function Cart() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = localStorage.getItem("email");
  const [items, setItems] = useState(() => JSON.parse(localStorage.getItem("cartItems") || "[]"));
  const [previewImage, setPreviewImage] = useState("");

  useEffect(() => {
    if (!email) {
      navigate("/login", {
        replace: true,
        state: { redirectTo: location.pathname },
      });
    }
  }, [email, location.pathname, navigate]);

  const persist = (nextItems) => {
    setItems(nextItems);
    localStorage.setItem("cartItems", JSON.stringify(nextItems));
  };

  const removeItem = (id) => persist(items.filter((item) => item._id !== id));

  const changeQuantity = (id, nextQuantity) => {
    if (nextQuantity < 1) {
      removeItem(id);
      return;
    }
    persist(items.map((item) => item._id === id ? { ...item, quantity: nextQuantity } : item));
  };

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
  }, [items]);

  const SHIPPING_CHARGE = subtotal > 10000 ? 0 : 500;
  const total = subtotal + SHIPPING_CHARGE;

  if (!items.length) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-32 mt-24 text-center space-y-8 animate-in fade-in zoom-in duration-500 page-transition">
        <div className="w-24 h-24 bg-neutral-cream rounded-full flex items-center justify-center mx-auto">
          <ShoppingBagIcon className="w-12 h-12 text-neutral-dark/20" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-heading font-bold">Your cart is empty</h2>
          <p className="text-neutral-dark/60 font-body">Looks like you haven't added any masterpieces to your collection yet.</p>
        </div>
        <Button size="lg" onClick={() => navigate("/")}>
          Start Shopping
        </Button>
      </div>
    );
  }

  const OrderSummary = () => (
    <Card className="bg-neutral-cream border-none p-6 md:p-8 space-y-6 md:space-y-8 rounded-xl md:rounded-sm">
      <h2 className="font-heading text-xl md:text-2xl font-bold">Order Summary</h2>
      
      <div className="space-y-4 font-body text-sm">
        <div className="flex justify-between text-neutral-dark/60">
          <span>Subtotal ({items.length} Pieces)</span>
          <span>₹{subtotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-neutral-dark/60">
          <span>Shipping</span>
          <span>{SHIPPING_CHARGE === 0 ? "FREE" : `₹${SHIPPING_CHARGE.toLocaleString()}`}</span>
        </div>
        {SHIPPING_CHARGE > 0 && (
          <p className="text-[10px] text-primary italic font-medium">Add ₹{(10000 - subtotal).toLocaleString()} more for free shipping</p>
        )}
        <div className="pt-4 border-t border-neutral-dark/10 flex justify-between text-lg font-bold text-neutral-dark">
          <span>Total</span>
          <span>₹{total.toLocaleString()}</span>
        </div>
      </div>

      <Button size="lg" className="w-full h-14 rounded-xl md:rounded-sm shadow-xl md:shadow-none" onClick={() => navigate(`/checkout/${items[0]._id}?mode=cart`)}>
        Proceed to Checkout
      </Button>
    </Card>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 space-y-8 md:space-y-12 pb-20 pt-20 md:pt-24 page-transition">
      <header className="space-y-4">
        <Link to="/" className="inline-flex items-center text-sm font-medium text-primary hover:underline group">
          <ArrowLeftIcon className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
          Continue Shopping
        </Link>
        <h1 className="text-3xl md:text-5xl font-heading font-bold">Your Shopping Bag</h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16 items-start">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          {items.map((item) => (
            <div key={item._id} className="flex gap-4 md:gap-6 pb-6 md:pb-8 border-b border-neutral-dark/5 group">
              <div className="w-24 h-32 md:w-32 md:h-40 bg-neutral-cream rounded-2xl md:rounded-sm overflow-hidden shrink-0">
                <img 
                  src={mediaUrl(item.image || item.images?.[0] || "")} 
                  alt={item.name}
                  className="w-full h-full object-cover cursor-zoom-in group-hover:scale-105 transition-transform duration-500"
                  onClick={() => setPreviewImage(mediaUrl(item.image || item.images?.[0] || ""))}
                />
              </div>
              
              <div className="flex-grow flex flex-col justify-between py-1 md:py-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5 md:space-y-1">
                    <h3 className="font-heading text-lg md:text-xl font-bold text-neutral-dark line-clamp-1">{item.name}</h3>
                    <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-neutral-dark/40">
                      {item.section || "Collection"}
                    </p>
                  </div>
                  <p className="font-body font-bold text-primary text-base md:text-lg whitespace-nowrap">
                    ₹{Number(item.price).toLocaleString()}
                  </p>
                </div>

                <div className="flex justify-between items-center mt-2 md:mt-4">
                  <div className="flex items-center border border-neutral-dark/10 rounded-xl md:rounded-sm overflow-hidden">
                    <button 
                      className="p-1.5 md:p-2 hover:bg-neutral-dark/5 transition-colors"
                      onClick={() => changeQuantity(item._id, (item.quantity || 1) - 1)}
                    >
                      <MinusIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </button>
                    <span className="w-10 md:w-12 text-center font-body font-bold text-xs md:text-sm">{item.quantity || 1}</span>
                    <button 
                      className="p-1.5 md:p-2 hover:bg-neutral-dark/5 transition-colors"
                      onClick={() => changeQuantity(item._id, (item.quantity || 1) + 1)}
                    >
                      <PlusIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => removeItem(item._id)}
                    className="text-neutral-dark/40 hover:text-accent transition-colors p-2"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {/* Summary below items on mobile */}
          <div className="lg:hidden pt-4">
            <OrderSummary />
          </div>
        </div>

        {/* Summary Sidebar on Desktop */}
        <aside className="lg:sticky lg:top-32 space-y-8 hidden lg:block animate-in fade-in slide-in-from-right duration-700">
          <OrderSummary />
        </aside>
      </div>

      <ImageLightbox
        isOpen={Boolean(previewImage)}
        imageSrc={previewImage}
        alt="Cart product preview"
        onClose={() => setPreviewImage("")}
      />
    </div>
  );
}

export default Cart;
