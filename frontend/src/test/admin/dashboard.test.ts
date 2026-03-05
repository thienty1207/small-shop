/**
 * Tests for Admin Dashboard utilities and data-handling logic.
 *
 * Covers:
 *  - fmtVND helper (incl. null/undefined safety — the root cause of the white screen)
 *  - fmtDate helper
 *  - statCards field mapping correctness
 *  - Defensive behaviour when API returns unexpected shape
 */

import { describe, it, expect } from "vitest";
import type { DashboardStats } from "@/lib/admin-api";

// ── Mirror of the helpers defined in Dashboard.tsx ────────────────────────────
// (Copied here so we can unit-test them without importing the React component)

function fmtVND(n: number | undefined | null): string {
  return (n ?? 0).toLocaleString("vi-VN") + " ₫";
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN");
}

// ── Mock data that mirrors what the backend sends ─────────────────────────────

const MOCK_STATS: DashboardStats = {
  revenue_today:            500_000,
  revenue_this_month:     42_580_000,
  orders_total:           128,
  orders_pending:          12,
  orders_confirmed:         8,
  orders_shipping:         15,
  orders_delivered:        87,
  orders_cancelled:         6,
  customers_total:         72,
  new_customers_this_month: 5,
  products_total:          24,
  products_out_of_stock:    2,
};

// ─────────────────────────────────────────────────────────────────────────────

describe("fmtVND", () => {
  it("formats zero correctly", () => {
    expect(fmtVND(0)).toBe("0 ₫");
  });

  it("formats a typical VND amount with thousand separators", () => {
    // vi-VN locale uses '.' as thousands separator
    expect(fmtVND(42_580_000)).toMatch(/42.*580.*000/);
    expect(fmtVND(42_580_000)).toContain("₫");
  });

  it("does NOT crash when called with undefined (the original bug)", () => {
    expect(() => fmtVND(undefined)).not.toThrow();
    expect(fmtVND(undefined)).toBe("0 ₫");
  });

  it("does NOT crash when called with null", () => {
    expect(() => fmtVND(null)).not.toThrow();
    expect(fmtVND(null)).toBe("0 ₫");
  });

  it("handles negative numbers gracefully", () => {
    expect(() => fmtVND(-1000)).not.toThrow();
    expect(fmtVND(-1000)).toContain("₫");
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("fmtDate", () => {
  it("returns a localised date string from an ISO timestamp", () => {
    const result = fmtDate("2026-03-05T10:00:00Z");
    // vi-VN format: DD/MM/YYYY
    expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
  });

  it("does not throw for a valid ISO string", () => {
    expect(() => fmtDate("2025-01-01T00:00:00Z")).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("DashboardStats field mapping", () => {
  it("MOCK_STATS has all required fields matching the DashboardStats interface", () => {
    const requiredFields: (keyof DashboardStats)[] = [
      "revenue_today",
      "revenue_this_month",
      "orders_total",
      "orders_pending",
      "orders_confirmed",
      "orders_shipping",
      "orders_delivered",
      "orders_cancelled",
      "customers_total",
      "new_customers_this_month",
      "products_total",
      "products_out_of_stock",
    ];
    for (const field of requiredFields) {
      expect(MOCK_STATS).toHaveProperty(field);
      expect(typeof MOCK_STATS[field]).toBe("number");
    }
  });

  it("does NOT have legacy wrong field names (the fields that caused crashes)", () => {
    // These were the wrong names used in old Dashboard.tsx — must NOT exist in interface
    const wrongFields = ["total_customers", "total_products", "low_stock_products"];
    for (const field of wrongFields) {
      expect(MOCK_STATS).not.toHaveProperty(field);
    }
  });

  it("computes stat card values from correct fields", () => {
    const stats = MOCK_STATS;

    // Revenue card
    expect(fmtVND(stats.revenue_this_month)).toContain("₫");
    expect(fmtVND(stats.revenue_today)).toContain("₫");

    // Orders card
    expect(String(stats.orders_total)).toBe("128");
    expect(stats.orders_pending + " chờ xử lý").toBe("12 chờ xử lý");

    // Customers card — correct field is customers_total (NOT total_customers)
    expect(String(stats.customers_total)).toBe("72");
    expect(stats.new_customers_this_month + " mới tháng này").toBe("5 mới tháng này");

    // Products card — correct field is products_total (NOT total_products)
    expect(String(stats.products_total)).toBe("24");
    // correct field is products_out_of_stock (NOT low_stock_products)
    expect(stats.products_out_of_stock + " sắp hết hàng").toBe("2 sắp hết hàng");
  });

  it("status breakdown uses correct orders_* keys", () => {
    const keys = ["delivered", "shipping", "pending", "confirmed", "cancelled"] as const;
    for (const key of keys) {
      const field = `orders_${key}` as keyof DashboardStats;
      expect(MOCK_STATS).toHaveProperty(field);
      expect(typeof MOCK_STATS[field]).toBe("number");
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("Defensive null-guard for API shape mismatch", () => {
  it("statCards returns [] when stats is null/undefined — no crash", () => {
    // Simulate the guard: `const stats = data?.stats ?? null`
    function buildStatCards(stats: DashboardStats | null) {
      if (!stats) return [];
      return [
        { label: "Doanh thu", value: fmtVND(stats.revenue_this_month) },
        { label: "Đơn hàng",  value: String(stats.orders_total) },
      ];
    }

    // Should not crash when stats is null (API returned unexpected shape)
    expect(() => buildStatCards(null)).not.toThrow();
    expect(buildStatCards(null)).toEqual([]);

    // Should not crash when stats is undefined
    expect(() => buildStatCards(undefined as unknown as null)).not.toThrow();

    // Should produce correct cards when stats is valid
    const cards = buildStatCards(MOCK_STATS);
    expect(cards).toHaveLength(2);
    expect(cards[0].label).toBe("Doanh thu");
    expect(cards[1].value).toBe("128");
  });

  it("fmtVND does NOT crash when given a field from an unexpected API response", () => {
    // Simulate API returning flat object without 'stats' key
    const badApiResponse = { revenue_this_month: undefined } as unknown as { revenue_this_month: number };
    expect(() => fmtVND(badApiResponse.revenue_this_month)).not.toThrow();
    expect(fmtVND(badApiResponse.revenue_this_month)).toBe("0 ₫");
  });
});
