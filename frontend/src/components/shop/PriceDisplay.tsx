import { formatPrice } from "@/data/products";

interface PriceDisplayProps {
  price: number;
  originalPrice?: number;
  size?: "sm" | "md" | "lg";
}

const PriceDisplay = ({ price, originalPrice, size = "sm" }: PriceDisplayProps) => {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
  };

  return (
    <div className="flex items-center gap-2">
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
