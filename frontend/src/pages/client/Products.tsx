import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevronRightIcon,
  Filter,
  SlidersHorizontal,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/shop/ProductCard";
import { useCategories, useProductFilters, useProducts } from "@/hooks/useProducts";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { FragranceGender } from "@/lib/fragrance";

const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "price_asc", label: "Giá tăng dần" },
  { value: "price_desc", label: "Giá giảm dần" },
  { value: "best_selling", label: "Bán chạy nhất" },
];

const LIMIT = 20;

const GENDER_LABELS: Record<string, string> = {
  male: "Nam",
  female: "Nữ",
  unisex: "Unisex",
};

function parseCsvStrings(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseCsvNumbers(value: string | null): number[] {
  return parseCsvStrings(value)
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0);
}

function toggleStringValue(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function toggleNumberValue(values: number[], value: number): number[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

interface FilterSectionProps {
  title: string;
  emptyLabel: string;
  children: ReactNode;
  isEmpty?: boolean;
}

function FilterSection({ title, emptyLabel, children, isEmpty = false }: FilterSectionProps) {
  return (
    <section className="border-b border-border pb-5 last:border-b-0">
      <h3 className="mb-4 text-xl font-semibold text-foreground">{title}</h3>
      {!isEmpty ? (
        <div className="space-y-3">{children}</div>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </section>
  );
}

interface FilterCheckboxProps {
  checked: boolean;
  label: string;
  count: number;
  onChange: () => void;
}

function FilterCheckbox({ checked, label, count, onChange }: FilterCheckboxProps) {
  return (
    <label className="flex items-center gap-2.5 text-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-5 w-5 rounded border-border"
      />
      <span className="text-sm text-foreground/85">
        {label} ({count})
      </span>
    </label>
  );
}

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);

  const selectedCategory = searchParams.get("category") ?? "";
  const selectedVolumes = parseCsvNumbers(searchParams.get("volume"));
  const selectedGenders = parseCsvStrings(searchParams.get("fragrance_gender")) as FragranceGender[];
  const sort = searchParams.get("sort") ?? "newest";
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const search = searchParams.get("search") ?? "";

  const { products, totalPages, total, isLoading } = useProducts({
    category: selectedCategory || undefined,
    volumes: selectedVolumes,
    fragranceGender: selectedGenders,
    search: search || undefined,
    sort,
    page,
    limit: LIMIT,
  });

  const { categories: categoryOptions = [], volumes, genders } = useProductFilters({
    category: selectedCategory || undefined,
    search: search || undefined,
  });
  const { categories } = useCategories();

  const categoryCountBySlug = useMemo(
    () => new Map(categoryOptions.map((option) => [option.value, option.count])),
    [categoryOptions],
  );

  const allCategoryOptions = useMemo(
    () => categories.map((category) => ({
      value: category.slug,
      label: category.name,
      count: categoryCountBySlug.get(category.slug) ?? 0,
    })),
    [categories, categoryCountBySlug],
  );

  const updateParams = (mutate: (params: URLSearchParams) => void) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      mutate(next);
      next.delete("page");
      return next;
    });
  };

  const setSort = (value: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("sort", value);
      next.delete("page");
      return next;
    });
  };

  const setPage = (value: number) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("page", String(value));
      return next;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleCategory = (value: string) => {
    updateParams((params) => {
      if (selectedCategory === value) {
        params.delete("category");
      } else {
        params.set("category", value);
      }
    });
  };

  const toggleVolume = (value: number) => {
    updateParams((params) => {
      const nextValues = toggleNumberValue(selectedVolumes, value).sort((a, b) => a - b);
      if (nextValues.length === 0) params.delete("volume");
      else params.set("volume", nextValues.join(","));
    });
  };

  const toggleGender = (value: FragranceGender) => {
    updateParams((params) => {
      const nextValues = toggleStringValue(selectedGenders, value);
      if (nextValues.length === 0) params.delete("fragrance_gender");
      else params.set("fragrance_gender", nextValues.join(","));
    });
  };

  const clearFilters = () => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("category");
      next.delete("brand");
      next.delete("volume");
      next.delete("fragrance_gender");
      next.delete("page");
      return next;
    });
  };

  const hasActiveFilters =
    Boolean(selectedCategory)
    || selectedVolumes.length > 0
    || selectedGenders.length > 0;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    if (!searchParams.has("brand")) return;

    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("brand");
      return next;
    });
  }, [searchParams, setSearchParams]);

  const renderFilterSections = (containerClassName = "") => (
    <div className={`space-y-6 ${containerClassName}`.trim()}>
      {selectedCategory && (
        <section className="rounded-2xl border border-border bg-background px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Danh mục đang xem</p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {categories.find((item) => item.slug === selectedCategory)?.name ?? selectedCategory}
          </p>
        </section>
      )}

      <FilterSection
        title="Danh mục"
        emptyLabel="Chưa có danh mục"
        isEmpty={allCategoryOptions.length === 0}
      >
        <>
          {allCategoryOptions.map((option) => (
            <FilterCheckbox
              key={option.value}
              checked={selectedCategory === option.value}
              label={option.label}
              count={option.count}
              onChange={() => toggleCategory(option.value)}
            />
          ))}
        </>
      </FilterSection>

      <FilterSection
        title="Dung tích"
        emptyLabel="Chưa có dung tích để lọc"
        isEmpty={volumes.length === 0}
      >
        <>
          {volumes.map((option) => {
            const volume = Number(option.value);
            return (
              <FilterCheckbox
                key={option.value}
                checked={selectedVolumes.includes(volume)}
                label={`${option.value}ml`}
                count={option.count}
                onChange={() => toggleVolume(volume)}
              />
            );
          })}
        </>
      </FilterSection>

      <FilterSection
        title="Giới tính"
        emptyLabel="Chưa có giới tính để lọc"
        isEmpty={genders.length === 0}
      >
        <>
          {genders.map((option) => (
            <FilterCheckbox
              key={option.value}
              checked={selectedGenders.includes(option.value as FragranceGender)}
              label={GENDER_LABELS[option.value] ?? option.value}
              count={option.count}
              onChange={() => toggleGender(option.value as FragranceGender)}
            />
          ))}
        </>
      </FilterSection>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="text-sm font-medium text-primary hover:underline"
        >
          Xóa bộ lọc
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-pink flex flex-col">
      <Header />

      <div className="container mx-auto px-4 md:px-8 pt-24 md:pt-28 pb-4">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">Trang chủ</Link>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">
            {selectedCategory
              ? (categories.find((item) => item.slug === selectedCategory)?.name ?? "Sản phẩm")
              : selectedGenders.length === 1
                ? GENDER_LABELS[selectedGenders[0]] ?? "Sản phẩm"
                : search
                  ? `Kết quả: "${search}"`
                  : "Tất cả sản phẩm"}
          </span>
        </nav>
      </div>

      <div className="flex-1 container mx-auto px-4 md:px-8 pb-16">
        <div className="flex flex-col md:flex-row gap-8">
          <aside className="hidden md:block w-72 shrink-0">
            <div className="sticky top-24 md:top-28 max-h-[calc(100vh-8rem)] overflow-y-auto pr-3">
              {renderFilterSections()}
            </div>
          </aside>

          <div className="flex-1">
            <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-muted-foreground">
                {isLoading ? "Đang tải..." : `${total} sản phẩm`}
                {search ? <span className="ml-1 text-foreground font-medium"> — "{search}"</span> : null}
              </p>

              <div className="hidden md:flex items-center gap-2">
                <SlidersHorizontal size={14} className="text-muted-foreground" />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="h-9 pl-3 pr-8 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="md:hidden mb-5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground bg-background"
              >
                <Filter size={16} /> Bộ lọc
              </button>

              <div className="flex-1 flex items-center gap-2">
                <SlidersHorizontal size={14} className="text-muted-foreground" />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="h-9 w-full pl-3 pr-8 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetContent side="bottom" className="md:hidden rounded-t-2xl max-h-[80vh] overflow-y-auto">
                <SheetHeader className="mb-4">
                  <SheetTitle>Bộ lọc</SheetTitle>
                </SheetHeader>
                {renderFilterSections("pr-2")}
              </SheetContent>
            </Sheet>

            {isLoading ? (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-4 md:gap-5 md:max-w-[980px] md:mx-auto">
                {Array.from({ length: LIMIT }).map((_, index) => (
                  <div key={index} className="rounded-xl bg-card border border-border overflow-hidden animate-pulse">
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
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 text-sm text-primary hover:underline"
                  >
                    Xóa bộ lọc
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-4 md:gap-5 md:max-w-[980px] md:mx-auto">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} compact showActions />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: totalPages }, (_, index) => index + 1)
                  .filter((item) => item === 1 || item === totalPages || Math.abs(item - page) <= 2)
                  .reduce<(number | "...")[]>((acc, item, index, array) => {
                    if (index > 0 && item - (array[index - 1] as number) > 1) acc.push("...");
                    acc.push(item);
                    return acc;
                  }, [])
                  .map((item, index) =>
                    item === "..." ? (
                      <span key={`dots-${index}`} className="px-2 text-muted-foreground text-sm">…</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setPage(item as number)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                          page === item
                            ? "bg-primary text-primary-foreground"
                            : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {item}
                      </button>
                    ),
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
}
