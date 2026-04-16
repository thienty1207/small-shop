import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/shop/ProductCard";
import type { Product } from "@/data/products";
import { useWishlist } from "@/contexts/WishlistContext";
import { Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function WishlistPage() {
  const { fetchWishlistProducts } = useWishlist();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchWishlistProducts()
      .then(setItems)
      .catch(() => {
        setItems([]);
        toast.error("Không thể tải danh sách yêu thích");
      })
      .finally(() => setLoading(false));
  }, [fetchWishlistProducts]);

  return (
    <div className="min-h-screen bg-surface-pink flex flex-col">
      <Header />

      <div className="container mx-auto px-4 md:px-8 pt-36 md:pt-40 pb-4">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">Trang chủ</Link>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">Yêu thích</span>
        </nav>
      </div>

      <div className="flex-1 container mx-auto px-4 md:px-8 pb-10">
        <h1 className="font-display text-2xl font-bold text-foreground mb-6">Sản phẩm yêu thích</h1>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-muted-foreground" size={28} />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-muted-foreground">Bạn chưa có sản phẩm yêu thích nào.</p>
            <Link to="/products" className="mt-3 inline-block text-sm text-primary hover:underline">
              Khám phá sản phẩm
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-5">
            {items.map((product) => (
              <ProductCard key={product.id} product={product} compact />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
