import { Link } from "react-router-dom";
import { ShoppingBag, Eye } from "lucide-react";
import type { Product } from "@/data/products";
import PriceDisplay from "./PriceDisplay";
import ProductBadge from "./ProductBadge";
import { useCart } from "@/contexts/CartContext";

interface ProductCardProps {
  product: Product;
  showActions?: boolean;
  /** When true, renders a more compact card suited for 4-column grids. */
  compact?: boolean;
}

const ProductCard = ({ product, compact = false }: ProductCardProps) => {
  const { addItem } = useCart();
  const outOfStock = product.inStock === false;
  const lowStock = !outOfStock && product.stock !== undefined && product.stock > 0 && product.stock < 5;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    addItem(product, 1);
  };

  return (
    <div className="group relative">
      <Link to={`/product/${product.slug}`} className="block">
        {/* Image container */}
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
          <img
            src={product.image}
            alt={product.name}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-108 ${outOfStock ? "opacity-70" : ""}`}
          />
          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Out of stock overlay */}
          {outOfStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl">
              <span className="text-white text-xs font-semibold bg-black/60 px-3 py-1.5 rounded-full tracking-wide">
                Hết hàng
              </span>
            </div>
          )}

          {/* Low stock badge */}
          {lowStock && (
            <span className="absolute top-2.5 right-2.5 text-[11px] font-medium text-orange-700 bg-orange-50/90 px-2 py-0.5 rounded-full shadow-sm">
              Còn {product.stock}
            </span>
          )}

          {/* Badge */}
          {product.badge && !outOfStock && (
            <div className="absolute top-3 left-3">
              <ProductBadge type={product.badge} />
            </div>
          )}

          {/* Action buttons */}
          {!outOfStock && (
            <div className="absolute bottom-3 left-3 right-3 flex gap-2 translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
              <button
                onClick={handleAddToCart}
                className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-white text-foreground text-xs font-semibold shadow-lg hover:bg-primary hover:text-white transition-colors"
              >
                <ShoppingBag size={13} />
                Thêm vào giỏ
              </button>
              <Link
                to={`/product/${product.slug}`}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/90 text-foreground shadow-lg hover:bg-primary hover:text-white transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Eye size={14} />
              </Link>
            </div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className={`mt-2.5 px-0.5 ${compact ? "space-y-0.5" : "mt-3"}`}>
        <Link to={`/product/${product.slug}`}>
          <h3 className={`font-medium text-foreground line-clamp-2 hover:text-primary transition-colors leading-snug ${compact ? "text-xs" : "text-sm"}`}>
            {product.name}
          </h3>
        </Link>
        <div className={compact ? "mt-1" : "mt-1.5"}>
          <PriceDisplay price={product.price} originalPrice={product.originalPrice} compact={compact} />
        </div>
      </div>
    </div>
  );
};

export default ProductCard;