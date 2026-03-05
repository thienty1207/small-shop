/**
 * admin-api.ts
 *
 * Thin wrapper around `fetch` that automatically injects the admin JWT token
 * stored under "admin_auth_token" in localStorage.
 */

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const TOKEN_KEY = "admin_auth_token";

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

/** Generic fetch with JSON body and automatic auth headers. */
export async function adminFetch<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options?.headers as Record<string, string> | undefined),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(
      (err as { error?: string }).error ?? `Request failed: ${res.status}`,
    );
  }

  return res.json() as Promise<T>;
}

/** Upload an image file to /api/admin/upload/image, returns the URL string. */
export async function adminUploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(`${BASE}/api/admin/upload/image`, {
    method: "POST",
    headers: authHeaders(), // no Content-Type — browser sets multipart boundary
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error((err as { error?: string }).error ?? "Upload failed");
  }

  const { url } = (await res.json()) as { url: string };
  return url;
}

// ─── Convenience wrappers ────────────────────────────────────────────────────

export const adminGet  = <T>(path: string) => adminFetch<T>(path);
export const adminPost = <T>(path: string, body: unknown) =>
  adminFetch<T>(path, { method: "POST", body: JSON.stringify(body) });
export const adminPut  = <T>(path: string, body: unknown) =>
  adminFetch<T>(path, { method: "PUT",  body: JSON.stringify(body) });
export const adminDel  = <T>(path: string) =>
  adminFetch<T>(path, { method: "DELETE" });

// ─── Typed response types (mirrors Rust structs) ──────────────────────────────

export interface AdminProduct {
  id:             string;
  category_id:    string;
  category_name:  string;
  name:           string;
  slug:           string;
  price:          number;
  original_price: number | null;
  image_url:      string;
  badge:          string | null;
  description:    string | null;
  in_stock:       boolean;
  stock:          number;
  created_at:     string;
}

export interface Category {
  id:        string;
  name:      string;
  slug:      string;
  image_url: string | null;
  created_at: string;
}

export interface AdminOrder {
  id:             string;
  order_code:     string;
  customer_name:  string;
  customer_email: string;
  customer_phone: string;
  status:         string;
  payment_method: string;
  total:          number;
  items_count:    number;
  created_at:     string;
}

export interface OrderDetail {
  order: {
    id:             string;
    order_code:     string;
    customer_name:  string;
    customer_email: string;
    customer_phone: string;
    address:        string;
    note:           string | null;
    payment_method: string;
    status:         string;
    subtotal:       number;
    shipping_fee:   number;
    total:          number;
    created_at:     string;
    updated_at:     string;
  };
  items: Array<{
    id:            string;
    product_name:  string;
    product_image: string;
    variant:       string;
    quantity:      number;
    unit_price:    number;
    subtotal:      number;
  }>;
}

export interface PaginatedResponse<T> {
  items:       T[];
  total:       number;
  page:        number;
  limit:       number;
  total_pages: number;
}

export interface DashboardStats {
  revenue_today:              number;
  revenue_this_month:         number;
  orders_total:               number;
  orders_pending:             number;
  orders_confirmed:           number;
  orders_shipping:            number;
  orders_delivered:           number;
  orders_cancelled:           number;
  customers_total:            number;
  new_customers_this_month:   number;
  products_total:             number;
  products_out_of_stock:      number;
}

export interface RevenuePoint {
  month:   string;
  revenue: number;
}

export interface TopProduct {
  id:         string;
  name:       string;
  image_url:  string;
  units_sold: number;
  revenue:    number;
}

export interface DashboardData {
  stats:         DashboardStats;
  recent_orders: AdminOrder[];
  revenue_chart: RevenuePoint[];
  top_products:  TopProduct[];
}
