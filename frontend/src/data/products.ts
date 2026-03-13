// Type definitions for products and categories.
// Mock arrays have been removed — data is now fetched from the backend API.
// See frontend/src/hooks/useProducts.ts for API hooks.

import type { ProductVariant } from "@/hooks/useProducts";

export interface Product {
  id: string;
  slug: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;         // maps to image_url from API
  images?: string[];
  category: string;      // category_id from API
  badge?: string;
  description?: string;
  material?: string;   // @deprecated — kept for backward compat during migration
  topNote?: string;
  midNote?: string;
  baseNote?: string;
  care?: string;
  rating?: number;
  reviewCount?: number;
  inStock?: boolean;
  stock?: number;
  brand?: string;
  concentration?: string;
  variants?: ProductVariant[];
}


export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string;         // maps to image_url from API
}

export interface Review {
  id: string;
  name: string;
  avatar: string;
  content: string;
  rating: number;
}

export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
};
