import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import React from "react";
import Index from "@/pages/client/Index";

const mockUseCategories = vi.fn();
let mockSettings: Record<string, string> = {};

vi.mock("@/hooks/useProducts", () => ({
  useCategories: () => mockUseCategories(),
}));

vi.mock("@/contexts/ShopSettingsContext", () => ({
  useShopSettingsCtx: () => ({ settings: mockSettings, isLoading: false }),
}));

vi.mock("@/components/layout/Header", () => ({
  default: () => React.createElement("header", { "data-testid": "homepage-header" }),
}));

vi.mock("@/components/layout/Footer", () => ({
  default: () => React.createElement("footer", { "data-testid": "homepage-footer" }),
}));

vi.mock("@/components/shop/ProductCard", () => ({
  default: ({ product }: { product: { name: string } }) =>
    React.createElement("article", { "data-testid": "product-card" }, product.name),
}));

function renderHomepage() {
  return render(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(Index, null),
    ),
  );
}

describe("Homepage UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettings = {
      brand_section_title: "Thương hiệu nổi bật",
      brand_slide_1_img: "https://example.com/brand-slide.jpg",
    };

    mockUseCategories.mockReturnValue({
      categories: [
        { id: "c-1", name: "Azzaro", slug: "azzaro", image: "" },
        { id: "c-2", name: "Dior", slug: "dior", image: "" },
        { id: "c-3", name: "Gucci", slug: "gucci", image: "" },
        { id: "c-4", name: "LV", slug: "lv", image: "" },
        { id: "c-5", name: "Prada", slug: "prada", image: "" },
      ],
      isLoading: false,
      error: null,
    });
  });

  it("renders key hero + brand sections and keeps old deal/testimonial blocks removed", () => {
    renderHomepage();

    expect(screen.getByTestId("homepage-header")).toBeInTheDocument();
    expect(screen.getByTestId("homepage-footer")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: /spring summer 2026 collection/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /thương hiệu nổi bật/i })).toBeInTheDocument();
    expect(screen.getByText(/ưu đãi đặc biệt/i)).toBeInTheDocument();

    expect(screen.queryByRole("heading", { name: /deal hời/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /phản hồi thực tế/i })).not.toBeInTheDocument();
  });

  it("still maps brand cards from categories", () => {
    const { container } = renderHomepage();

    expect(container.querySelector('a[href="/products?category=azzaro"]')).toBeInTheDocument();
    expect(container.querySelector('a[href="/products?category=prada"]')).toBeInTheDocument();
  });
});
