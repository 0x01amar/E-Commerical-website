import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

export default function ProductForm({ initialData, sections, onSubmit, onCancel, isSubmitting }) {
  const [formData, setForm] = useState({
    name: "",
    price: "",
    description: "",
    category: "",
    section: "",
    stock: "",
    image: "",
    images: [],
    shippingCharge: "",
    taxRate: "",
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        ...initialData,
        taxRate: (initialData.taxRate !== undefined && initialData.taxRate !== null) ? initialData.taxRate * 100 : ""
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const readers = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then(results => {
      if (e.target.name === "image") {
        setForm(prev => ({ ...prev, image: results[0] }));
      } else {
        setForm(prev => ({ ...prev, images: [...prev.images, ...results] }));
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Convert taxRate and shippingCharge to numbers, and taxRate percentage to decimal
    const submissionData = {
      ...formData,
      price: Number(formData.price),
      stock: Number(formData.stock),
      shippingCharge: formData.shippingCharge !== "" ? Number(formData.shippingCharge) : null,
      taxRate: formData.taxRate !== "" ? Number(formData.taxRate) / 100 : null,
    };
    onSubmit(submissionData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Product Name</label>
          <Input name="name" value={formData.name || ""} onChange={handleChange} required />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Price (₹)</label>
          <Input name="price" type="number" value={formData.price ?? ""} onChange={handleChange} required />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Tax Rate (%)</label>
          <Input 
            name="taxRate" 
            type="number" 
            step="0.01"
            value={formData.taxRate ?? ""} 
            onChange={handleChange} 
            placeholder="e.g. 18" 
          />
          <p className="text-[9px] text-neutral-dark/30 italic">Leave blank to use global default tax rate.</p>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Shipping Charge (₹)</label>
          <Input name="shippingCharge" type="number" value={formData.shippingCharge ?? ""} onChange={handleChange} placeholder="e.g. 500" required />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Section</label>
          <select 
            name="section" 
            value={formData.section || ""} 
            onChange={handleChange}
            className="w-full border border-neutral-dark/10 p-3 text-sm focus:outline-none focus:border-primary rounded-sm"
            required
          >
            <option value="">Select Section</option>
            {sections.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Stock</label>
          <Input name="stock" type="number" value={formData.stock ?? ""} onChange={handleChange} required />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Description</label>
        <textarea 
          name="description" 
          value={formData.description || ""} 
          onChange={handleChange}
          className="w-full border border-neutral-dark/10 p-4 text-sm focus:outline-none focus:border-primary rounded-sm min-h-[100px] resize-none"
          required
        />
      </div>

      <div className="space-y-4">
        <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Product Image</label>
        <div className="flex items-center gap-4">
          <Input type="file" name="image" onChange={handleFileChange} className="flex-1" />
          {formData.image && <img src={formData.image} className="w-12 h-12 object-cover rounded-sm border" alt="Preview" />}
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 pt-6 border-t border-neutral-dark/5">
        <Button variant="ghost" type="button" className="w-full sm:flex-1 min-h-12 md:h-14 whitespace-normal py-3" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="w-full sm:flex-[2] min-h-14 h-auto whitespace-normal py-3" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : initialData ? "Update Product" : "Create Product"}
        </Button>
      </div>
    </form>
  );
}
