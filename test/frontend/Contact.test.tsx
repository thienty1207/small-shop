import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { WishlistProvider } from "@/contexts/WishlistContext";

// ── Mock sonner toast ──────────────────────────────────────────────────────
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ── Mock fetch ─────────────────────────────────────────────────────────────
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ── Helpers ─────────────────────────────────────────────────────────────────
import Contact from "@/pages/client/Contact";

function renderContact() {
  // Default mock: AuthProvider will call /api/me on mount — return 401 (not logged in)
  mockFetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });

  return render(
    <MemoryRouter>
      <AuthProvider>
        <WishlistProvider>
          <CartProvider>
            <Contact />
          </CartProvider>
        </WishlistProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────
describe("Contact page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default fetch: AuthProvider /api/me → 401 (not logged in)
    mockFetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });

    // Simulate Cloudflare Turnstile already loaded — skip script injection
    (window as unknown as Record<string, unknown>).turnstile = {
      render: vi.fn().mockReturnValue("widget-id-123"),
      reset: vi.fn(),
    };

    // Suppress React act() warnings in tests — these are implementation artifacts
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders without crashing", async () => {
    await act(async () => {
      renderContact();
    });
    // Use heading role to distinguish from NavLink "Liên Hệ"
    expect(screen.getByRole("heading", { name: "Liên Hệ" })).toBeInTheDocument();
  });

  it("shows all form fields including phone", () => {
    renderContact();
    expect(screen.getByPlaceholderText("Họ và tên *")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email *")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Số điện thoại (tuỳ chọn)")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Tin nhắn *")).toBeInTheDocument();
  });

  it("shows contact info (address, email, phone)", () => {
    renderContact();
    expect(screen.getAllByText("hello@handmadehaven.vn").length).toBeGreaterThan(0);
    expect(screen.getAllByText("0901 234 567").length).toBeGreaterThan(0);
    expect(screen.getAllByText("123 Nguyễn Huệ, Quận 1, TP.HCM").length).toBeGreaterThan(0);
  });

  it("submit button is disabled without Cloudflare token", () => {
    renderContact();
    const submitBtn = screen.getByRole("button", { name: /gửi tin nhắn/i });
    expect(submitBtn).toBeDisabled();
  });

  it("shows success state after successful submission", async () => {
    // Simulate CF token being set via turnstile callback
    const user = userEvent.setup();
    renderContact();

    // Simulate turnstile setting a token
    const turnstile = (window as unknown as { turnstile: { render: (el: HTMLElement, opts: { callback: (token: string) => void }) => string } }).turnstile;
    const renderCall = (turnstile.render as ReturnType<typeof vi.fn>).mock.calls[0];
    if (renderCall) {
      const opts = renderCall[1] as { callback: (token: string) => void };
      opts.callback("fake-cf-token");
    }

    await user.type(screen.getByPlaceholderText("Họ và tên *"), "Nguyen Van A");
    await user.type(screen.getByPlaceholderText("Email *"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Tin nhắn *"), "This is a test message that is long enough.");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "sent" }),
    });

    await user.click(screen.getByRole("button", { name: /gửi tin nhắn/i }));

    await waitFor(() => {
      expect(screen.getByText(/Tin nhắn đã được gửi!/i)).toBeInTheDocument();
    });
  });

  it("shows error toast on API failure", async () => {
    const { toast } = await import("sonner");
    const user = userEvent.setup();
    renderContact();

    // Set CF token
    const turnstile = (window as unknown as { turnstile: { render: (el: HTMLElement, opts: { callback: (token: string) => void }) => string } }).turnstile;
    const renderCall = (turnstile.render as ReturnType<typeof vi.fn>).mock.calls[0];
    if (renderCall) {
      const opts = renderCall[1] as { callback: (token: string) => void };
      opts.callback("fake-cf-token");
    }

    await user.type(screen.getByPlaceholderText("Họ và tên *"), "Nguyen Van A");
    await user.type(screen.getByPlaceholderText("Email *"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Tin nhắn *"), "This is a test message that is long enough.");

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Internal server error" }),
    });

    await user.click(screen.getByRole("button", { name: /gửi tin nhắn/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Internal server error");
    });
  });

  it("shows error toast when CF token is missing and submit is attempted via keyboard", async () => {
    const { toast } = await import("sonner");
    renderContact();

    // Force submit without token by dispatching form submit event directly
    const form = document.querySelector("form");
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(() => {
      // Either validation or CF token error
      expect(toast.error).toHaveBeenCalled();
    });
  });
});
