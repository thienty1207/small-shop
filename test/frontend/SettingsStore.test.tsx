import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import SettingsStore from "../../frontend/src/pages/admin/SettingsStore";

const mockAdminGet = vi.fn();
const mockAdminPut = vi.fn();

vi.mock("../../frontend/src/components/admin/AdminLayout", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("../../frontend/src/lib/admin-api", () => ({
  adminGet: (...args: unknown[]) => mockAdminGet(...args),
  adminPut: (...args: unknown[]) => mockAdminPut(...args),
}));

describe("Admin SettingsStore", () => {
  beforeEach(() => {
    mockAdminGet.mockResolvedValue({
      store_name: "Handmade Haven",
      store_email: "shop@example.com",
      store_phone: "0399623947",
      store_address: "Châu Đốc, An Giang",
      social_facebook: "https://facebook.com/store",
      social_instagram: "",
      social_tiktok: "",
    });
    mockAdminPut.mockResolvedValue({});
  });

  it("preloads footer defaults so admin can edit old hardcoded footer content", async () => {
    render(<SettingsStore />);

    expect(
      await screen.findByLabelText("Mô tả thương hiệu"),
    ).toHaveValue(
      "Mỗi sản phẩm là một câu chuyện được tạo ra với tình yêu và sự tỉ mỉ của bàn tay thủ công.",
    );
    expect(
      screen.getByLabelText("Cột sản phẩm 4 - Nhãn"),
    ).toHaveValue("Túi vải");
    expect(
      screen.getByLabelText("Cột thông tin 5 - Nhãn"),
    ).toHaveValue("Điều khoản dịch vụ");
  });

  it("saves edited footer fields through the existing admin settings endpoint", async () => {
    render(<SettingsStore />);

    const footerDescription = await screen.findByLabelText("Mô tả thương hiệu");
    const shopLinkLabel = screen.getByLabelText("Cột sản phẩm 4 - Nhãn");
    const bottomRight = screen.getByLabelText("Dòng cuối bên phải");

    await userEvent.clear(footerDescription);
    await userEvent.type(footerDescription, "Footer mới cho bộ sưu tập quà tặng.");
    await userEvent.clear(shopLinkLabel);
    await userEvent.type(shopLinkLabel, "Quà lưu niệm");
    await userEvent.clear(bottomRight);
    await userEvent.type(bottomRight, "Làm thủ công tại Châu Đốc");

    await userEvent.click(screen.getByRole("button", { name: /lưu cài đặt/i }));

    await waitFor(() => expect(mockAdminPut).toHaveBeenCalledOnce());

    expect(mockAdminPut).toHaveBeenCalledWith(
      "/api/admin/settings",
      expect.objectContaining({
        settings: expect.objectContaining({
          footer_description: "Footer mới cho bộ sưu tập quà tặng.",
          footer_shop_link_4_label: "Quà lưu niệm",
          footer_bottom_right: "Làm thủ công tại Châu Đốc",
        }),
      }),
    );
  });
});
