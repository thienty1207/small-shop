export interface FooterLinkField {
  labelKey: string;
  hrefKey: string;
}

export const FOOTER_DEFAULTS: Record<string, string> = {
  footer_description:
    "Mỗi sản phẩm là một câu chuyện được tạo ra với tình yêu và sự tỉ mỉ của bàn tay thủ công.",
  footer_shop_title: "Cửa hàng",
  footer_info_title: "Thông tin",
  footer_contact_title: "Liên hệ",
  footer_shop_link_1_label: "Tất cả sản phẩm",
  footer_shop_link_1_href: "/products",
  footer_shop_link_2_label: "Nến thơm",
  footer_shop_link_2_href: "/products?category=nen-thom",
  footer_shop_link_3_label: "Trang sức",
  footer_shop_link_3_href: "/products?category=trang-suc",
  footer_shop_link_4_label: "Túi vải",
  footer_shop_link_4_href: "/products?category=tui-vai",
  footer_shop_link_5_label: "Thiệp handmade",
  footer_shop_link_5_href: "/products?category=thiep",
  footer_info_link_1_label: "Giới thiệu",
  footer_info_link_1_href: "/about",
  footer_info_link_2_label: "Liên hệ",
  footer_info_link_2_href: "/contact",
  footer_info_link_3_label: "Chính sách vận chuyển",
  footer_info_link_3_href: "/policy",
  footer_info_link_4_label: "Chính sách bảo mật",
  footer_info_link_4_href: "/policy",
  footer_info_link_5_label: "Điều khoản dịch vụ",
  footer_info_link_5_href: "/policy",
  footer_bottom_left: "Tất cả quyền được bảo lưu.",
  footer_bottom_right: "Thiết kế với tình yêu tại Việt Nam",
};

export const FOOTER_SHOP_LINK_FIELDS: FooterLinkField[] = [
  { labelKey: "footer_shop_link_1_label", hrefKey: "footer_shop_link_1_href" },
  { labelKey: "footer_shop_link_2_label", hrefKey: "footer_shop_link_2_href" },
  { labelKey: "footer_shop_link_3_label", hrefKey: "footer_shop_link_3_href" },
  { labelKey: "footer_shop_link_4_label", hrefKey: "footer_shop_link_4_href" },
  { labelKey: "footer_shop_link_5_label", hrefKey: "footer_shop_link_5_href" },
];

export const FOOTER_INFO_LINK_FIELDS: FooterLinkField[] = [
  { labelKey: "footer_info_link_1_label", hrefKey: "footer_info_link_1_href" },
  { labelKey: "footer_info_link_2_label", hrefKey: "footer_info_link_2_href" },
  { labelKey: "footer_info_link_3_label", hrefKey: "footer_info_link_3_href" },
  { labelKey: "footer_info_link_4_label", hrefKey: "footer_info_link_4_href" },
  { labelKey: "footer_info_link_5_label", hrefKey: "footer_info_link_5_href" },
];

export const FOOTER_KEYS = [
  "footer_description",
  "footer_shop_title",
  "footer_info_title",
  "footer_contact_title",
  "footer_bottom_left",
  "footer_bottom_right",
  ...FOOTER_SHOP_LINK_FIELDS.flatMap(({ labelKey, hrefKey }) => [labelKey, hrefKey]),
  ...FOOTER_INFO_LINK_FIELDS.flatMap(({ labelKey, hrefKey }) => [labelKey, hrefKey]),
];

export function getSettingValue(
  settings: Record<string, string>,
  key: string,
  fallback = "",
): string {
  return Object.prototype.hasOwnProperty.call(settings, key)
    ? settings[key] ?? ""
    : (FOOTER_DEFAULTS[key] ?? fallback);
}

export function getSettingsWithFooterDefaults(
  settings: Record<string, string>,
): Record<string, string> {
  return {
    ...FOOTER_DEFAULTS,
    ...settings,
  };
}
