import { useNavigate } from "react-router-dom";
import { mediaUrl } from "../config/api";
import StarRating from "./StarRating";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { PencilIcon, TrashIcon, ArrowRightIcon } from "@heroicons/react/24/outline";

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
    <Card className="group relative flex flex-col h-full border-none shadow-none bg-white p-3 md:p-4 rounded-sm md:rounded-sm mobile-card transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
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
        <div className="absolute top-3 left-3 md:top-4 md:left-4">
          <span className="bg-primary text-white text-[8px] md:text-[9px] font-bold uppercase tracking-[0.2em] px-2 py-1 md:px-3 md:py-1.5 rounded-sm shadow-lg">
            {sectionLabel}
          </span>
        </div>
      </div>

      {/* Product Details */}
      <div className="pt-4 md:pt-8 pb-2 md:pb-4 flex flex-col flex-1 min-w-0 px-1 md:px-2">
        <div className="flex flex-col gap-0.5 md:gap-1 mb-2 md:mb-4">
          <h3 
            className="font-heading text-base md:text-xl font-bold text-neutral-dark group-hover:text-primary transition-colors cursor-pointer truncate"
            title={product.name}
            onClick={() => onView?.(product)}
          >
            {product.name}
          </h3>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center">
            <p className="font-body text-[9px] md:text-xs font-bold uppercase tracking-widest text-secondary">
              Artisanal Piece
            </p>
            <p className="font-heading font-bold text-primary text-base md:text-lg"> 
              ₹{Number(product.price).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2 mb-3 md:mb-6">
          <StarRating
            value={product?.ratingAverage || 0}
            count={product?.ratingCount || 0}
            size="sm"
          />
        </div>

        <p className="text-[11px] md:text-[13px] text-neutral-dark/50 line-clamp-2 mb-4 md:mb-8 font-body leading-relaxed min-h-[30px] md:min-h-[40px]">
          {product.description || "Beautifully handcrafted furniture for your home."}
        </p>

        {showAdminActions ? (
          <div className="mt-auto flex gap-1 md:gap-2 pt-3 md:pt-4 border-t border-neutral-dark/5">
            <Button
              onClick={() => onEdit?.(product)}
              variant="outline"
              size="sm"
              className="flex-1 px-1 md:px-4"
            >
              <PencilIcon className="w-3.5 h-3.5 md:w-4 md:h-4 md:mr-2" /> <span className="hidden md:inline">Edit</span>
            </Button>
            <Button
              onClick={() => onDelete?.(product._id)}
              variant="destructive"
              size="sm"
              className="flex-1 px-1 md:px-4"
            >
              <TrashIcon className="w-3.5 h-3.5 md:w-4 md:h-4 md:mr-2" /> <span className="hidden md:inline">Delete</span>
            </Button>
          </div>
        ) : (
          <div className="mt-auto pt-3 md:pt-4 border-t border-neutral-dark/5">
            <Button 
              variant="default" 
              size="sm"
              className="w-full md:h-12 md:px-8 md:text-sm group/btn flex items-center justify-center gap-1 md:gap-2"
              onClick={() => onView?.(product)}
            >
              <span className="md:hidden">Explore</span>
              <span className="hidden md:inline">Explore Piece</span>
              <ArrowRightIcon className="w-3 h-3 md:w-4 md:h-4 transition-transform group-hover/btn:translate-x-1" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

export default ProductCard;
