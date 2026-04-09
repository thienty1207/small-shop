import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Product } from "@/data/products";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/lib/api-base";

/* eslint-disable react-refresh/only-export-components */

const API_URL = API_BASE_URL;
const TOKEN_KEY = "auth_token";
const WISHLIST_BASES = ["/api/wishlist", "/api/wishlists"];

interface ApiProductVariant {
  id: string;
  product_id: string;
  ml: number;
  price: number;
  original_price?: number;
  stock: number;
  is_default: boolean;
}

interface ApiWishlistProduct {
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
  variants?: ApiProductVariant[];
}

interface WishlistContextValue {
  wishlistIds: string[];
  isLoading: boolean;
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (productId: string) => Promise<boolean>;
  fetchWishlistProducts: () => Promise<Product[]>;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

function mapProduct(p: ApiWishlistProduct): Product {
  const resolveImg = (url: string) => (url?.startsWith("/") ? `${API_URL}${url}` : url);

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    originalPrice: p.original_price,
    image: resolveImg(p.image_url),
    images: (p.images ?? []).map(resolveImg),
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
    variants: (p.variants ?? []).map((v) => ({
      id: v.id,
      productId: v.product_id,
      ml: v.ml,
      price: v.price,
      originalPrice: v.original_price,
      stock: v.stock,
      isDefault: v.is_default,
    })),
  };
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const requestWishlist = useCallback(
    async (path: string, init?: RequestInit): Promise<Response> => {
      let lastRes: Response | null = null;

      for (const base of WISHLIST_BASES) {
        const res = await fetch(`${API_URL}${base}${path}`, init);
        if (res.ok) return res;

        // fallback to next base only when endpoint not found
        if (res.status !== 404) return res;
        lastRes = res;
      }

      return lastRes ?? new Response(null, { status: 404 });
    },
    [],
  );

  const fetchIds = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || !isAuthenticated) {
      setWishlistIds([]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await requestWishlist("/ids", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch wishlist ids");
      const json = await res.json();
      setWishlistIds(Array.isArray(json?.data) ? json.data : []);
    } catch {
      setWishlistIds([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, requestWishlist]);

  const fetchWishlistProducts = useCallback(async (): Promise<Product[]> => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || !isAuthenticated) return [];

    const res = await requestWishlist("", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Failed to fetch wishlist");
    const json = await res.json();
    const rows: ApiWishlistProduct[] = Array.isArray(json?.data) ? json.data : [];
    return rows.map(mapProduct);
  }, [isAuthenticated, requestWishlist]);

  const toggleWishlist = useCallback(async (productId: string): Promise<boolean> => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || !isAuthenticated) {
      throw new Error("UNAUTHENTICATED");
    }

    const res = await requestWishlist(`/${productId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Failed to toggle wishlist");
    const json = await res.json();
    const isWishlisted = Boolean(json?.data?.is_wishlisted);

    setWishlistIds((prev) =>
      isWishlisted ? Array.from(new Set([...prev, productId])) : prev.filter((id) => id !== productId),
    );

    return isWishlisted;
  }, [isAuthenticated, requestWishlist]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setWishlistIds([]);
      return;
    }
    fetchIds();
  }, [authLoading, isAuthenticated, fetchIds]);

  const value = useMemo<WishlistContextValue>(() => ({
    wishlistIds,
    isLoading,
    isWishlisted: (productId: string) => wishlistIds.includes(productId),
    toggleWishlist,
    fetchWishlistProducts,
  }), [wishlistIds, isLoading, toggleWishlist, fetchWishlistProducts]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside <WishlistProvider>");
  return ctx;
}
