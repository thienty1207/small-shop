import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import type { Product } from "@/data/products";
import { useAuth } from "@/contexts/AuthContext";

const TOKEN_KEY = "auth_token";
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface CartItem {
  id?: string; // backend cart_item id (only when synced)
  product: Product;
  quantity: number;
  variant?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity?: number, variant?: string) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
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
  return {
    id: b.id,
    product: {
      id: b.product_id,
      name: b.product_name,
      slug: b.product_slug,
      price: b.price,
      originalPrice: b.original_price ?? undefined,
      image: b.product_image ?? "",
    } as Product,
    quantity: b.quantity,
    variant: b.variant ?? undefined,
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

  const addItem = useCallback((product: Product, quantity = 1, variant?: string) => {
    // Optimistic update
    setItems((prev) => {
      const existing = prev.find(
        (item) => item.product.id === product.id && item.variant === variant
      );
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id && item.variant === variant
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity, variant }];
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
          variant: variant ?? null,
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((updated) => {
          if (updated) {
            // Refresh full cart to get accurate backend state (ids, quantities)
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

  const removeItem = useCallback((productId: string) => {
    const itemToRemove = items.find((item) => item.product.id === productId);

    setItems((prev) => prev.filter((item) => item.product.id !== productId));

    const token = localStorage.getItem(TOKEN_KEY);
    if (isAuthenticated && token && itemToRemove?.id) {
      fetch(`${API_BASE}/api/cart/items/${itemToRemove.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {/* ignore errors */});
    }
  }, [isAuthenticated, items]);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
    // Note: backend only has upsert (add), not a separate "set quantity" endpoint.
    // A full implementation would need PATCH /api/cart/items/:id — for now local only.
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

