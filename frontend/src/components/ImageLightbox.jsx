import { useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

function ImageLightbox({ isOpen, imageSrc = "", alt = "Preview", onClose }) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imageSrc) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-120 flex items-center justify-center bg-black/80 p-4 animate-fade-in"
      onClick={() => onClose?.()}
      role="button"
      tabIndex={0}
      aria-label="Close full screen image preview"
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          onClose?.();
        }
      }}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClose?.();
        }}
        className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-slate-700 shadow-lg transition hover:scale-105 hover:bg-white"
        aria-label="Close"
      >
        <XMarkIcon className="h-5 w-5" />
      </button>

      <img
        src={imageSrc}
        alt={alt}
        className="max-h-[92vh] w-auto max-w-[95vw] rounded-2xl border border-white/15 object-contain shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
}

export default ImageLightbox;
