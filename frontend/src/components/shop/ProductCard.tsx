import { Link } from "react-router-dom";
import { Heart, ShoppingBag } from "lucide-react";
import type { Product } from "@/data/products";
import { formatPrice } from "@/data/products";
import PriceDisplay from "./PriceDisplay";
import ProductBadge from "./ProductBadge";

interface ProductCardProps {
  product: Product;
  showActions?: boolean;
}

const ProductCard = ({ product, showActions = false }: ProductCardProps) => {
  return (
    <div className="group">
      <Link to={`/product/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {product.badge && (
            <div className="absolute top-3 left-3">
              <ProductBadge type={product.badge} />
            </div>
          )}
        </div>
      </Link>
      <div className="mt-3">
        <Link to={`/product/${product.slug}`}>
          <h3 className="text-sm font-medium text-foreground line-clamp-2 hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>
        <div className="mt-1 flex items-center justify-between">
          <PriceDisplay price={product.price} originalPrice={product.originalPrice} />
          {showActions && (
            <div className="flex items-center gap-1">
              <button className="p-1.5 text-muted-foreground hover:text-primary transition-colors">
                <Heart size={16} />
              </button>
              <button className="p-1.5 text-muted-foreground hover:text-primary transition-colors">
                <ShoppingBag size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
