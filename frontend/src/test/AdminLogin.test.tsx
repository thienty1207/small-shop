/**
 * AdminLogin.test.tsx
 *
 * Unit tests for the admin login page component.
 * Uses Vitest + @testing-library/react running inside jsdom.
 *
 * Run with:
 *   bun run test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import AdminLogin from "@/pages/admin/Login";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wrap component in the required providers. */
function renderAdminLogin(initialEntries = ["/admin/login"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AdminAuthProvider>
        <AdminLogin />
      </AdminAuthProvider>
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// fetch mock setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AdminLogin page", () => {
  it("renders the login form elements", () => {
    renderAdminLogin();

    expect(screen.getByRole("heading", { name: /admin portal/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/tên đăng nhập/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/mật khẩu/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /đăng nhập/i })).toBeInTheDocument();
  });

  it("does not show an error banner on initial render", () => {
    renderAdminLogin();
    // Error banner is only rendered when there is an error message
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("toggles password visibility when the eye icon is clicked", () => {
    renderAdminLogin();
    const passwordInput = screen.getByPlaceholderText(/mật khẩu/i);
    expect(passwordInput).toHaveAttribute("type", "password");

    // Find the toggle button (aria-label or the button next to the password field)
    const toggleButton = passwordInput.parentElement!.querySelector("button")!;
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "text");

    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("shows an error message when the server returns 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok:   false,
        json: async () => ({ error: "Tên đăng nhập hoặc mật khẩu không đúng" }),
      }),
    );

    renderAdminLogin();

    fireEvent.change(screen.getByPlaceholderText(/tên đăng nhập/i), {
      target: { value: "hothienty" },
    });
    fireEvent.change(screen.getByPlaceholderText(/mật khẩu/i), {
      target: { value: "wrongpassword" },
    });
    fireEvent.click(screen.getByRole("button", { name: /đăng nhập/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      /tên đăng nhập hoặc mật khẩu không đúng/i,
    );
  });

  it("stores token in localStorage and clears error on success", async () => {
    // Mock the login endpoint
    vi.stubGlobal(
      "fetch",
      vi.fn()
        // First call: POST /api/admin/auth/login → success
        .mockResolvedValueOnce({
          ok:   true,
          json: async () => ({
            token: "fake.jwt.token",
            user:  { id: "uuid-1234", username: "hothienty" },
          }),
        })
        // Second call: GET /api/admin/me (session restore inside AdminAuthProvider won't
        // fire here because localStorage is empty at mount, but guard it anyway)
        .mockResolvedValueOnce({
          ok:   true,
          json: async () => ({ id: "uuid-1234", username: "hothienty" }),
        }),
    );

    renderAdminLogin();

    fireEvent.change(screen.getByPlaceholderText(/tên đăng nhập/i), {
      target: { value: "hothienty" },
    });
    fireEvent.change(screen.getByPlaceholderText(/mật khẩu/i), {
      target: { value: "tohkaty01" },
    });
    fireEvent.click(screen.getByRole("button", { name: /đăng nhập/i }));

    await waitFor(() => {
      expect(localStorage.getItem("admin_auth_token")).toBe("fake.jwt.token");
    });

    // No error banner should be visible after successful login
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("disables the submit button while the request is in flight", async () => {
    // Never-resolving promise simulates a slow network
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(new Promise(() => {})),
    );

    renderAdminLogin();

    fireEvent.change(screen.getByPlaceholderText(/tên đăng nhập/i), {
      target: { value: "hothienty" },
    });
    fireEvent.change(screen.getByPlaceholderText(/mật khẩu/i), {
      target: { value: "tohkaty01" },
    });

    const submitBtn = screen.getByRole("button", { name: /đăng nhập/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(submitBtn).toBeDisabled();
    });
  });
});
