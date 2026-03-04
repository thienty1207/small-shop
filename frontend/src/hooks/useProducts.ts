import { useEffect, useState } from "react";
import type { Category, Product } from "@/data/products";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// ---------------------------------------------------------------------------
// Raw API shapes (snake_case from the backend)
// ---------------------------------------------------------------------------

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
  material?: string;
  care?: string;
  rating: number;
  review_count: number;
  in_stock: boolean;
}

interface ApiCategory {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

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
    material: p.material,
    care: p.care,
    rating: p.rating,
    reviewCount: p.review_count,
    inStock: p.in_stock,
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

interface UseProductsResult {
  products: Product[];
  isLoading: boolean;
  error: string | null;
}

/** Fetch all products, optionally filtered by category slug or search query. */
export function useProducts(
  opts: { category?: string; search?: string } = {}
): UseProductsResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (opts.category) params.set("category", opts.category);
    if (opts.search) params.set("search", opts.search);

    const url = `${API_URL}/api/products${params.toString() ? "?" + params.toString() : ""}`;

    setIsLoading(true);
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch products");
        return res.json();
      })
      .then((data: ApiProduct[]) => {
        setProducts(data.map(mapProduct));
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [opts.category, opts.search]);

  return { products, isLoading, error };
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
