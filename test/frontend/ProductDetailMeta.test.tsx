import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProductDetail from "../../frontend/src/pages/client/ProductDetail";

const mockAddItem = vi.fn();
const mockToggleWishlist = vi.fn();

vi.mock("../../frontend/src/components/layout/Header", () => ({
  default: () => <div data-testid="mock-header" />,
}));

vi.mock("../../frontend/src/components/layout/Footer", () => ({
  default: () => <div data-testid="mock-footer" />,
}));

vi.mock("../../frontend/src/components/shop/ProductCard", () => ({
  default: () => <div data-testid="mock-product-card" />,
}));

vi.mock("../../frontend/src/components/shop/QuantityStepper", () => ({
  default: () => <div data-testid="mock-stepper" />,
}));

vi.mock("../../frontend/src/hooks/useProducts", () => ({
  useProduct: () => ({
    product: {
      id: "product-1",
      slug: "azzaro-most-wanted",
      name: "Azzaro The Most Wanted EDP Intense",
      price: 310000,
      originalPrice: 350000,
      image: "https://example.com/product.jpg",
      images: [],
      category: "cat-1",
      description: "Mo ta san pham",
      topNote: "Cam bergamot",
      midNote: "Que",
      baseNote: "Go ho phach",
      care: "Bao quan noi kho rao",
      rating: 5,
      reviewCount: 12,
      inStock: true,
      stock: 8,
      brand: "Azzaro",
      concentration: "Eau de Parfum Intense",
      fragranceGender: "male",
      fragranceLine: "niche",
      variants: [],
    },
    isLoading: false,
    error: null,
  }),
  useRelatedProducts: () => ({ products: [], isLoading: false }),
  useProducts: () => ({ products: [], total: 0, totalPages: 0, isLoading: false, error: null }),
}));

vi.mock("../../frontend/src/contexts/CartContext", () => ({
  useCart: () => ({
    addItem: mockAddItem,
    items: [],
  }),
}));

vi.mock("../../frontend/src/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
  }),
}));

vi.mock("../../frontend/src/contexts/WishlistContext", () => ({
  useWishlist: () => ({
    isWishlisted: () => false,
    toggleWishlist: mockToggleWishlist,
  }),
}));

describe("ProductDetail fragrance metadata", () => {
  beforeEach(() => {
    mockAddItem.mockResolvedValue({ ok: true });
    mockToggleWishlist.mockResolvedValue(false);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ items: [] }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows compact fragrance tags on the product detail page", async () => {
    render(
      <MemoryRouter initialEntries={["/product/azzaro-most-wanted"]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Niche")).toBeInTheDocument();
    expect(screen.getByText("Nam")).toBeInTheDocument();
  });
});
