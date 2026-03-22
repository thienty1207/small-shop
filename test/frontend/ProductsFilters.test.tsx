import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Products from "../../frontend/src/pages/client/Products";

const mockUseProducts = vi.fn();
const mockUseProductFilters = vi.fn();
const mockUseCategories = vi.fn();

vi.mock("../../frontend/src/components/layout/Header", () => ({
  default: () => <div data-testid="products-header" />,
}));

vi.mock("../../frontend/src/components/layout/Footer", () => ({
  default: () => <div data-testid="products-footer" />,
}));

vi.mock("../../frontend/src/components/shop/ProductCard", () => ({
  default: ({ product }: { product: { name: string } }) => <div>{product.name}</div>,
}));

vi.mock("../../frontend/src/hooks/useProducts", () => ({
  useProducts: (opts: unknown) => mockUseProducts(opts),
  useProductFilters: (opts: unknown) => mockUseProductFilters(opts),
  useCategories: () => mockUseCategories(),
}));

describe("Products filters", () => {
  it("wires brand, volume and gender filters into the products query", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("scrollTo", vi.fn());

    mockUseProducts.mockReturnValue({
      products: [{ id: "p-1", name: "Azzaro", slug: "azzaro" }],
      total: 1,
      totalPages: 1,
      isLoading: false,
      error: null,
    });
    mockUseProductFilters.mockReturnValue({
      brands: [{ value: "Afnan", count: 14 }],
      volumes: [{ value: "100", count: 32 }],
      genders: [{ value: "male", count: 12 }],
      isLoading: false,
      error: null,
    });
    mockUseCategories.mockReturnValue({
      categories: [],
      isLoading: false,
      error: null,
    });

    render(
      <MemoryRouter initialEntries={["/products"]}>
        <Routes>
          <Route path="/products" element={<Products />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Afnan (14)")).toBeInTheDocument();
    expect(screen.getByText("100ml (32)")).toBeInTheDocument();
    expect(screen.getByText("Nam (12)")).toBeInTheDocument();

    await user.click(screen.getByLabelText(/Afnan \(14\)/i));
    await user.click(screen.getByLabelText(/100ml \(32\)/i));
    await user.click(screen.getByLabelText(/Nam \(12\)/i));

    expect(mockUseProducts).toHaveBeenLastCalledWith({
      category: undefined,
      brands: ["Afnan"],
      volumes: [100],
      fragranceGender: ["male"],
      search: undefined,
      sort: "newest",
      page: 1,
      limit: 20,
    });

    expect(mockUseProductFilters).toHaveBeenCalledWith({
      category: undefined,
      search: undefined,
    });

    vi.unstubAllGlobals();
  });
});
