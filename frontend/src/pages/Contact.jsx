import { useState, useEffect } from "react";
import { apiFetchJson } from "../config/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { showToast } from "../config/toast";
import { 
  MapPinIcon, 
  PhoneIcon, 
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon
} from "@heroicons/react/24/outline";

function Contact() {
  const [siteContent, setSiteContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });

  useEffect(() => {
    const loadContent = async () => {
      try {
        const { response, data } = await apiFetchJson("/site-content");
        if (response.ok) setSiteContent(data);
      } catch (err) {
        console.error("Failed to load site content", err);
      }
    };
    loadContent();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      showToast("Please fill in all required fields", "warning");
      return;
    }

    try {
      setLoading(true);
      const { response, data } = await apiFetchJson("/site-content/contact-request", {
        method: "POST",
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        showToast("Your message has been sent successfully!", "success");
        setForm({ name: "", email: "", subject: "", message: "" });
      } else {
        showToast(data.message || "Failed to send message", "error");
      }
    } catch (err) {
      showToast("An error occurred", "error");
    } finally {
      setLoading(false);
    }
  };

  const shopName = siteContent?.shopName || "Maa Sheela Iron Arts";

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 pt-24 space-y-16 md:space-y-24 overflow-hidden">
      <header className="text-center space-y-4 max-w-3xl mx-auto animate-in fade-in slide-in-from-top-4 duration-700">
        <h2 className="text-secondary font-bold tracking-[0.2em] uppercase text-[10px] md:text-sm">Get In Touch</h2>
        <h1 className="text-4xl md:text-7xl font-heading font-bold">Contact Our Shop</h1>
        <p className="text-sm md:text-lg text-neutral-dark/60 font-body leading-relaxed">
          Whether you're looking for a custom piece or have questions about our collections, our team is here to help you bring your vision to life.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
        {/* Contact Form */}
        <section className="space-y-8 md:space-y-12 animate-in fade-in slide-in-from-left-4 duration-700">
          <div className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-heading font-bold">Send us a Message</h2>
            <p className="text-xs md:text-sm text-neutral-dark/40 font-body">Required fields are marked *</p>
          </div>

          <Card className="p-6 md:p-8 border-none bg-white shadow-sm rounded-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Full Name *</label>
                  <Input 
                    required 
                    placeholder="John Doe" 
                    value={formData.name}
                    onChange={e => setForm({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Email Address *</label>
                  <Input 
                    required 
                    type="email" 
                    placeholder="john@example.com" 
                    value={formData.email}
                    onChange={e => setForm({...formData, email: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Subject</label>
                <Input 
                  placeholder="Custom Order Inquiry" 
                  value={formData.subject}
                  onChange={e => setForm({...formData, subject: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Message *</label>
                <textarea 
                  required
                  className="w-full min-h-[150px] md:min-h-[200px] p-4 text-sm border border-neutral-dark/10 rounded-sm focus:outline-none focus:border-primary transition-all font-body resize-none"
                  placeholder="Tell us about your project or inquiry..."
                  value={formData.message}
                  onChange={e => setForm({...formData, message: e.target.value})}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-14 md:h-16 text-sm md:text-lg rounded-xl md:rounded-sm shadow-xl md:shadow-none"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </Card>
        </section>

        {/* Contact Info & Map */}
        <section className="space-y-12 md:space-y-16 animate-in fade-in slide-in-from-right-4 duration-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div className="space-y-4">
              <div className="w-10 h-10 bg-primary/5 rounded-full flex items-center justify-center text-primary">
                <MapPinIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg">Our Location</h3>
                <p className="text-sm text-neutral-dark/60 font-body leading-relaxed mt-2 whitespace-pre-line">
                  {siteContent?.address || "Address not set"}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="w-10 h-10 bg-primary/5 rounded-full flex items-center justify-center text-primary">
                <ChatBubbleLeftRightIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg">Direct Contact</h3>
                <div className="text-sm text-neutral-dark/60 font-body space-y-1 mt-2">
                  <p className="flex items-center gap-2"><PhoneIcon className="w-4 h-4" /> {siteContent?.contactNumber || "N/A"}</p>
                  <p className="flex items-center gap-2"><EnvelopeIcon className="w-4 h-4" /> {siteContent?.email || "N/A"}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="w-10 h-10 bg-primary/5 rounded-full flex items-center justify-center text-primary">
                <ClockIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg">Studio Hours</h3>
                <div className="text-sm text-neutral-dark/60 font-body space-y-1 mt-2">
                  <p>Mon - Sat: 10:00 AM - 08:00 PM</p>
                  <p>Sunday: By Appointment Only</p>
                </div>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="space-y-6">
            <h3 className="font-heading font-bold text-2xl">Find Us Here</h3>
            <div className="aspect-video w-full bg-neutral-cream rounded-sm overflow-hidden border border-neutral-dark/5 shadow-inner">
              {siteContent?.address || siteContent?.mapEmbedUrl ? (
                <iframe 
                  src={siteContent.mapEmbedUrl && (siteContent.mapEmbedUrl.includes('embed') || siteContent.mapEmbedUrl.includes('output=embed'))
                    ? siteContent.mapEmbedUrl 
                    : `https://maps.google.com/maps?q=${encodeURIComponent(siteContent.address || "Maa Sheela Iron Arts, Jodhpur")}&output=embed`}
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  allowFullScreen="" 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Shop Location"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-neutral-dark/20 space-y-2">
                  <MapPinIcon className="w-12 h-12" />
                  <p className="text-xs font-bold uppercase tracking-widest">Map not configured</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Contact;
