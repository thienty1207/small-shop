import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Footer from "../../frontend/src/components/layout/Footer";

let mockSettings: Record<string, string> = {};

vi.mock("../../frontend/src/contexts/ShopSettingsContext", () => ({
  useShopSettingsCtx: () => ({
    settings: mockSettings,
    isLoading: false,
    refreshSettings: vi.fn(),
  }),
}));

function renderFooter() {
  return render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );
}

describe("Footer", () => {
  beforeEach(() => {
    mockSettings = {
      store_name: "Handmade Haven",
      store_email: "shop@example.com",
      store_phone: "0901234567",
      store_address: "Châu Đốc, An Giang",
      social_facebook: "https://facebook.com/store",
      social_instagram: "https://instagram.com/store",
      social_tiktok: "https://tiktok.com/@store",
    };
  });

  it("renders footer content from editable settings", () => {
    mockSettings = {
      ...mockSettings,
      footer_description: "Mô tả footer mới cho cửa hàng.",
      footer_shop_title: "Danh mục mua sắm",
      footer_info_title: "Trang nội dung",
      footer_contact_title: "Kết nối",
      footer_shop_link_1_label: "Quà tặng",
      footer_shop_link_1_href: "/products?category=qua-tang",
      footer_info_link_1_label: "Câu chuyện thương hiệu",
      footer_info_link_1_href: "/about",
      footer_bottom_left: "Bản quyền thuộc cửa hàng.",
      footer_bottom_right: "Làm thủ công tại An Giang",
    };

    renderFooter();

    expect(screen.getByText("Mô tả footer mới cho cửa hàng.")).toBeInTheDocument();
    expect(screen.getByText("Danh mục mua sắm")).toBeInTheDocument();
    expect(screen.getByText("Trang nội dung")).toBeInTheDocument();
    expect(screen.getByText("Kết nối")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Quà tặng" })).toHaveAttribute(
      "href",
      "/products?category=qua-tang",
    );
    expect(
      screen.getByRole("link", { name: "Câu chuyện thương hiệu" }),
    ).toHaveAttribute("href", "/about");
    expect(screen.getByText(/Bản quyền thuộc cửa hàng\./)).toBeInTheDocument();
    expect(screen.getByText("Làm thủ công tại An Giang")).toBeInTheDocument();
  });

  it("hides cleared footer links instead of falling back to old hardcoded items", () => {
    mockSettings = {
      ...mockSettings,
      footer_shop_link_4_label: "",
      footer_shop_link_4_href: "",
      footer_info_link_5_label: "",
      footer_info_link_5_href: "",
    };

    renderFooter();

    expect(screen.queryByRole("link", { name: "Túi vải" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Điều khoản dịch vụ" })).toBeNull();
  });
});
