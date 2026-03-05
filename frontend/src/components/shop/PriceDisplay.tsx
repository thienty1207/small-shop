import { formatPrice } from "@/data/products";

interface PriceDisplayProps {
  price: number;
  originalPrice?: number;
  size?: "sm" | "md" | "lg";
  compact?: boolean;
}

const PriceDisplay = ({ price, originalPrice, size = "sm", compact = false }: PriceDisplayProps) => {
  const sizeClasses = {
    sm: compact ? "text-xs" : "text-sm",
    md: "text-base",
    lg: "text-xl",
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {originalPrice && (
        <span className={`text-price-old line-through ${sizeClasses[size]}`}>
          {formatPrice(originalPrice)}
        </span>
      )}
      <span className={`text-price font-semibold ${sizeClasses[size]}`}>
        {formatPrice(price)}
      </span>
    </div>
  );
};

export default PriceDisplay;
