import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminInventory from "@/pages/admin/Inventory";

vi.mock("@/components/admin/AdminLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/lib/admin-api", () => ({
  adminGet: vi.fn(),
  adminPatch: vi.fn(),
}));

const INVENTORY_FIXTURE = [
  {
    variant_id: "v1",
    product_id: "p1",
    product_name: "Bleu de Chanel",
    brand: "Chanel",
    ml: 100,
    price: 2000000,
    original_price: null,
    stock: 8,
  },
  {
    variant_id: "v2",
    product_id: "p1",
    product_name: "Bleu de Chanel",
    brand: "Chanel",
    ml: 50,
    price: 1500000,
    original_price: null,
    stock: 4,
  },
];

describe("AdminInventory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders inventory rows", async () => {
    const { adminGet } = await import("@/lib/admin-api");
    vi.mocked(adminGet).mockResolvedValueOnce(INVENTORY_FIXTURE);

    render(<AdminInventory />);

    expect(await screen.findByText("Bleu de Chanel")).toBeInTheDocument();
    expect(screen.getByText(/2 dung tích/i)).toBeInTheDocument();
    expect(screen.getByText(/12 chai/i)).toBeInTheDocument();
  });

  it("updates stock via PATCH and reflects new value", async () => {
    const { adminGet, adminPatch } = await import("@/lib/admin-api");
    vi.mocked(adminGet).mockResolvedValueOnce(INVENTORY_FIXTURE);
    vi.mocked(adminPatch).mockResolvedValueOnce({ stock: 12 });

    render(<AdminInventory />);

    await screen.findByText("Bleu de Chanel");

    fireEvent.click(screen.getAllByRole("button", { name: /sửa tồn/i })[0]);

    const input = screen.getByDisplayValue("8");
    fireEvent.change(input, { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: /^lưu$/i }));

    await waitFor(() => {
      expect(vi.mocked(adminPatch)).toHaveBeenCalledWith(
        "/api/admin/inventory/variants/v1/stock",
        { stock: 12 },
      );
    });

    await screen.findByText(/16 chai/i);
  });
});
