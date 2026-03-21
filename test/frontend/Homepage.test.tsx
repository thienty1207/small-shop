import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import React from "react";
import Index from "@/pages/client/Index";

const mockUseProducts = vi.fn();
const mockUseCategories = vi.fn();
let mockSettings: Record<string, string> = {};

vi.mock("@/hooks/useProducts", () => ({
  useProducts: (opts: unknown) => mockUseProducts(opts),
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

const featuredProducts = [
  { id: "f-1", name: "Nến biển", slug: "nen-bien" },
  { id: "f-2", name: "Thiệp hoa", slug: "thiep-hoa" },
];

const dealProducts = [
  { id: "d-1", name: "Túi ưu đãi", slug: "tui-uu-dai" },
];

const newProducts = [
  { id: "n-1", name: "Vòng mới", slug: "vong-moi" },
];

function renderHomepage() {
  return render(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(Index, null)
    )
  );
}

describe("Homepage UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettings = {
      brand_section_title: "Thương hiệu nổi bật",
      brand_slide_1_img: "https://example.com/brand-slide.jpg",
    };

    mockUseProducts.mockImplementation((opts?: { badge?: string }) => {
      if (opts?.badge === "Nổi Bật") {
        return { products: featuredProducts, total: 2, totalPages: 1, isLoading: false, error: null };
      }

      if (opts?.badge === "Giảm Giá") {
        return { products: dealProducts, total: 1, totalPages: 1, isLoading: false, error: null };
      }

      if (opts?.badge === "Mới") {
        return { products: newProducts, total: 1, totalPages: 1, isLoading: false, error: null };
      }

      return { products: [], total: 0, totalPages: 1, isLoading: false, error: null };
    });

    mockUseCategories.mockReturnValue({
      categories: [
        { id: "c-1", name: "Nến", slug: "nen", image: "" },
        { id: "c-2", name: "Thiệp", slug: "thiep", image: "" },
        { id: "c-3", name: "Túi", slug: "tui", image: "" },
        { id: "c-4", name: "Trang sức", slug: "trang-suc", image: "" },
        { id: "c-5", name: "Quà tặng", slug: "qua-tang", image: "" },
      ],
      isLoading: false,
      error: null,
    });
  });

  it("renders homepage sections and keeps main flow intact", () => {
    renderHomepage();

    expect(screen.getByTestId("homepage-header")).toBeInTheDocument();
    expect(screen.getByTestId("homepage-footer")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: /quà tặng/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /thương hiệu nổi bật/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /sản phẩm nổi bật/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /deal hời/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /dòng sản phẩm mới/i })).toBeInTheDocument();

    expect(screen.getByText("Nến biển")).toBeInTheDocument();
    expect(screen.getByText("Túi ưu đãi")).toBeInTheDocument();
    expect(screen.getByText("Vòng mới")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /khám phá ngay/i })).toHaveAttribute("href", "/products");
  });

  it("requests products by the same badge-driven API filters", () => {
    renderHomepage();

    expect(mockUseProducts).toHaveBeenCalledWith({ badge: "Nổi Bật", limit: 4 });
    expect(mockUseProducts).toHaveBeenCalledWith({ badge: "Giảm Giá", limit: 4 });
    expect(mockUseProducts).toHaveBeenCalledWith({ badge: "Mới", limit: 4 });
  });

  it("maps brand cards from categories and links by category slug", () => {
    const { container } = renderHomepage();

    const firstCategoryLink = container.querySelector('a[href="/products?category=nen"]');
    expect(firstCategoryLink).toBeInTheDocument();
    const giftLink = container.querySelector('a[href="/products?category=qua-tang"]');
    expect(giftLink).toBeInTheDocument();
    expect(document.querySelector('a[href*="search="]')).toBeNull();

    const categoryLinks = Array.from(document.querySelectorAll('a[href^="/products?category="]'));
    expect(categoryLinks).toHaveLength(5);
  });
});
