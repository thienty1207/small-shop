import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminCustomers from "@/pages/admin/Customers";

vi.mock("@/components/admin/AdminLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/lib/admin-api", () => ({
  adminGet: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminCustomers", () => {
  it("renders customers from API", async () => {
    const { adminGet } = await import("@/lib/admin-api");
    vi.mocked(adminGet).mockResolvedValueOnce({
      items: [
        {
          id: "1",
          google_id: "google-1",
          email: "alice@example.com",
          name: "Alice",
          avatar_url: null,
          phone: "0901234567",
          address: "123 Đường A",
          last_login_at: "2026-03-01T10:00:00Z",
          created_at: "2026-02-01T10:00:00Z",
          orders_count: 3,
          total_spent: 750000,
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      total_pages: 1,
    });

    render(<AdminCustomers />);

    expect(await screen.findByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("opens the detail modal when clicking Xem chi tiết", async () => {
    const { adminGet } = await import("@/lib/admin-api");
    vi.mocked(adminGet).mockResolvedValueOnce({
      items: [
        {
          id: "1",
          google_id: "google-1",
          email: "alice@example.com",
          name: "Alice",
          avatar_url: null,
          phone: "0901234567",
          address: "123 Đường A",
          last_login_at: "2026-03-01T10:00:00Z",
          created_at: "2026-02-01T10:00:00Z",
          orders_count: 3,
          total_spent: 750000,
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      total_pages: 1,
    });

    render(<AdminCustomers />);

    await screen.findByText("Alice");
    fireEvent.click(screen.getByRole("button", { name: /xem chi tiết/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Thông tin khách hàng")).toBeInTheDocument();
    expect(screen.getByText("123 Đường A")).toBeInTheDocument();
  });

  it("sends search term to the API", async () => {
    const { adminGet } = await import("@/lib/admin-api");
    vi.mocked(adminGet).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      total_pages: 1,
    });

    render(<AdminCustomers />);

    const input = await screen.findByPlaceholderText(/tìm theo tên, email, số điện thoại/i);
    fireEvent.change(input, { target: { value: "alice" } });

    await waitFor(() => {
      expect(vi.mocked(adminGet)).toHaveBeenCalledWith(
        expect.stringContaining("search=alice"),
      );
    });
  });
});