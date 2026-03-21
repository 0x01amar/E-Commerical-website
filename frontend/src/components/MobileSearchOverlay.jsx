import { useState, useEffect, useMemo } from "react";
import { XMarkIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import { apiFetchJson } from "../config/api";
import SearchBar from "./SearchBar";

function MobileSearchOverlay({ isOpen, onClose, search, setSearch }) {
  const navigate = useNavigate();
  const [searchCatalog, setSearchCatalog] = useState([]);

  useEffect(() => {
    if (isOpen) {
      const loadCatalog = async () => {
        try {
          const { response, data } = await apiFetchJson("/products");
          if (response.ok) setSearchCatalog(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error("Failed to load catalog", err);
        }
      };
      loadCatalog();
    }
  }, [isOpen]);

  const searchSuggestions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return searchCatalog
      .filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.category?.toLowerCase().includes(term) || 
        p.section?.toLowerCase().includes(term)
      )
      .slice(0, 8)
      .map(p => ({ id: p._id, label: p.name, section: p.section }));
  }, [search, searchCatalog]);

  if (!isOpen) return null;

  return (
    <div className="md:hidden fixed inset-0 z-[100] bg-white animate-in fade-in slide-in-from-bottom duration-300">
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-4 px-6 py-4 border-b border-neutral-dark/5">
          <SearchBar 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            suggestions={searchSuggestions}
            onSelectSuggestion={(s) => {
              setSearch(s.label);
              onClose();
              navigate(`/product/${s.id}`);
            }}
            placeholder="Search for furniture..."
          />
          <button onClick={onClose} className="p-2 text-neutral-dark/60">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-grow overflow-y-auto p-6">
          {!search.trim() && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-dark/40 mb-6">Popular Searches</h3>
              <div className="flex flex-wrap gap-2">
                {["Sofa", "Chair", "Table", "Bed", "Desk"].map(term => (
                  <button 
                    key={term}
                    onClick={() => setSearch(term)}
                    className="px-4 py-2 bg-neutral-dark/5 rounded-full text-sm font-medium text-neutral-dark"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MobileSearchOverlay;
