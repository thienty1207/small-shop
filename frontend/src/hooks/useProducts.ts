import { useEffect, useState } from "react";
import type { Category, Product } from "@/data/products";
import type { FragranceGender, FragranceLine, HomepageSection } from "@/lib/fragrance";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// ---------------------------------------------------------------------------
// Raw API shapes (snake_case from the backend)
// ---------------------------------------------------------------------------

export interface ProductVariant {
  id: string;
  productId: string;
  ml: number;
  price: number;
  originalPrice?: number;
  stock: number;
  isDefault: boolean;
}

interface ApiProductVariant {
  id: string;
  product_id: string;
  ml: number;
  price: number;
  original_price?: number;
  stock: number;
  is_default: boolean;
}

interface ApiProduct {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  price: number;
  original_price?: number;
  image_url: string;
  images: string[];
  badge?: string;
  description?: string;
  top_note?: string;
  mid_note?: string;
  base_note?: string;
  care?: string;
  rating: number;
  review_count: number;
  in_stock: boolean;
  stock: number;
  brand?: string;
  concentration?: string;
  fragrance_gender?: FragranceGender;
  homepage_section?: HomepageSection;
  fragrance_line?: FragranceLine;
  variants?: ApiProductVariant[];
}

interface ApiCategory {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

interface ApiProductFilterOption {
  value: string;
  count: number;
}

interface ApiProductFilters {
  brands: ApiProductFilterOption[];
  volumes: ApiProductFilterOption[];
  genders: ApiProductFilterOption[];
}

function sortFilterOptions(options: ProductFilterOption[], mode: "label" | "number" = "label") {
  if (mode === "number") {
    return [...options].sort((a, b) => Number(a.value) - Number(b.value));
  }

  return [...options].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.value.localeCompare(b.value, "vi");
  });
}

function buildFilterOptionsFromProducts(products: ApiProduct[]): ApiProductFilters {
  const brandCounts = new Map<string, number>();
  const volumeCounts = new Map<string, number>();
  const genderCounts = new Map<string, number>();

  products.forEach((product) => {
    const brand = product.brand?.trim();
    if (brand) {
      brandCounts.set(brand, (brandCounts.get(brand) ?? 0) + 1);
    }

    const gender = product.fragrance_gender?.trim().toLowerCase();
    if (gender) {
      genderCounts.set(gender, (genderCounts.get(gender) ?? 0) + 1);
    }

    const seenVolumes = new Set<number>();
    (product.variants ?? []).forEach((variant) => {
      if (variant.ml > 0) seenVolumes.add(variant.ml);
    });

    seenVolumes.forEach((ml) => {
      const key = String(ml);
      volumeCounts.set(key, (volumeCounts.get(key) ?? 0) + 1);
    });
  });

  return {
    brands: sortFilterOptions(
      Array.from(brandCounts.entries()).map(([value, count]) => ({ value, count })),
    ),
    volumes: sortFilterOptions(
      Array.from(volumeCounts.entries()).map(([value, count]) => ({ value, count })),
      "number",
    ),
    genders: sortFilterOptions(
      Array.from(genderCounts.entries()).map(([value, count]) => ({ value, count })),
    ),
  };
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapVariant(v: ApiProductVariant): ProductVariant {
  return {
    id: v.id,
    productId: v.product_id,
    ml: v.ml,
    price: v.price,
    originalPrice: v.original_price,
    stock: v.stock,
    isDefault: v.is_default,
  };
}

function mapProduct(p: ApiProduct): Product {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    originalPrice: p.original_price,
    image: p.image_url,
    images: p.images,
    category: p.category_id,
    badge: p.badge,
    description: p.description,
    topNote: p.top_note,
    midNote: p.mid_note,
    baseNote: p.base_note,
    care: p.care,
    rating: p.rating,
    reviewCount: p.review_count,
    inStock: p.in_stock,
    stock: p.stock,
    brand: p.brand,
    concentration: p.concentration,
    fragranceGender: p.fragrance_gender,
    homepageSection: p.homepage_section,
    fragranceLine: p.fragrance_line,
    variants: p.variants?.map(mapVariant) ?? [],
  };
}

function mapCategory(c: ApiCategory): Category {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    image: c.image_url ?? "",
  };
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export interface UseProductsResult {
  products: Product[];
  total: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
}

export interface UseProductsOpts {
  category?: string;
  search?: string;
  sort?: string;
  badge?: string;
  brands?: string[];
  volumes?: number[];
  fragranceGender?: FragranceGender | FragranceGender[];
  homepageSection?: HomepageSection | HomepageSection[];
  page?: number;
  limit?: number;
}

export interface ProductFilterOption {
  value: string;
  count: number;
}

export interface ProductFiltersResult {
  brands: ProductFilterOption[];
  volumes: ProductFilterOption[];
  genders: ProductFilterOption[];
  isLoading: boolean;
  error: string | null;
}

function normalizeStringArray(values?: string[]): string[] {
  if (!values) return [];
  return values.map((value) => value.trim()).filter((value) => value.length > 0);
}

function normalizeNumberArray(values?: number[]): number[] {
  if (!values) return [];
  return values.filter((value) => Number.isFinite(value) && value > 0);
}

/** Fetch paginated products with optional filter/sort. */
export function useProducts(opts: UseProductsOpts = {}): UseProductsResult {
  const [products, setProducts]   = useState<Product[]>([]);
  const [total, setTotal]         = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const category = opts.category ?? "";
  const search   = opts.search   ?? "";
  const sort     = opts.sort     ?? "";
  const badge    = opts.badge    ?? "";
  const brands   = normalizeStringArray(opts.brands);
  const volumes  = normalizeNumberArray(opts.volumes);
  const fragranceGender = Array.isArray(opts.fragranceGender)
    ? normalizeStringArray(opts.fragranceGender)
    : opts.fragranceGender
      ? [opts.fragranceGender]
      : [];
  const homepageSection = Array.isArray(opts.homepageSection)
    ? normalizeStringArray(opts.homepageSection)
    : opts.homepageSection
      ? [opts.homepageSection]
      : [];
  const page     = opts.page     ?? 1;
  const limit    = opts.limit    ?? 12;

  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (search)   params.set("search", search);
    if (sort)     params.set("sort", sort);
    if (badge)    params.set("badge", badge);
    if (brands.length > 0) params.set("brand", brands.join(","));
    if (volumes.length > 0) params.set("volume", volumes.join(","));
    if (fragranceGender.length > 0) params.set("fragrance_gender", fragranceGender.join(","));
    if (homepageSection.length > 0) params.set("homepage_section", homepageSection.join(","));
    params.set("page",  String(page));
    params.set("limit", String(limit));

    setIsLoading(true);
    fetch(`${API_URL}/api/products?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch products");
        return res.json() as Promise<PaginatedResponse<ApiProduct>>;
      })
      .then((data) => {
        setProducts(data.items.map(mapProduct));
        setTotal(data.total);
        setTotalPages(data.total_pages);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, search, sort, badge, brands.join(","), volumes.join(","), fragranceGender.join(","), homepageSection.join(","), page, limit]);

  return { products, total, totalPages, isLoading, error };
}

export function useProductFilters(opts: Pick<UseProductsOpts, "category" | "search"> = {}): ProductFiltersResult {
  const [brands, setBrands] = useState<ProductFilterOption[]>([]);
  const [volumes, setVolumes] = useState<ProductFilterOption[]>([]);
  const [genders, setGenders] = useState<ProductFilterOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const category = opts.category ?? "";
  const search = opts.search ?? "";

  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (search) params.set("search", search);

    setIsLoading(true);
    const filtersUrl = `${API_URL}/api/products/filters?${params.toString()}`;
    const productsFallbackUrl = `${API_URL}/api/products?${params.toString()}${params.toString() ? "&" : ""}page=1&limit=1000`;

    fetch(filtersUrl)
      .then(async (res) => {
        if (res.ok) {
          return res.json() as Promise<ApiProductFilters>;
        }

        // Fallback for older backend instances that do not expose /api/products/filters yet.
        const productsRes = await fetch(productsFallbackUrl);
        if (!productsRes.ok) throw new Error("Failed to fetch product filters");
        const productsData = await productsRes.json() as PaginatedResponse<ApiProduct>;
        return buildFilterOptionsFromProducts(productsData.items);
      })
      .then((data) => {
        setBrands(data.brands);
        setVolumes(data.volumes);
        setGenders(data.genders);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [category, search]);

  return { brands, volumes, genders, isLoading, error };
}

interface UseProductResult {
  product: Product | null;
  isLoading: boolean;
  error: string | null;
}

/** Fetch a single product by its slug. */
export function useProduct(slug: string): UseProductResult {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    setIsLoading(true);
    fetch(`${API_URL}/api/products/${slug}`)
      .then((res) => {
        if (res.status === 404) throw new Error("Product not found");
        if (!res.ok) throw new Error("Failed to fetch product");
        return res.json();
      })
      .then((data: ApiProduct) => {
        setProduct(mapProduct(data));
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [slug]);

  return { product, isLoading, error };
}

interface UseCategoriesResult {
  categories: Category[];
  isLoading: boolean;
  error: string | null;
}

/** Fetch all categories. */
export function useCategories(): UseCategoriesResult {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/categories`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch categories");
        return res.json();
      })
      .then((data: ApiCategory[]) => {
        setCategories(data.map(mapCategory));
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, []);

  return { categories, isLoading, error };
}

interface UseRelatedProductsResult {
  products: Product[];
  isLoading: boolean;
}

/** Fetch related products for a given product slug from the backend. */
export function useRelatedProducts(slug: string, limit = 4): UseRelatedProductsResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setIsLoading(true);
    fetch(`${API_URL}/api/products/${slug}/related?limit=${limit}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ApiProduct[]) => setProducts(data.map(mapProduct)))
      .catch(() => setProducts([]))
      .finally(() => setIsLoading(false));
  }, [slug, limit]);

  return { products, isLoading };
}
