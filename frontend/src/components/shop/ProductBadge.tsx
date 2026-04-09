interface ProductBadgeProps {
  type: string;
}

const normalizeBadge = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

const ProductBadge = ({ type }: ProductBadgeProps) => {
  if (!type?.trim()) return null;

  const key = normalizeBadge(type);

  const styles: Record<string, string> = {
    handmade: "bg-foreground text-background",
    moi: "bg-destructive text-destructive-foreground",
    hot: "bg-price text-primary-foreground",
    "giam gia": "bg-red-500 text-white",
    "noi bat": "bg-amber-500 text-black",
  };

  const style = styles[key] ?? "bg-black/75 text-white";

  return (
    <span className={`inline-block max-w-[120px] truncate px-2.5 py-1 text-[10px] font-semibold rounded-md shadow-sm ${style}`}>
      {type}
    </span>
  );
};

export default ProductBadge;
