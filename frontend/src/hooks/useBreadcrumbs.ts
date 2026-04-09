import { useLocation, useParams } from "react-router-dom";

export interface BreadcrumbSegment {
  label: string;
  href?: string;
}

/**
 * useBreadcrumbs — generates a breadcrumb trail from the current route.
 *
 * Dynamic segments like product slugs and order IDs are resolved via
 * the optional `overrides` map, e.g. { slug: product.name }.
 */
export function useBreadcrumbs(
  overrides: Record<string, string> = {},
): BreadcrumbSegment[] {
  const { pathname } = useLocation();
  const params = useParams();

  const SEGMENT_LABELS: Record<string, string> = {
    "":          "Trang chủ",
    products:    "Sản phẩm",
    product:     "Sản phẩm",
    cart:        "Giỏ hàng",
    checkout:    "Thanh toán",
    order:       "Đơn hàng",
    orders:      "Đơn hàng",
    account:     "Tài khoản",
    about:       "Giới thiệu",
    contact:     "Liên hệ",
    policy:      "Chính sách",
    success:     "Đặt hàng thành công",
    // admin
    admin:       "Admin",
    dashboard:   "Dashboard",
    categories:  "Danh mục",
    inventory:   "Tồn kho",
    customers:   "Khách hàng",
    staff:       "Nhân viên",
    permissions: "Phân quyền",
    users:       "Người dùng",
    settings:    "Cài đặt",
    appearance:  "Giao diện",
    store:       "Thông tin cửa hàng",
    shipping:    "Vận chuyển",
    email:       "Email",
    notifications: "Thông báo",
    reviews:     "Đánh giá",
    coupons:     "Mã giảm giá",
    blog:        "Quản lý bài viết",
    tags:        "Tag",
  };

  const parts = pathname.split("/").filter(Boolean);
  const crumbs: BreadcrumbSegment[] = [{ label: "Trang chủ", href: "/" }];

  let accumulated = "";
  for (const part of parts) {
    accumulated += `/${part}`;

    // Check if this segment is a known dynamic param value
    const isDynamic = Object.values(params).includes(part);
    let label: string;

    if (isDynamic) {
      // Try override first (e.g. actual product name), fallback to raw value
      const paramKey = Object.keys(params).find((k) => params[k] === part) ?? "";
      label = overrides[paramKey] ?? overrides[part] ?? part;
    } else {
      label = SEGMENT_LABELS[part] ?? part;
    }

    crumbs.push({ label, href: accumulated });
  }

  // Bổ sung nhãn "Tất cả bài viết" cho trang /admin/blog
  if (pathname === "/admin/blog") {
    crumbs.push({ label: "Tất cả bài viết" });
  }

  if (pathname === "/admin/blog/reviews") {
    crumbs.push({ label: "Đánh giá bài viết" });
  }

  // Last segment has no href (current page)
  if (crumbs.length > 1) {
    delete crumbs[crumbs.length - 1].href;
  }

  return crumbs;
}
