function ProductCard({
  product,
  onView,
  onEdit,
  onDelete,
  showAdminActions = false,
}) {
  const imageUrl = product?.image
    ? product.image.startsWith("http")
      ? product.image
      : `http://localhost:5000${product.image.startsWith("/") ? product.image : `/${product.image}`}`
    : "https://placehold.co/600x400?text=No+Image";

  return (
    <article
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <button
        type="button"
        onClick={() => onView?.(product)}
        className="block w-full text-left"
      >
        <img
          src={imageUrl}
          alt={product.name}
          className="h-52 w-full object-cover"
        />
        <div className="space-y-1 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-600">{product.category}</p>
          <h3 className="line-clamp-1 text-lg font-semibold text-slate-900">{product.name}</h3>
          <p className="text-xl font-bold text-slate-900">₹{product.price}</p>
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