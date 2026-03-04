import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Cart from "@/pages/Cart";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/contexts/CartContext", () => ({
  useCart: vi.fn(),
}));

vi.mock("@/components/layout/Header", () => ({ default: () => <div data-testid="header" /> }));
vi.mock("@/components/layout/Footer", () => ({ default: () => <div data-testid="footer" /> }));

import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";

const mockProduct = {
  id: "product-1",
  name: "Nến Thơm Lavender",
  slug: "nen-thom-lavender",
  price: 185000,
  image: "/candle.jpg",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function renderCart() {
  return render(
    <MemoryRouter>
      <Cart />
    </MemoryRouter>
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Cart page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCart).mockReturnValue({
      items: [],
      addItem: vi.fn(),
      removeItem: vi.fn(),
      updateQuantity: vi.fn(),
      clearCart: vi.fn(),
      totalAmount: 0,
    });
  });

  it("renders empty cart message when no items", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
    } as any);

    renderCart();

    expect(screen.getByText(/giỏ hàng trống/i)).toBeInTheDocument();
  });

  it("shows 'Đăng nhập để thanh toán' button when user is NOT authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
    } as any);

    vi.mocked(useCart).mockReturnValue({
      items: [{ product: mockProduct as any, quantity: 1 }],
      addItem: vi.fn(),
      removeItem: vi.fn(),
      updateQuantity: vi.fn(),
      clearCart: vi.fn(),
      totalAmount: 185000,
    });

    renderCart();

    expect(screen.getByText(/đăng nhập để thanh toán/i)).toBeInTheDocument();
  });

  it("shows 'Thanh toán' button when user IS authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "u1", name: "Lan", email: "lan@test.com" },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
    } as any);

    vi.mocked(useCart).mockReturnValue({
      items: [{ product: mockProduct as any, quantity: 1 }],
      addItem: vi.fn(),
      removeItem: vi.fn(),
      updateQuantity: vi.fn(),
      clearCart: vi.fn(),
      totalAmount: 185000,
    });

    renderCart();

    expect(screen.getByText(/^thanh toán$/i)).toBeInTheDocument();
  });

  it("navigates to /login with returnTo state when unauthenticated user clicks checkout", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
    } as any);

    vi.mocked(useCart).mockReturnValue({
      items: [{ product: mockProduct as any, quantity: 1 }],
      addItem: vi.fn(),
      removeItem: vi.fn(),
      updateQuantity: vi.fn(),
      clearCart: vi.fn(),
      totalAmount: 185000,
    });

    renderCart();

    fireEvent.click(screen.getByText(/đăng nhập để thanh toán/i));

    expect(mockNavigate).toHaveBeenCalledWith("/login", {
      state: { returnTo: "/checkout" },
    });
  });

  it("navigates to /checkout when authenticated user clicks checkout", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "u1", name: "Lan", email: "lan@test.com" },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
    } as any);

    vi.mocked(useCart).mockReturnValue({
      items: [{ product: mockProduct as any, quantity: 1 }],
      addItem: vi.fn(),
      removeItem: vi.fn(),
      updateQuantity: vi.fn(),
      clearCart: vi.fn(),
      totalAmount: 185000,
    });

    renderCart();

    fireEvent.click(screen.getByText(/^thanh toán$/i));

    expect(mockNavigate).toHaveBeenCalledWith("/checkout");
  });

  it("displays cart items with correct product name and price", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
    } as any);

    vi.mocked(useCart).mockReturnValue({
      items: [{ product: mockProduct as any, quantity: 2 }],
      addItem: vi.fn(),
      removeItem: vi.fn(),
      updateQuantity: vi.fn(),
      clearCart: vi.fn(),
      totalAmount: 370000,
    });

    renderCart();

    expect(screen.getByText("Nến Thơm Lavender")).toBeInTheDocument();
  });
});
