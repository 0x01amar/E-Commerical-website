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
    : "https://placehold.co/600x400?text=No+Image";

  const sectionLabel = product?.section || product?.category || "General";

  return (
    <article
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <button
        type="button"
        onClick={() => onView?.(product)}
        className="block w-full text-left"
      >
        <img
          src={imageUrl}
          alt={product.name}
          className="h-44 w-full object-cover sm:h-52"
        />
        <div className="space-y-1 p-3.5 sm:p-4">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
              {sectionLabel}
            </span>
            {product.category && product.category !== sectionLabel ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                {product.category}
              </span>
            ) : null}
          </div>
          <h3 className="line-clamp-1 text-lg font-semibold text-slate-900">{product.name}</h3>
          <p className="text-xl font-bold text-slate-900">₹{product.price}</p>
          <StarRating
            value={product?.ratingAverage || 0}
            count={product?.ratingCount || 0}
            size="sm"
          />
          {product.description ? (
            <p className="line-clamp-2 text-sm text-slate-600">{product.description}</p>
          ) : null}
        </div>
      </button>

      {showAdminActions ? (
        <div className="flex gap-2 border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={() => onEdit?.(product)}
            className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete?.(product._id)}
            className="flex-1 rounded-lg bg-rose-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-600"
          >
            Delete
          </button>
        </div>
      ) : null}
    </article>
  );
}

export default ProductCard;