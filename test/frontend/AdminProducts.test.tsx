import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import AdminProducts from "../../frontend/src/pages/admin/Products";

const mockAdminGet = vi.fn();
const mockAdminPost = vi.fn();
const mockAdminPut = vi.fn();
const mockAdminDel = vi.fn();
const mockAdminDownload = vi.fn();
const mockAdminUploadImage = vi.fn();

vi.mock("../../frontend/src/components/admin/AdminLayout", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("../../frontend/src/lib/admin-api", () => ({
  adminGet: (...args: unknown[]) => mockAdminGet(...args),
  adminPost: (...args: unknown[]) => mockAdminPost(...args),
  adminPut: (...args: unknown[]) => mockAdminPut(...args),
  adminDel: (...args: unknown[]) => mockAdminDel(...args),
  adminDownload: (...args: unknown[]) => mockAdminDownload(...args),
  adminUploadImage: (...args: unknown[]) => mockAdminUploadImage(...args),
  Category: {},
  PaginatedResponse: {},
}));

describe("AdminProducts fragrance classification", () => {
  beforeEach(() => {
    mockAdminGet.mockImplementation((path: string) => {
      if (path === "/api/admin/categories") {
        return Promise.resolve([
          {
            id: "cat-1",
            name: "Azzaro",
            slug: "azzaro",
            image_url: null,
            created_at: "2026-03-22T00:00:00Z",
          },
        ]);
      }

      if (path.startsWith("/api/admin/products?")) {
        return Promise.resolve({
          items: [],
          total: 0,
          page: 1,
          limit: 15,
          total_pages: 1,
        });
      }

      return Promise.resolve({});
    });
    mockAdminPost.mockResolvedValue({});
    mockAdminPut.mockResolvedValue({});
    mockAdminDel.mockResolvedValue({});
    mockAdminDownload.mockResolvedValue(undefined);
    mockAdminUploadImage.mockResolvedValue("https://example.com/thumb.jpg");
  });

  it("sends homepage section independently from fragrance metadata when creating a product", async () => {
    const { container } = render(<AdminProducts />);

    await userEvent.click(await screen.findByRole("button", { name: /thêm sản phẩm/i }));

    await userEvent.type(
      screen.getByPlaceholderText(/túi tote handmade/i),
      "Azzaro The Most Wanted",
    );
    await userEvent.type(screen.getByPlaceholderText(/185000/i), "310000");
    await userEvent.type(
      screen.getByPlaceholderText(/https:\/\//i),
      "https://example.com/product.jpg",
    );

    const selects = Array.from(container.querySelectorAll("select")).slice(-6);
    await userEvent.selectOptions(selects[0], "cat-1");

    await userEvent.click(screen.getByRole("button", { name: /tạo sản phẩm/i }));

    await waitFor(() => expect(mockAdminPost).not.toHaveBeenCalled());

    await userEvent.selectOptions(selects[2], "female");
    await userEvent.selectOptions(selects[3], "male");
    await userEvent.selectOptions(selects[4], "niche");

    await userEvent.click(screen.getByRole("button", { name: /tạo sản phẩm/i }));

    await waitFor(() => expect(mockAdminPost).toHaveBeenCalledOnce());
    expect(mockAdminPost).toHaveBeenCalledWith(
      "/api/admin/products",
      expect.objectContaining({
        homepage_section: "female",
        fragrance_gender: "male",
        fragrance_line: "niche",
      }),
    );
  });
});
