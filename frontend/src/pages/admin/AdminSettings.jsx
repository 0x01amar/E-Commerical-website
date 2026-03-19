import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

function AdminSettings({ 
  siteContent, 
  pricing, 
  onSaveSiteContent, 
  onSavePricing,
  heroImageUrl,
  onSaveHeroImage
}) {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-2">
        <h2 className="text-3xl font-heading font-bold">Store Configuration</h2>
        <p className="text-neutral-dark/40 text-sm font-body">Manage global settings, pricing and content.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Site Content */}
        <Card className="p-8 border-none shadow-sm bg-white rounded-sm space-y-8">
          <h3 className="font-heading text-xl font-bold">Showcase & Branding</h3>
          <form className="space-y-6" onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            onSaveSiteContent(Object.fromEntries(formData));
          }}>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Shop Name</label>
              <Input name="shopName" defaultValue={siteContent.shopName} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Tagline</label>
              <textarea 
                name="tagline" 
                defaultValue={siteContent.tagline}
                className="w-full border border-neutral-dark/10 p-3 text-sm focus:outline-none focus:border-primary rounded-sm min-h-24"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Phone</label>
                <Input name="contactNumber" defaultValue={siteContent.contactNumber} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">WhatsApp</label>
                <Input name="whatsAppNumber" defaultValue={siteContent.whatsAppNumber} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Store Address</label>
              <textarea 
                name="address" 
                defaultValue={siteContent.address}
                className="w-full border border-neutral-dark/10 p-3 text-sm focus:outline-none focus:border-primary rounded-sm min-h-24"
              />
            </div>
            <Button type="submit" className="w-full">Save Branding</Button>
          </form>
        </Card>

        <div className="space-y-8">
          {/* Checkout Pricing */}
          <Card className="p-8 border-none shadow-sm bg-white rounded-sm space-y-8">
            <h3 className="font-heading text-xl font-bold">Pricing & Tax</h3>
            <form className="space-y-6" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              onSavePricing(Object.fromEntries(formData));
            }}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Tax Rate (%)</label>
                  <Input name="taxRatePercent" type="number" step="0.01" defaultValue={pricing.taxRatePercent} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Shipping Charge (₹)</label>
                  <Input name="shippingCharge" type="number" step="0.01" defaultValue={pricing.shippingCharge} />
                </div>
              </div>
              <Button type="submit" className="w-full">Save Pricing</Button>
            </form>
          </Card>

          {/* Hero Image */}
          <Card className="p-8 border-none shadow-sm bg-white rounded-sm space-y-8">
            <h3 className="font-heading text-xl font-bold">Hero Imagery</h3>
            <div className="space-y-4">
              <div className="aspect-video bg-neutral-cream rounded-sm overflow-hidden">
                <img src={heroImageUrl} className="w-full h-full object-cover" alt="Hero" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Image URL</label>
                <div className="flex gap-2">
                  <Input id="heroUrl" defaultValue={heroImageUrl} className="flex-grow" />
                  <Button onClick={() => onSaveHeroImage(document.getElementById('heroUrl').value)}>Update</Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default AdminSettings;
