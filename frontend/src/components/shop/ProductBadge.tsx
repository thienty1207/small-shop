interface ProductBadgeProps {
  type: "Handmade" | "Mới" | "Hot";
}

const ProductBadge = ({ type }: ProductBadgeProps) => {
  const styles: Record<string, string> = {
    Handmade: "bg-foreground text-background",
    "Mới": "bg-destructive text-destructive-foreground",
    Hot: "bg-price text-primary-foreground",
  };

  return (
    <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-md ${styles[type]}`}>
      {type}
    </span>
  );
};

export default ProductBadge;
