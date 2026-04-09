import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminPermissions from "@/pages/admin/Permissions";

vi.mock("@/components/admin/AdminLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/contexts/AdminAuthContext", () => ({
  useAdminAuth: () => ({ adminUser: { role: "super_admin" } }),
}));

vi.mock("@/lib/admin-api", () => ({
  adminGet: vi.fn(),
  adminPatch: vi.fn(),
}));

const FIXTURE = {
  groups: [
    {
      key: "products",
      group: "Sản phẩm",
      items: [
        {
          key: "products.view",
          label: "Xem danh sách sản phẩm",
          super_admin: true,
          manager: true,
          staff: true,
        },
      ],
    },
  ],
};

describe("AdminPermissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads and renders permission matrix", async () => {
    const { adminGet } = await import("@/lib/admin-api");
    vi.mocked(adminGet).mockResolvedValueOnce(FIXTURE);

    render(<AdminPermissions />);

    expect(await screen.findByText("Sản phẩm")).toBeInTheDocument();
    expect(screen.getByText("Xem danh sách sản phẩm")).toBeInTheDocument();
  });

  it("toggles permission and saves via PATCH", async () => {
    const { adminGet, adminPatch } = await import("@/lib/admin-api");
    vi.mocked(adminGet).mockResolvedValueOnce(FIXTURE);
    vi.mocked(adminPatch).mockResolvedValueOnce({
      groups: [
        {
          key: "products",
          group: "Sản phẩm",
          items: [
            {
              key: "products.view",
              label: "Xem danh sách sản phẩm",
              super_admin: true,
              manager: false,
              staff: true,
            },
          ],
        },
      ],
    });

    render(<AdminPermissions />);
    await screen.findByText("Sản phẩm");

    fireEvent.click(
      screen.getByRole("button", {
        name: "toggle-products-products.view-manager",
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: /lưu thay đổi/i }));

    await waitFor(() => {
      expect(vi.mocked(adminPatch)).toHaveBeenCalledWith(
        "/api/admin/permissions",
        {
          groups: [
            {
              key: "products",
              group: "Sản phẩm",
              items: [
                {
                  key: "products.view",
                  label: "Xem danh sách sản phẩm",
                  super_admin: true,
                  manager: false,
                  staff: true,
                },
              ],
            },
          ],
        },
      );
    });
  });
});
