import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShoppingBag, Eye, Heart } from "lucide-react";
import type { Product } from "@/data/products";
import PriceDisplay from "./PriceDisplay";
import ProductBadge from "./ProductBadge";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ProductCardProps {
  product: Product;
  showActions?: boolean;
  /** When true, renders a more compact card suited for 4-column grids. */
  compact?: boolean;
}

/**
 * Returns the price to display on the card.
 * Priority: 100ml variant > closest variant to 100ml > product.price (min variant).
 * This avoids showing misleading low prices from tiny (10ml/30ml) sizes.
 */
function getDisplayPrice(product: Product): { price: number; originalPrice?: number } {
  const variants = product.variants;
  if (!variants || variants.length === 0) {
    return { price: product.price, originalPrice: product.originalPrice };
  }
  // Strictly try exact 100ml first as requested. Use Number() to be safe.
  const v100 = variants.find((v) => Number(v.ml) === 100);
  if (v100) {
    return { price: v100.price, originalPrice: v100.originalPrice };
  }
  // Fallback if 100ml not exists: pick the one closest to 100ml (usually 125ml or 75ml)
  const sorted = [...variants].sort((a, b) => Math.abs(Number(a.ml) - 100) - Math.abs(Number(b.ml) - 100));
  const best = sorted[0];
  return { price: best.price, originalPrice: best.originalPrice };
}

const ProductCard = ({ product, compact = false }: ProductCardProps) => {
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const wishlisted = isWishlisted(product.id);
  const outOfStock = product.inStock === false;
  const lowStock = !outOfStock && product.stock !== undefined && product.stock > 0 && product.stock < 5;
  const { price, originalPrice } = getDisplayPrice(product);

  // Find the best variant (100ml or closest) to pass to the cart
  const bestVariant = (() => {
    const variants = product.variants;
    if (!variants || variants.length === 0) return null;
    const v100 = variants.find((v) => Number(v.ml) === 100);
    if (v100) return v100;
    return [...variants].sort((a, b) => Math.abs(Number(a.ml) - 100) - Math.abs(Number(b.ml) - 100))[0];
  })();

  const navigate = useNavigate();
  const location = useLocation();

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      const returnTo = location.pathname + location.search;
      sessionStorage.setItem("returnTo", returnTo);
      navigate("/login", { state: { returnTo } });
      return;
    }

    try {
      const nowWishlisted = await toggleWishlist(product.id);
      toast.success(nowWishlisted ? "Đã thêm vào yêu thích" : "Đã bỏ khỏi yêu thích");
    } catch {
      toast.error("Không thể cập nhật yêu thích");
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    // Build a product snapshot whose .price reflects the displayed price (100ml, not 10ml)
    const productForCart = { ...product, price, originalPrice };
    addItem(
      productForCart,
      1,
      bestVariant?.id,
      bestVariant ? `${bestVariant.ml}ml` : undefined,
    );
  };

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={handleToggleWishlist}
        className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow hover:bg-white transition-colors"
        aria-label={wishlisted ? "Bỏ khỏi yêu thích" : "Thêm vào yêu thích"}
      >
        <Heart size={15} className={wishlisted ? "fill-rose-500 text-rose-500" : "text-foreground/70"} />
      </button>
      <Link to={`/product/${product.slug}`} className="block">
        {/* Image container */}
        <div className={`relative overflow-hidden rounded-xl bg-muted ${compact ? "aspect-[3/4]" : "aspect-[4/5]"}`}>
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
            <span className="absolute top-2 right-2 text-[11px] font-medium text-orange-700 bg-orange-50/90 px-2 py-0.5 rounded-full shadow-sm">
              Còn {product.stock}
            </span>
          )}

          {/* Badge */}
          {product.badge && !outOfStock && (
            <div className="absolute top-3 left-3">
              <ProductBadge type={product.badge as "Handmade" | "Mới" | "Hot"} />
            </div>
          )}

          {/* Action buttons */}
          {!outOfStock && (
            <div className="absolute bottom-3 left-3 right-3 flex gap-2 translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
              <button
                onClick={handleAddToCart}
                className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-white text-foreground text-xs font-semibold shadow-lg hover:bg-primary hover:text-white transition-colors"
              >
                <ShoppingBag size={13} />
                Thêm vào giỏ
              </button>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/product/${product.slug}`); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/90 text-foreground shadow-lg hover:bg-primary hover:text-white transition-colors"
              >
                <Eye size={14} />
              </button>
            </div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className={`mt-2.5 px-0.5 ${compact ? "space-y-0.5" : "mt-3"}`}>
        <span>
          <h3 className={`font-medium text-foreground line-clamp-2 hover:text-primary transition-colors leading-snug ${compact ? "text-xs" : "text-sm"}`}>
            {product.name}
          </h3>
        </span>
        <div className={compact ? "mt-1" : "mt-1.5"}>
          <PriceDisplay price={price} originalPrice={originalPrice} compact={compact} />
        </div>
      </div>
    </div>
  );
};

export default ProductCard;