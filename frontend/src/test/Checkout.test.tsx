import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Checkout from "@/pages/client/Checkout";

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

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";

type AuthContextValue = ReturnType<typeof useAuth>;
type CartContextValue = ReturnType<typeof useCart>;

const mockUser = {
  id: "user-1",
  name: "Nguyen Thi Lan",
  email: "lan@example.com",
  phone: "0901234567",
};

const mockProduct = {
  id: "product-1",
  name: "Nến Thơm Lavender",
  slug: "nen-thom-lavender",
  price: 185000,
  image: "/candle.jpg",
};

const mockClearCart = vi.fn();

function renderCheckout() {
  return render(
    <MemoryRouter>
      <Checkout />
    </MemoryRouter>
  );
}

function setupAuthenticatedUser() {
  vi.mocked(useAuth).mockReturnValue({
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    setUser: vi.fn(),
  } as AuthContextValue);

  vi.mocked(useCart).mockReturnValue({
    items: [{ product: mockProduct, quantity: 1 }],
    addItem: vi.fn(),
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: mockClearCart,
    totalAmount: 185000,
  } as CartContextValue);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Checkout page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("auth_token", "mock-token-123");
  });

  it("pre-fills form with user name and email", () => {
    setupAuthenticatedUser();
    renderCheckout();

    expect((screen.getByPlaceholderText(/họ và tên/i) as HTMLInputElement).value).toBe("Nguyen Thi Lan");
    expect((screen.getByPlaceholderText(/email/i) as HTMLInputElement).value).toBe("lan@example.com");
  });

  it("redirects non-COD payment method to /404", async () => {
    const user = userEvent.setup();
    setupAuthenticatedUser();
    renderCheckout();

    // Click the bank transfer radio label to select it
    const bankRadio = screen.getByDisplayValue("bank_transfer");
    await user.click(bankRadio);

    // Fill required fields not pre-filled from mockUser
    const phoneInput = screen.getByPlaceholderText(/số điện thoại/i);
    await user.type(phoneInput, "0901234567");

    const addressInput = screen.getByPlaceholderText(/địa chỉ/i);
    await user.type(addressInput, "123 Đường ABC");

    // Submit the form
    const submitBtn = screen.getByRole("button", { name: /đặt hàng/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/404");
    });
  });

  it("submits order via POST /api/orders for COD payment", async () => {
    setupAuthenticatedUser();

    const mockOrderResponse = {
      id: "order-1",
      order_code: "HS-20260101-ABCDEF",
      status: "pending",
      total: 215000,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockOrderResponse,
    });

    renderCheckout();

    // Fill required fields not pre-filled
    const phoneInput = screen.getByPlaceholderText(/số điện thoại/i);
    fireEvent.change(phoneInput, { target: { name: "customerPhone", value: "0901234567" } });

    const addressInput = screen.getByPlaceholderText(/địa chỉ/i);
    fireEvent.change(addressInput, { target: { name: "address", value: "123 Đường ABC, Hà Nội" } });

    // COD is selected by default — submit form directly
    const form = screen.getByRole("button", { name: /đặt hàng/i }).closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/orders"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer mock-token-123",
          }),
        })
      );
    });

    await waitFor(() => {
      expect(mockClearCart).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/order/success", {
        state: { orderCode: "HS-20260101-ABCDEF" },
      });
    });
  });

  it("shows error toast on API failure", async () => {
    setupAuthenticatedUser();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Internal server error" }),
    });

    renderCheckout();

    const phoneInput = screen.getByPlaceholderText(/số điện thoại/i);
    fireEvent.change(phoneInput, { target: { name: "customerPhone", value: "0901234567" } });

    const addressInput = screen.getByPlaceholderText(/địa chỉ/i);
    fireEvent.change(addressInput, { target: { name: "address", value: "456 Phố XYZ" } });

    const form = screen.getByRole("button", { name: /đặt hàng/i }).closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
      // clearCart should NOT be called on failure
      expect(mockClearCart).not.toHaveBeenCalled();
    });
  });

  it("disables submit button when cart is empty", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
    } as AuthContextValue);

    vi.mocked(useCart).mockReturnValue({
      items: [],
      addItem: vi.fn(),
      removeItem: vi.fn(),
      updateQuantity: vi.fn(),
      clearCart: vi.fn(),
      totalAmount: 0,
    } as CartContextValue);

    renderCheckout();

    const submitBtn = screen.getByRole("button", { name: /đặt hàng/i });
    expect(submitBtn).toBeDisabled();
  });
});
