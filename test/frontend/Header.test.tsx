import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Header from "../../frontend/src/components/layout/Header";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockLogout = vi.fn();
let mockCartItems: Array<{ quantity: number }> = [];

// Default: unauthenticated
let mockAuthState = {
  user: null as null | {
    id: string;
    email: string;
    name: string;
    avatar_url: string | null;
    role: string;
    phone: string | null;
    address: string | null;
  },
  isAuthenticated: false,
  isLoading: false,
  login: vi.fn(),
  logout: mockLogout,
  updateProfile: vi.fn(),
};

vi.mock("../../frontend/src/contexts/AuthContext", () => ({
  useAuth: () => mockAuthState,
}));

vi.mock("../../frontend/src/contexts/CartContext", () => ({
  useCart: () => ({ items: mockCartItems }),
}));

vi.mock("../../frontend/src/contexts/WishlistContext", () => ({
  useWishlist: () => ({
    wishlistIds: [],
    isLoading: false,
    isWishlisted: () => false,
    toggleWishlist: vi.fn(),
    fetchWishlistProducts: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderHeader() {
  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Header", () => {
  beforeEach(() => {
    mockAuthState = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: mockLogout,
      updateProfile: vi.fn(),
    };
    mockLogout.mockClear();
    mockCartItems = [];
  });

  it("renders logo", () => {
    renderHeader();
    expect(screen.getByText("Small Shop")).toBeInTheDocument();
  });

  it("shows login icon when unauthenticated", () => {
    renderHeader();
    expect(screen.getByRole("button", { name: /đăng nhập/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /test user/i })).toBeNull();
  });

  it("shows user avatar button when authenticated", () => {
    mockAuthState = {
      ...mockAuthState,
      isAuthenticated: true,
      user: {
        id: "1",
        email: "user@test.com",
        name: "Test User",
        avatar_url: null,
        role: "customer",
        phone: null,
        address: null,
      },
    };

    renderHeader();

    // Dropdown trigger shows user initial letter
    expect(screen.getByText("T")).toBeInTheDocument(); // T from "Test User"
  });

  it("opens dropdown on avatar click and shows user email", async () => {
    mockAuthState = {
      ...mockAuthState,
      isAuthenticated: true,
      user: {
        id: "1",
        email: "user@test.com",
        name: "Test User",
        avatar_url: null,
        role: "customer",
        phone: null,
        address: null,
      },
    };

    renderHeader();

    // Click the profile trigger
    const trigger = screen.getByLabelText(/hồ sơ cá nhân/i);
    await userEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByText("user@test.com")).toBeInTheDocument();
    });
  });

  it("calls logout when Đăng xuất is clicked", async () => {
    mockAuthState = {
      ...mockAuthState,
      isAuthenticated: true,
      user: {
        id: "1",
        email: "user@test.com",
        name: "Test User",
        avatar_url: null,
        role: "customer",
        phone: null,
        address: null,
      },
    };

    renderHeader();

    // Open profile dropdown
    const trigger = screen.getByLabelText(/hồ sơ cá nhân/i);
    await userEvent.click(trigger);

    await waitFor(() =>
      expect(screen.getByText("Đăng xuất")).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByText("Đăng xuất"));
    expect(mockLogout).toHaveBeenCalledOnce();
  });

  it("shows cart icon with item count badge", async () => {
    mockAuthState = {
      ...mockAuthState,
      isAuthenticated: true,
      user: {
        id: "1",
        email: "user@test.com",
        name: "Test User",
        avatar_url: null,
        role: "customer",
        phone: null,
        address: null,
      },
    };
    mockCartItems = [{ quantity: 3 }, { quantity: 2 }];

    renderHeader();

    const menuBtn = screen.getByRole("button", { name: /mở menu/i });
    await userEvent.click(menuBtn);

    expect(screen.getByRole("link", { name: /giỏ hàng/i })).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });
});
