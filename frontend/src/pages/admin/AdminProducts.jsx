import { useState } from "react";
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import ProductCard from "../../components/ProductCard";

function AdminProducts({ products, sections, onAddProduct, onEditProduct, onDeleteProduct, onAddSection }) {
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState("All");

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesSection = activeSection === "All" || p.section === activeSection;
    return matchesSearch && matchesSection;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <h2 className="text-3xl font-heading font-bold">Product Catalog</h2>
          <p className="text-neutral-dark/40 text-sm font-body">Manage your inventory and sections.</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={onAddSection}>Manage Sections</Button>
          <Button onClick={onAddProduct}><PlusIcon className="w-4 h-4 mr-2" /> Add Product</Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-center bg-white p-4 rounded-sm shadow-sm border border-neutral-dark/5">
        <div className="relative flex-grow">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-dark/40" />
          <Input 
            className="pl-10 h-12" 
            placeholder="Search products..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
          {["All", ...sections.map(s => s.name)].map((s) => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                activeSection === s 
                  ? "bg-primary text-white shadow-md" 
                  : "bg-neutral-cream text-neutral-dark/40 hover:bg-neutral-dark/5"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12">
        {filteredProducts.map((product) => (
          <ProductCard 
            key={product._id} 
            product={product} 
            showAdminActions 
            onEdit={() => onEditProduct(product)}
            onDelete={() => onDeleteProduct(product._id)}
          />
        ))}
        {filteredProducts.length === 0 && (
          <div className="col-span-full py-20 text-center bg-neutral-cream rounded-sm italic text-neutral-dark/40">
            No products found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminProducts;
