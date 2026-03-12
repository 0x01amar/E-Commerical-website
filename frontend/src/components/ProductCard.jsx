import { mediaUrl } from "../config/api";
import StarRating from "./StarRating";

function ProductCard({
  product,
  onView,
  onEdit,
  onDelete,
  showAdminActions = false,
}) {
  const mainImage = product?.image || product?.images?.[0] || "";

  const imageUrl = mainImage
    ? mediaUrl(mainImage)
    : "https://placehold.co/600x400/0d0e1a/00d4ff?text=No+Image";

  const sectionLabel = product?.section || product?.category || "General";

  return (
    <article
      className="glass glass-hover overflow-hidden rounded-2xl flex flex-col"
      style={{ transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}
    >
      <button
        type="button"
        onClick={() => onView?.(product)}
        className="block w-full text-left flex-1"
      >
        {/* Product Image */}
        <div className="relative overflow-hidden" style={{ height: "180px" }}>
          <img
            src={imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 hover:scale-110"
            onError={(e) => {
              e.target.src = "https://placehold.co/600x400/0d0e1a/00d4ff?text=No+Image";
            }}
          />
          {/* Overlay gradient on image */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(to top, rgba(5,6,15,0.6) 0%, transparent 50%)",
            }}
          />
          {/* Section badge on image */}
          <span
            className="absolute top-2 left-2 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: "rgba(0,212,255,0.15)",
              border: "1px solid rgba(0,212,255,0.3)",
              color: "#00d4ff",
              backdropFilter: "blur(8px)",
            }}
          >
            {sectionLabel}
          </span>
        </div>

        {/* Product Info */}
        <div className="p-3.5 space-y-2">
          {product.category && product.category !== sectionLabel ? (
            <span
              className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{
                background: "rgba(168,85,247,0.12)",
                border: "1px solid rgba(168,85,247,0.25)",
                color: "#c084fc",
              }}
            >
              {product.category}
            </span>
          ) : null}

          <h3
            className="line-clamp-1 text-base font-semibold"
            style={{ color: "#f1f5f9" }}
          >
            {product.name}
          </h3>

          <p
            className="text-xl font-bold"
            style={{
              background: "linear-gradient(135deg, #00d4ff, #a855f7)",
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
            <p className="line-clamp-2 text-xs" style={{ color: "#64748b" }}>
              {product.description}
            </p>
          ) : null}
        </div>
      </button>

      {showAdminActions ? (
        <div
          className="flex gap-2 px-3.5 py-3"
          style={{ borderTop: "1px solid rgba(0,212,255,0.08)" }}
        >
          <button
            type="button"
            onClick={() => onEdit?.(product)}
            className="flex-1 rounded-lg py-2 text-xs font-semibold transition-all duration-250 hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #00d4ff22, #06b6d422)",
              border: "1px solid rgba(0,212,255,0.3)",
              color: "#00d4ff",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(0,212,255,0.15)";
              e.currentTarget.style.boxShadow = "0 0 15px rgba(0,212,255,0.2)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "rgba(0,212,255,0.08)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            ✏️ Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete?.(product._id)}
            className="flex-1 rounded-lg py-2 text-xs font-semibold transition-all duration-250 hover:scale-105"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "#f87171",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(239,68,68,0.15)";
              e.currentTarget.style.boxShadow = "0 0 15px rgba(239,68,68,0.15)";
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
    </article>
  );
}

export default ProductCard;