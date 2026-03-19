import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { TrashIcon, PlusIcon } from "@heroicons/react/24/outline";

function SectionManager({ sections, onAdd, onDelete, isSubmitting }) {
  const [newName, setNewName] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAdd(newName.trim());
    setNewName("");
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="flex gap-4">
        <Input 
          placeholder="New section name (e.g. Living Room)" 
          value={newName} 
          onChange={(e) => setNewName(e.target.value)}
          className="flex-grow"
        />
        <Button type="submit" disabled={isSubmitting || !newName.trim()}>
          <PlusIcon className="w-4 h-4 mr-2" /> Add Section
        </Button>
      </form>

      <div className="space-y-3">
        <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Existing Sections</label>
        <div className="grid grid-cols-1 gap-2">
          {sections.map((s) => (
            <div key={s._id} className="flex justify-between items-center p-4 bg-neutral-cream rounded-sm border border-neutral-dark/5 group">
              <span className="font-heading font-bold">{s.name}</span>
              <button 
                onClick={() => onDelete(s._id)}
                className="text-neutral-dark/20 hover:text-accent transition-colors p-2"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          ))}
          {sections.length === 0 && (
            <p className="text-center py-8 text-sm text-neutral-dark/40 italic">No sections created yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default SectionManager;
