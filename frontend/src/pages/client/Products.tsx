import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/shop/ProductCard";
import ShopPagination from "@/components/shop/ShopPagination";
import { useProducts, useCategories } from "@/hooks/useProducts";

const ITEMS_PER_PAGE = 8;

const Products = () => {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000]);
  const [currentPage, setCurrentPage] = useState(1);

  const { products, isLoading } = useProducts({ category: selectedCategory || undefined });
  const { categories } = useCategories();

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const priceMatch = p.price >= priceRange[0] && p.price <= priceRange[1];
      return priceMatch;
    });
  }, [products, priceRange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="min-h-screen bg-surface-pink flex flex-col">
      <Header />

      {/* Breadcrumb */}
      <div className="container mx-auto px-4 md:px-8 pt-20 pb-4">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">
            Trang chủ
          </Link>
          <ChevronRight size={14} />
          <Link to="/products" className="hover:text-foreground transition-colors">
            Sản phẩm
          </Link>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">Quà tặng</span>
        </nav>
      </div>

      <div className="flex-1 container mx-auto px-4 md:px-8 pb-16">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Filter */}
          <aside className="w-full md:w-56 shrink-0">
            <div className="sticky top-20">
              <h3 className="font-display text-base font-bold text-foreground mb-3">
                Lọc theo danh mục
              </h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCategory === ""}
                    onChange={() => { setSelectedCategory(""); setCurrentPage(1); }}
                    className="w-4 h-4 rounded border-border text-primary accent-primary"
                  />
                  <span className="text-sm text-foreground">Tất cả</span>
                </label>
                {categories.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCategory === cat.slug}
                      onChange={() => {
                        setSelectedCategory(cat.slug);
                        setCurrentPage(1);
                      }}
                      className="w-4 h-4 rounded border-border text-primary accent-primary"
                    />
                    <span className="text-sm text-foreground">{cat.name}</span>
                  </label>
                ))}
              </div>

              <h3 className="font-display text-base font-bold text-foreground mt-6 mb-3">
                Khoảng giá
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                {new Intl.NumberFormat("vi-VN").format(priceRange[0])}đ - {new Intl.NumberFormat("vi-VN").format(priceRange[1])}đ
              </p>
              <input
                type="range"
                min={0}
                max={500000}
                step={10000}
                value={priceRange[1]}
                onChange={(e) => {
                  setPriceRange([0, parseInt(e.target.value)]);
                  setCurrentPage(1);
                }}
                className="w-full accent-primary"
              />
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={`${new Intl.NumberFormat("vi-VN").format(priceRange[0])}đ`}
                  readOnly
                  className="w-full px-2 py-1.5 text-xs border border-border rounded-md bg-background text-foreground"
                />
                <span className="text-muted-foreground self-center">-</span>
                <input
                  type="text"
                  value={`${new Intl.NumberFormat("vi-VN").format(priceRange[1])}đ`}
                  readOnly
                  className="w-full px-2 py-1.5 text-xs border border-border rounded-md bg-background text-foreground"
                />
              </div>
            </div>
          </aside>

          {/* Product Grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-7">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-xl bg-card border border-border overflow-hidden animate-pulse">
                    <div className="aspect-square bg-muted" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-7">
                {paginated.map((product) => (
                  <ProductCard key={product.id} product={product} showActions />
                ))}
              </div>
            )}
            {!isLoading && filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-16">
                Không tìm thấy sản phẩm nào.
              </p>
            )}
            {totalPages > 1 && (
              <ShopPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Products;
