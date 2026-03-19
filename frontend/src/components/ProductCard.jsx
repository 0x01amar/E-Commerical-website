import { useNavigate } from "react-router-dom";
import { mediaUrl } from "../config/api";
import StarRating from "./StarRating";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";

function ProductCard({
  product,
  onView,
  onEdit,
  onDelete,
  showAdminActions = false,
}) {
  const navigate = useNavigate();
  const mainImage = product?.image || product?.images?.[0] || "";

  const imageUrl = mainImage
    ? mediaUrl(mainImage)
    : "https://placehold.co/600x400/FDFCFB/4A5D4E?text=No+Image";

  const sectionLabel = product?.section || product?.category || "Collection";

  return (
    <Card className="group relative flex flex-col h-full border-none shadow-none bg-white p-4 rounded-sm transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
      {/* Product Image Wrapper */}
      <div 
        className="relative aspect-[4/5] overflow-hidden bg-neutral-cream rounded-sm cursor-pointer"
        onClick={() => onView?.(product)}
      >
        <img
          src={imageUrl}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
          onError={(e) => {
            e.target.src = "https://placehold.co/600x800/FDFCFB/4A5D4E?text=No+Image";
          }}
        />
        
        {/* Badges */}
        <div className="absolute top-4 left-4">
          <span className="bg-primary text-white text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-sm shadow-lg">
            {sectionLabel}
          </span>
        </div>
      </div>

      {/* Product Details */}
      <div className="pt-8 pb-4 flex flex-col flex-1 min-w-0 px-2">
        <div className="flex flex-col gap-1 mb-4">
          <h3 
            className="font-heading text-xl font-bold text-neutral-dark group-hover:text-primary transition-colors cursor-pointer truncate"
            title={product.name}
            onClick={() => onView?.(product)}
          >
            {product.name}
          </h3>
          <div className="flex justify-between items-center">
            <p className="font-body text-xs font-bold uppercase tracking-widest text-secondary">
              Artisanal Piece
            </p>
            <p className="font-heading font-bold text-primary text-lg"> 
              ₹{Number(product.price).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <StarRating
            value={product?.ratingAverage || 0}
            count={product?.ratingCount || 0}
            size="sm"
          />
        </div>

        <p className="text-[13px] text-neutral-dark/50 line-clamp-2 mb-8 font-body leading-relaxed min-h-[40px]">
          {product.description || "Beautifully handcrafted furniture for your home."}
        </p>

        {showAdminActions ? (
          <div className="mt-auto flex gap-2 pt-4 border-t border-neutral-dark/5">
            <Button
              onClick={() => onEdit?.(product)}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <PencilIcon className="w-4 h-4 mr-2" /> Edit
            </Button>
            <Button
              onClick={() => onDelete?.(product._id)}
              variant="destructive"
              size="sm"
              className="flex-1"
            >
              <TrashIcon className="w-4 h-4 mr-2" /> Delete
            </Button>
          </div>
        ) : (
          <div className="mt-auto pt-4 border-t border-neutral-dark/5">
            <Button 
              variant="default" 
              className="w-full group/btn"
              onClick={() => onView?.(product)}
            >
              Explore Piece
              <span className="inline-block transition-transform group-hover/btn:translate-x-1 ml-2 text-lg">→</span>
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

export default ProductCard;
