import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "../../frontend/src/contexts/AuthContext";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TOKEN = "test-jwt-token";

const mockUser = {
  id: "uuid-123",
  email: "test@example.com",
  name: "Test User",
  avatar_url: null,
  role: "customer",
  phone: null,
  address: null,
};

function TestConsumer() {
  const { user, isAuthenticated, isLoading, login, logout, updateProfile } =
    useAuth();
  return (
    <div>
      <span data-testid="loading">{isLoading ? "loading" : "ready"}</span>
      <span data-testid="auth">{isAuthenticated ? "yes" : "no"}</span>
      <span data-testid="name">{user?.name ?? "none"}</span>
      <span data-testid="phone">{user?.phone ?? "none"}</span>
      <span data-testid="address">{user?.address ?? "none"}</span>
      <button onClick={() => login(TOKEN)}>login</button>
      <button onClick={logout}>logout</button>
      <button
        onClick={() =>
          updateProfile({ phone: "0901234567", address: "123 Nguyen Hue" })
        }
      >
        update
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AuthContext", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("starts in loading state, resolves to unauthenticated with no token", async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    // After async resolution
    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("ready"),
    );
    expect(screen.getByTestId("auth")).toHaveTextContent("no");
  });

  it("login() fetches /api/me and sets user", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    } as Response);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("ready"),
    );

    await act(async () => {
      await userEvent.click(screen.getByText("login"));
    });

    expect(localStorage.getItem("auth_token")).toBe(TOKEN);
    expect(screen.getByTestId("auth")).toHaveTextContent("yes");
    expect(screen.getByTestId("name")).toHaveTextContent("Test User");
  });

  it("logout() clears user and token", async () => {
    // Pre-set token so AuthProvider hydrates on mount
    localStorage.setItem("auth_token", TOKEN);
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    } as Response);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("auth")).toHaveTextContent("yes"),
    );

    await act(async () => {
      await userEvent.click(screen.getByText("logout"));
    });

    expect(localStorage.getItem("auth_token")).toBeNull();
    expect(screen.getByTestId("auth")).toHaveTextContent("no");
  });

  it("updateProfile() sends PUT /api/me and updates user state", async () => {
    localStorage.setItem("auth_token", TOKEN);
    const updatedUser = {
      ...mockUser,
      phone: "0901234567",
      address: "123 Nguyen Hue",
    };

    global.fetch = vi
      .fn()
      // First call: mount hydration (GET /api/me)
      .mockResolvedValueOnce({ ok: true, json: async () => mockUser } as Response)
      // Second call: PUT /api/me
      .mockResolvedValueOnce({ ok: true, json: async () => updatedUser } as Response);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("auth")).toHaveTextContent("yes"),
    );

    await act(async () => {
      await userEvent.click(screen.getByText("update"));
    });

    expect(screen.getByTestId("phone")).toHaveTextContent("0901234567");
    expect(screen.getByTestId("address")).toHaveTextContent("123 Nguyen Hue");

    // Verify PUT was called with correct args
    const [url, opts] = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls[1];
    expect(url).toContain("/api/me");
    expect((opts as RequestInit).method).toBe("PUT");
    const body = JSON.parse((opts as RequestInit).body as string);
    expect(body.phone).toBe("0901234567");
  });

  it("updateProfile() throws when no token stored", async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("ready"),
    );

    // No token → should throw "Chưa đăng nhập"
    const { updateProfile } = (() => {
      let ctx: ReturnType<typeof useAuth>;
      function Capture() {
        ctx = useAuth();
        return null;
      }
      render(
        <AuthProvider>
          <Capture />
        </AuthProvider>,
      );
      return { updateProfile: () => ctx.updateProfile({ phone: "0900000000" }) };
    })();

    await expect(updateProfile()).rejects.toThrow();
  });
});
