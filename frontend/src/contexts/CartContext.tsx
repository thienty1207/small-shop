import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
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

interface CartActionResult {
  ok: boolean;
  error?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity?: number, variantId?: string, variantLabel?: string) => Promise<CartActionResult>;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => Promise<CartActionResult>;
  clearCart: () => void;
  totalAmount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

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
  stock: number;
}

function backendItemToCartItem(b: BackendCartItem): CartItem {
  const variantLabel = b.variant && b.variant !== "" ? b.variant : undefined;
  return {
    id: b.id,
    product: {
      id: b.product_id,
      name: b.product_name,
      slug: b.product_slug,
      price: b.price,
      originalPrice: b.original_price ?? undefined,
      image: b.product_image ?? "",
      stock: b.stock,
      inStock: b.stock > 0,
    } as Product,
    quantity: b.quantity,
    variant: variantLabel,
    variantLabel,
  };
}

function getCartLineKey(variantLabel?: string, variantId?: string): string {
  return variantLabel ?? variantId ?? "";
}

function getStockLimit(product: Product, variantLabel?: string, variantId?: string): number {
  const matchedVariant = product.variants?.find((variant) => {
    const label = `${variant.ml}ml`;
    return label === variantLabel || variant.id === variantId;
  });

  return matchedVariant?.stock ?? product.stock ?? 99;
}

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);

  const fetchCart = useCallback(async (token: string) => {
    const res = await fetch(`${API_BASE}/api/cart`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;

    const data = await (res.json() as Promise<BackendCartItem[]>);
    setItems(data.map(backendItemToCartItem));
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    fetchCart(token).catch(() => {});
  }, [authLoading, fetchCart, isAuthenticated]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setItems([]);
    }
  }, [isAuthenticated, authLoading]);

  const addItem = useCallback(async (
    product: Product,
    quantity = 1,
    variantId?: string,
    variantLabel?: string,
  ): Promise<CartActionResult> => {
    const variantKey = getCartLineKey(variantLabel, variantId);
    const existingQuantity = items.find(
      (item) => item.product.id === product.id &&
        getCartLineKey(item.variantLabel, item.variantId) === variantKey,
    )?.quantity ?? 0;
    const stockLimit = getStockLimit(product, variantLabel, variantId);

    if (existingQuantity + quantity > stockLimit) {
      return {
        ok: false,
        error: `Chỉ còn ${stockLimit} chai cho dung tích ${variantLabel ?? "đã chọn"}.`,
      };
    }

    const token = localStorage.getItem(TOKEN_KEY);
    if (isAuthenticated && token) {
      const res = await fetch(`${API_BASE}/api/cart/items`, {
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
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Không thể thêm vào giỏ hàng" }));
        return {
          ok: false,
          error: (err as { error?: string }).error ?? "Không thể thêm vào giỏ hàng",
        };
      }

      await fetchCart(token);
      return { ok: true };
    }

    setItems((prev) => {
      const existing = prev.find(
        (item) => item.product.id === product.id &&
          getCartLineKey(item.variantLabel, item.variantId) === variantKey,
      );
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id &&
          getCartLineKey(item.variantLabel, item.variantId) === variantKey
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      }
      return [...prev, { product, quantity, variantId, variantLabel, variant: variantLabel }];
    });

    return { ok: true };
  }, [fetchCart, isAuthenticated, items]);

  const removeItem = useCallback((productId: string, variantKey?: string) => {
    const itemToRemove = items.find(
      (item) => item.product.id === productId &&
        getCartLineKey(item.variantLabel, item.variantId) === (variantKey ?? ""),
    );

    setItems((prev) => prev.filter(
      (item) => !(item.product.id === productId &&
        getCartLineKey(item.variantLabel, item.variantId) === (variantKey ?? "")),
    ));

    const token = localStorage.getItem(TOKEN_KEY);
    if (isAuthenticated && token && itemToRemove?.id) {
      fetch(`${API_BASE}/api/cart/items/${itemToRemove.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  }, [isAuthenticated, items]);

  const updateQuantity = useCallback(async (
    productId: string,
    quantity: number,
    variantKey?: string,
  ): Promise<CartActionResult> => {
    if (quantity <= 0) {
      removeItem(productId, variantKey);
      return { ok: true };
    }

    const existingItem = items.find(
      (item) => item.product.id === productId &&
        getCartLineKey(item.variantLabel, item.variantId) === (variantKey ?? ""),
    );

    if (!existingItem) {
      return { ok: false, error: "Không tìm thấy sản phẩm trong giỏ." };
    }

    const stockLimit = getStockLimit(existingItem.product, existingItem.variantLabel, existingItem.variantId);
    if (quantity > stockLimit) {
      return {
        ok: false,
        error: `Chỉ còn ${stockLimit} chai cho ${existingItem.variantLabel ?? "sản phẩm này"}.`,
      };
    }

    const token = localStorage.getItem(TOKEN_KEY);
    if (isAuthenticated && token && existingItem.id) {
      const res = await fetch(`${API_BASE}/api/cart/items/${existingItem.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quantity }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Không thể cập nhật giỏ hàng" }));
        return {
          ok: false,
          error: (err as { error?: string }).error ?? "Không thể cập nhật giỏ hàng",
        };
      }

      await fetchCart(token);
      return { ok: true };
    }

    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId &&
        getCartLineKey(item.variantLabel, item.variantId) === (variantKey ?? "")
          ? { ...item, quantity }
          : item,
      ),
    );
    return { ok: true };
  }, [fetchCart, isAuthenticated, items, removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);

    const token = localStorage.getItem(TOKEN_KEY);
    if (isAuthenticated && token) {
      fetch(`${API_BASE}/api/cart`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  }, [isAuthenticated]);

  const totalAmount = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
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
