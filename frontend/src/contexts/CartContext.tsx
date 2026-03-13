import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import type { Product } from "@/data/products";
import { useAuth } from "@/contexts/AuthContext";

const TOKEN_KEY = "auth_token";
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface CartItem {
  id?: string; // backend cart_item id (only when synced)
  product: Product;
  quantity: number;
  variantId?: string;    // product_variant id
  variantLabel?: string; // e.g. "75ml"
  variant?: string;      // legacy free-text (kept for backward compat)
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity?: number, variantId?: string, variantLabel?: string) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  totalAmount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Map backend cart item to frontend CartItem shape
interface BackendCartItem {
  id: string;
  product_id: string;
  quantity: number;
  variant: string | null;
  product_name: string;
  product_image: string | null;
  product_slug: string;
  price: number;
  original_price: number | null;
}

function backendItemToCartItem(b: BackendCartItem): CartItem {
  const variantLabel = b.variant && b.variant !== "" ? b.variant : undefined;
  return {
    id: b.id,
    product: {
      id: b.product_id,
      name: b.product_name,
      slug: b.product_slug,
      price: b.price,           // now correctly the variant price from backend
      originalPrice: b.original_price ?? undefined,
      image: b.product_image ?? "",
    } as Product,
    quantity: b.quantity,
    variant: variantLabel,       // legacy field
    variantLabel,                // used for display + dedup key
  };
}

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);

  // Fetch cart from backend when user logs in
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    fetch(`${API_BASE}/api/cart`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: BackendCartItem[]) => {
        setItems(data.map(backendItemToCartItem));
      })
      .catch(() => {/* keep local state on error */});
  }, [isAuthenticated, authLoading]);

  // Clear local cart when user logs out
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setItems([]);
    }
  }, [isAuthenticated, authLoading]);

  const addItem = useCallback((product: Product, quantity = 1, variantId?: string, variantLabel?: string) => {
    const variantKey = variantLabel ?? variantId ?? "";
    // Optimistic update — match by variantLabel (persisted) OR variantId (UUID, only in-memory)
    setItems((prev) => {
      const existing = prev.find(
        (item) => item.product.id === product.id &&
          ((item.variantLabel ?? item.variantId ?? "") === variantKey)
      );
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id &&
          ((item.variantLabel ?? item.variantId ?? "") === variantKey)
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity, variantId, variantLabel, variant: variantLabel }];
    });

    // Sync to backend if authenticated
    const token = localStorage.getItem(TOKEN_KEY);
    if (isAuthenticated && token) {
      fetch(`${API_BASE}/api/cart/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: product.id,
          quantity,
          variant: variantLabel ?? null,
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((updated) => {
          if (updated) {
            return fetch(`${API_BASE}/api/cart`, {
              headers: { Authorization: `Bearer ${token}` },
            })
              .then((r) => (r.ok ? r.json() : null))
              .then((data: BackendCartItem[] | null) => {
                if (data) setItems(data.map(backendItemToCartItem));
              });
          }
        })
        .catch(() => {/* keep optimistic state */});
    }
  }, [isAuthenticated]);

  const removeItem = useCallback((productId: string, variantKey?: string) => {
    const itemToRemove = items.find(
      (item) => item.product.id === productId &&
        ((item.variantLabel ?? item.variantId ?? "") === (variantKey ?? ""))
    );

    setItems((prev) => prev.filter(
      (item) => !(item.product.id === productId &&
        ((item.variantLabel ?? item.variantId ?? "") === (variantKey ?? "")))
    ));

    const token = localStorage.getItem(TOKEN_KEY);
    if (isAuthenticated && token && itemToRemove?.id) {
      fetch(`${API_BASE}/api/cart/items/${itemToRemove.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {/* ignore errors */});
    }
  }, [isAuthenticated, items]);

  const updateQuantity = useCallback((productId: string, quantity: number, variantKey?: string) => {
    if (quantity <= 0) {
      removeItem(productId, variantKey);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId &&
        ((item.variantLabel ?? item.variantId ?? "") === (variantKey ?? ""))
          ? { ...item, quantity }
          : item
      )
    );
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);

    const token = localStorage.getItem(TOKEN_KEY);
    if (isAuthenticated && token) {
      fetch(`${API_BASE}/api/cart`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {/* ignore errors */});
    }
  }, [isAuthenticated]);

  const totalAmount = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalAmount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};

