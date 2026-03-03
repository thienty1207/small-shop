import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/shop/ProductCard";
import ShopPagination from "@/components/shop/ShopPagination";
import { products } from "@/data/products";

const categoryFilters = ["Tất cả", "Nến", "Thiệp", "Túi", "Gốm", "Xà phòng"];
const ITEMS_PER_PAGE = 8;

const Products = () => {
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000]);
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const catMatch = selectedCategory === "Tất cả" || p.category === selectedCategory;
      const priceMatch = p.price >= priceRange[0] && p.price <= priceRange[1];
      return catMatch && priceMatch;
    });
  }, [selectedCategory, priceRange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="min-h-screen bg-surface-pink">
      <Header />

      {/* Breadcrumb */}
      <div className="container mx-auto px-4 md:px-8 py-4">
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

      <div className="container mx-auto px-4 md:px-8 pb-16">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Filter */}
          <aside className="w-full md:w-56 shrink-0">
            <div className="sticky top-20">
              <h3 className="font-display text-base font-bold text-foreground mb-3">
                Lọc theo
              </h3>
              <div className="space-y-2">
                {categoryFilters.map((cat) => (
                  <label key={cat} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCategory === cat}
                      onChange={() => {
                        setSelectedCategory(cat);
                        setCurrentPage(1);
                      }}
                      className="w-4 h-4 rounded border-border text-primary accent-primary"
                    />
                    <span className="text-sm text-foreground">{cat}</span>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {paginated.map((product) => (
                <ProductCard key={product.id} product={product} showActions />
              ))}
            </div>
            {filtered.length === 0 && (
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
