import { useState } from "react";
import { mediaUrl } from "../config/api";
import StarRating from "./StarRating";
import ImageLightbox from "./ImageLightbox";

function ProductCard({
  product,
  onView,
  onEdit,
  onDelete,
  showAdminActions = false,
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const mainImage = product?.image || product?.images?.[0] || "";

  const imageUrl = mainImage
    ? mediaUrl(mainImage)
    : "https://placehold.co/600x400/dce8f5/0284c7?text=No+Image";

  const sectionLabel = product?.section || product?.category || "General";

  return (
    <article
      className="glass-hover overflow-hidden rounded-lg flex flex-col md:rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.80)",
        border: "1px solid rgba(100,160,220,0.26)",
        boxShadow: "0 4px 18px rgba(30,60,110,0.10)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <button
        type="button"
        onClick={() => onView?.(product)}
        className="block w-full text-left flex-1"
      >
        {/* Product Image */}
          <div className="relative overflow-hidden" style={{ height: "140px" }}>
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            className="h-full w-full cursor-zoom-in object-cover transition-transform duration-500 hover:scale-110"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setPreviewOpen(true);
            }}
            onError={(e) => {
              e.target.src = "https://placehold.co/600x400/dce8f5/0284c7?text=No+Image";
            }}
          />
          {/* Overlay gradient on image */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(to top, rgba(15,40,80,0.30) 0%, transparent 55%)",
            }}
          />
          {/* Section badge on image */}
          <span
            className="absolute top-1 left-1 rounded-sm px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider md:top-2 md:left-2 md:rounded-full md:px-2.5 md:py-1 md:text-[10px]"
            style={{
              background: "rgba(2,132,199,0.12)",
              border: "1px solid rgba(2,132,199,0.28)",
              color: "#0284c7",
              backdropFilter: "blur(8px)",
            }}
          >
            {sectionLabel}
          </span>
        </div>

        {/* Product Info */}
        <div className="p-2 space-y-1 md:p-3.5 md:space-y-2" style={{ background: "rgba(240,248,255,0.60)" }}>
          {product.category && product.category !== sectionLabel ? (
            <span
              className="rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider md:px-2.5 md:py-0.5 md:text-[10px]"
              style={{
                background: "rgba(124,58,237,0.09)",
                border: "1px solid rgba(124,58,237,0.22)",
                color: "#7c3aed",
              }}
            >
              {product.category}
            </span>
          ) : null}

          <h3
            className="line-clamp-1 text-xs font-semibold md:text-base"
            style={{ color: "#1a2f48" }}
          >
            {product.name}
          </h3>

          <p
            className="text-sm font-bold md:text-xl"
            style={{
              background: "linear-gradient(135deg, #0284c7, #7c3aed)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            ₹{product.price}
          </p>

          <StarRating
            value={product?.ratingAverage || 0}
            count={product?.ratingCount || 0}
            size="sm"
          />

          {product.description ? (
            <p className="line-clamp-2 text-[10px] md:text-xs" style={{ color: "#4a6080" }}>
              {product.description}
            </p>
          ) : null}
        </div>
      </button>

      {showAdminActions ? (
        <div
          className="flex gap-1 px-2 py-2 md:gap-2 md:px-3.5 md:py-3"
          style={{ borderTop: "1px solid rgba(100,160,220,0.20)" }}
        >
          <button
            type="button"
            onClick={() => onEdit?.(product)}
            className="flex-1 rounded-md py-1 text-[9px] font-semibold transition-all duration-250 hover:scale-105 md:rounded-lg md:py-2 md:text-xs"
            style={{
              background: "rgba(2,132,199,0.10)",
              border: "1px solid rgba(2,132,199,0.28)",
              color: "#0284c7",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(2,132,199,0.18)";
              e.currentTarget.style.boxShadow = "0 0 12px rgba(2,132,199,0.18)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "rgba(2,132,199,0.10)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            ✏️ Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete?.(product._id)}
            className="flex-1 rounded-md py-1 text-[9px] font-semibold transition-all duration-250 hover:scale-105 md:rounded-lg md:py-2 md:text-xs"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "#dc2626",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(239,68,68,0.15)";
              e.currentTarget.style.boxShadow = "0 0 12px rgba(239,68,68,0.12)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "rgba(239,68,68,0.08)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            🗑️ Delete
          </button>
        </div>
      ) : null}

      <ImageLightbox
        isOpen={previewOpen}
        imageSrc={imageUrl}
        alt={product?.name || "Product preview"}
        onClose={() => setPreviewOpen(false)}
      />
    </article>
  );
}

export default ProductCard;