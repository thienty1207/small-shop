import { beforeEach, describe, expect, it, vi } from "vitest";
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

const featuredProducts = Array.from({ length: 8 }, (_, index) => ({
  id: `f-${index + 1}`,
  name: `Featured ${index + 1}`,
  slug: `featured-${index + 1}`,
}));

const newProducts = Array.from({ length: 8 }, (_, index) => ({
  id: `n-${index + 1}`,
  name: `New ${index + 1}`,
  slug: `new-${index + 1}`,
}));

const maleProducts = [
  { id: "m-1", name: "Mens Pick", slug: "mens-pick", fragranceGender: "male", homepageSection: "male" },
];

const femaleProducts = [
  { id: "w-1", name: "Womens Pick", slug: "womens-pick", fragranceGender: "female", homepageSection: "female" },
];

const unisexProducts = [
  { id: "u-1", name: "Unisex Pick", slug: "unisex-pick", fragranceGender: "unisex", homepageSection: "unisex" },
];

function renderHomepage() {
  return render(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(Index, null),
    ),
  );
}

function expectBefore(first: HTMLElement, second: HTMLElement) {
  expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
}

describe("Homepage UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettings = {
      brand_section_title: "Thương hiệu nổi bật",
      brand_slide_1_img: "https://example.com/brand-slide.jpg",
    };

    mockUseProducts.mockImplementation(
      (opts?: { badge?: string; homepageSection?: string }) => {
        if (opts?.badge === "featured") {
          return { products: featuredProducts, total: 8, totalPages: 1, isLoading: false, error: null };
        }

        if (opts?.badge === "new") {
          return { products: newProducts, total: 8, totalPages: 1, isLoading: false, error: null };
        }

        if (opts?.homepageSection === "male") {
          return { products: maleProducts, total: 1, totalPages: 1, isLoading: false, error: null };
        }

        if (opts?.homepageSection === "female") {
          return { products: femaleProducts, total: 1, totalPages: 1, isLoading: false, error: null };
        }

        if (opts?.homepageSection === "unisex") {
          return { products: unisexProducts, total: 1, totalPages: 1, isLoading: false, error: null };
        }

        return { products: [], total: 0, totalPages: 1, isLoading: false, error: null };
      },
    );

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

  it("renders the homepage in the requested order and keeps deal/testimonials removed", () => {
    renderHomepage();

    expect(screen.getByTestId("homepage-header")).toBeInTheDocument();
    expect(screen.getByTestId("homepage-footer")).toBeInTheDocument();

    const featuredHeading = screen.getByRole("heading", { name: /sản phẩm nổi bật/i });
    const brandHeading = screen.getByRole("heading", { name: /thương hiệu nổi bật/i });
    const newHeading = screen.getByRole("heading", { name: /dòng sản phẩm mới/i });
    const maleHeading = screen.getByRole("heading", { name: /nước hoa nam/i });
    const femaleHeading = screen.getByRole("heading", { name: /nước hoa nữ/i });
    const unisexHeading = screen.getByRole("heading", { name: /unisex/i });

    expectBefore(featuredHeading, brandHeading);
    expectBefore(brandHeading, newHeading);
    expectBefore(newHeading, maleHeading);
    expectBefore(maleHeading, femaleHeading);
    expectBefore(femaleHeading, unisexHeading);

    expect(screen.getByText("Featured 1")).toBeInTheDocument();
    expect(screen.getByText("New 1")).toBeInTheDocument();
    expect(screen.getByText("Mens Pick")).toBeInTheDocument();
    expect(screen.getByText("Womens Pick")).toBeInTheDocument();
    expect(screen.getByText("Unisex Pick")).toBeInTheDocument();

    expect(screen.queryByRole("heading", { name: /deal hời/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /phản hồi thực tế/i })).not.toBeInTheDocument();
  });

  it("requests homepage gender sections from the dedicated homepage field", () => {
    renderHomepage();

    expect(mockUseProducts).toHaveBeenCalledWith({ badge: "featured", limit: 1000 });
    expect(mockUseProducts).toHaveBeenCalledWith({ badge: "new", limit: 1000 });
    expect(mockUseProducts).toHaveBeenCalledWith({ homepageSection: "male", limit: 1000 });
    expect(mockUseProducts).toHaveBeenCalledWith({ homepageSection: "female", limit: 1000 });
    expect(mockUseProducts).toHaveBeenCalledWith({ homepageSection: "unisex", limit: 1000 });

    expect(screen.queryByLabelText(/slide sau/i)).not.toBeInTheDocument();
  });

  it("does not render products in the female section when homepage section is missing or mismatched", () => {
    mockUseProducts.mockImplementation(
      (opts?: { badge?: string; homepageSection?: string }) => {
        if (opts?.badge === "featured") {
          return { products: featuredProducts, total: 8, totalPages: 1, isLoading: false, error: null };
        }

        if (opts?.badge === "new") {
          return { products: newProducts, total: 8, totalPages: 1, isLoading: false, error: null };
        }

        if (opts?.homepageSection === "male") {
          return { products: maleProducts, total: 1, totalPages: 1, isLoading: false, error: null };
        }

        if (opts?.homepageSection === "female") {
          return {
            products: [
              { id: "bad-1", name: "Wrong Product", slug: "wrong", fragranceGender: "male", homepageSection: "male" },
            ],
            total: 1,
            totalPages: 1,
            isLoading: false,
            error: null,
          };
        }

        if (opts?.homepageSection === "unisex") {
          return { products: [], total: 0, totalPages: 1, isLoading: false, error: null };
        }

        return { products: [], total: 0, totalPages: 1, isLoading: false, error: null };
      },
    );

    renderHomepage();

    expect(screen.queryByRole("heading", { name: /nước hoa nữ/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Wrong Product")).not.toBeInTheDocument();
  });

  it("still maps brand cards from categories", () => {
    const { container } = renderHomepage();

    expect(container.querySelector('a[href="/products?category=azzaro"]')).toBeInTheDocument();
    expect(container.querySelector('a[href="/products?category=prada"]')).toBeInTheDocument();
  });
});
