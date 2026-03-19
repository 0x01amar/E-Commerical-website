import { useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

function Modal({ isOpen, onClose, title, children }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-neutral-dark/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        <div className="h-1.5 bg-primary w-full shrink-0" />
        
        <div className="p-8 flex justify-between items-center border-b border-neutral-dark/5 shrink-0">
          <div className="space-y-1">
            <h3 className="text-2xl font-heading font-bold">{title}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-dark/5 rounded-full transition-colors">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-grow">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;
