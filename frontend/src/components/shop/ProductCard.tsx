import { Link } from "react-router-dom";
import { ShoppingBag, Eye } from "lucide-react";
import type { Product } from "@/data/products";
import PriceDisplay from "./PriceDisplay";
import ProductBadge from "./ProductBadge";
import { useCart } from "@/contexts/CartContext";

interface ProductCardProps {
  product: Product;
  showActions?: boolean;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const { addItem } = useCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1);
  };

  return (
    <div className="group relative">
      <Link to={`/product/${product.slug}`} className="block">
        {/* Image container */}
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
          />
          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Badge */}
          {product.badge && (
            <div className="absolute top-3 left-3">
              <ProductBadge type={product.badge} />
            </div>
          )}

          {/* Action buttons */}
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
        </div>
      </Link>

      {/* Info */}
      <div className="mt-3 px-0.5">
        <Link to={`/product/${product.slug}`}>
          <h3 className="text-sm font-medium text-foreground line-clamp-2 hover:text-primary transition-colors leading-snug">
            {product.name}
          </h3>
        </Link>
        <div className="mt-1.5">
          <PriceDisplay price={product.price} originalPrice={product.originalPrice} />
        </div>
      </div>
    </div>
  );
};

export default ProductCard;