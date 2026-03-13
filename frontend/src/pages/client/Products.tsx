import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronRight, ChevronLeft, ChevronRight as ChevronRightIcon, SlidersHorizontal } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/shop/ProductCard";
import { useProducts, useCategories } from "@/hooks/useProducts";

const SORT_OPTIONS = [
  { value: "newest",      label: "Mới nhất" },
  { value: "price_asc",   label: "Giá tăng dần" },
  { value: "price_desc",  label: "Giá giảm dần" },
  { value: "best_selling", label: "Bán chạy nhất" },
];

const LIMIT = 12;

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get("category") ?? "";
  const sort = searchParams.get("sort") ?? "newest";
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const search = searchParams.get("search") ?? "";

  const { products, totalPages, total, isLoading } = useProducts({
    category: selectedCategory || undefined,
    search:   search || undefined,
    sort,
    page,
    limit: LIMIT,
  });
  const { categories } = useCategories();

  // Reset to page 1 when filter/sort/search changes
  const setCategory = (slug: string) => {
    setSearchParams((p) => {
      const next = new URLSearchParams(p);
      if (slug) next.set("category", slug); else next.delete("category");
      next.delete("page");
      return next;
    });
  };

  const setSort = (s: string) => {
    setSearchParams((p) => {
      const next = new URLSearchParams(p);
      next.set("sort", s);
      next.delete("page");
      return next;
    });
  };

  const setPage = (n: number) => {
    setSearchParams((p) => {
      const next = new URLSearchParams(p);
      next.set("page", String(n));
      return next;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Scroll to top on mount
  useEffect(() => { window.scrollTo({ top: 0 }); }, []);

  return (
    <div className="min-h-screen bg-surface-pink flex flex-col">
      <Header />

      {/* Breadcrumb */}
      <div className="container mx-auto px-4 md:px-8 pt-20 pb-4">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">Trang chủ</Link>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">
            {selectedCategory
              ? (categories.find((c) => c.slug === selectedCategory)?.name ?? "Sản phẩm")
              : search
              ? `Kết quả: "${search}"`
              : "Tất cả sản phẩm"}
          </span>
        </nav>
      </div>

      <div className="flex-1 container mx-auto px-4 md:px-8 pb-16">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Filter */}
          <aside className="w-full md:w-56 shrink-0">
            <div className="sticky top-20">
              <h3 className="font-display text-base font-bold text-foreground mb-3">Danh mục</h3>
              <div className="space-y-1.5">
                <button
                  onClick={() => setCategory("")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedCategory === ""
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  Tất cả
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.slug)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedCategory === cat.slug
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Product Grid */}
          <div className="flex-1">
            {/* Top bar: result count + sort */}
            <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
              <p className="text-sm text-muted-foreground">
                {isLoading ? "Đang tải..." : `${total} sản phẩm`}
                {search ? <span className="ml-1 text-foreground font-medium"> — "{search}"</span> : null}
              </p>
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={14} className="text-muted-foreground" />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="h-9 pl-3 pr-8 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-4 md:gap-5">
                {Array.from({ length: LIMIT }).map((_, i) => (
                  <div key={i} className="rounded-xl bg-card border border-border overflow-hidden animate-pulse">
                    <div className="aspect-square bg-muted" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground">Không tìm thấy sản phẩm nào.</p>
                {(search || selectedCategory) && (
                  <button
                    onClick={() => setSearchParams({})}
                    className="mt-4 text-sm text-primary hover:underline"
                  >
                    Xoá bộ lọc
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-5 gap-4 md:gap-5">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} showActions />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 2)
                  .reduce<(number | "...")[]>((acc, n, idx, arr) => {
                    if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push("...");
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((n, idx) =>
                    n === "..." ? (
                      <span key={`dots-${idx}`} className="px-2 text-muted-foreground text-sm">…</span>
                    ) : (
                      <button
                        key={n}
                        onClick={() => setPage(n as number)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                          page === n
                            ? "bg-primary text-primary-foreground"
                            : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {n}
                      </button>
                    )
                  )}

                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                  className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRightIcon size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Products;
