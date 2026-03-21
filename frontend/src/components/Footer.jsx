import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetchJson } from "../config/api";

function Footer() {
  const [siteContent, setSiteContent] = useState(null);

  useEffect(() => {
    const loadContent = async () => {
      try {
        const { response, data } = await apiFetchJson("/site-content");
        if (response.ok) setSiteContent(data);
      } catch (err) {
        console.error("Failed to load footer content", err);
      }
    };
    loadContent();
  }, []);

  const shopName = siteContent?.shopName || "Maa Sheela Iron Arts";
  const tagline = siteContent?.tagline || "Crafting exquisite furniture with a blend of traditional artistry and modern design. Elevate your living space with our unique pieces.";
  const contactEmail = siteContent?.email || "contact@maasheela.com";
  const contactPhone = siteContent?.contactNumber || "+91 98765 43210";
  const contactAddress = siteContent?.address || "Iron Art Street, Jodhpur, Rajasthan";

  return (
    <footer className="bg-neutral-dark text-white py-16 px-8 mt-20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="space-y-4">
          <h3 className="font-heading text-2xl font-bold">{shopName}</h3>
          <p className="text-white/60 text-sm leading-relaxed">
            {tagline}
          </p>
        </div>
        
        <div className="space-y-4">
          <h4 className="font-heading text-lg font-semibold">Quick Links</h4>
          <ul className="space-y-2 text-sm text-white/60">
            <li><Link to="/" className="hover:text-secondary transition-colors">Home</Link></li>
            <li><Link to="/cart" className="hover:text-secondary transition-colors">Shopping Cart</Link></li>
            <li><Link to="/dashboard" className="hover:text-secondary transition-colors">My Account</Link></li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="font-heading text-lg font-semibold">Categories</h4>
          <ul className="space-y-2 text-sm text-white/60">
            <li><button onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} className="hover:text-secondary transition-colors text-left">Living Room</button></li>
            <li><button onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} className="hover:text-secondary transition-colors text-left">Bedroom</button></li>
            <li><button onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} className="hover:text-secondary transition-colors text-left">Office</button></li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="font-heading text-lg font-semibold">Contact Us</h4>
          <ul className="space-y-2 text-sm text-white/60">
            <li>Email: {contactEmail}</li>
            <li>Phone: {contactPhone}</li>
            <li>Address: {contactAddress}</li>
          </ul>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto border-t border-white/10 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/40">
        <p>&copy; {new Date().getFullYear()} {shopName}. All rights reserved.</p>
        <div className="flex gap-6">
          <Link to="#" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link to="#" className="hover:text-white transition-colors">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
