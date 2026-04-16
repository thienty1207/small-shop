import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, User, LogOut, Package, Settings, Menu, X, Heart, Bell } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useShopSettingsCtx } from "@/contexts/ShopSettingsContext";
import { API_BASE_URL } from "@/lib/api-base";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const API_URL = API_BASE_URL;

interface SearchSuggestion {
  type: "product";
  id: string;
  slug: string;
  name: string;
  image_url: string;
  brand?: string;
  price: number;
}

interface BlogSuggestion {
  type: "blog";
  id: string;
  slug: string;
  title: string;
  cover_image_url: string | null;
  published_at: string | null;
}

type GlobalSearchSuggestion = SearchSuggestion | BlogSuggestion;

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

async function fetchProductSuggestions(
  keyword: string,
  signal: AbortSignal,
): Promise<SearchSuggestion[]> {
  const res = await fetch(
    `${API_URL}/api/products/search/suggest?search=${encodeURIComponent(keyword)}&limit=8`,
    { signal },
  );

  if (res.ok) {
    const data = (await res.json()) as Array<{
      id: string;
      slug: string;
      name: string;
      image_url: string;
      brand?: string;
      price: number;
    }>;

    return (Array.isArray(data) ? data : []).map((item) => ({
      type: "product",
      id: item.id,
      slug: item.slug,
      name: item.name,
      image_url: item.image_url,
      brand: item.brand,
      price: item.price,
    }));
  }

  if (res.status !== 404) {
    throw new Error("Failed to fetch search suggestions");
  }

  // Backward compatibility: backend chưa bật endpoint suggest
  const fallbackRes = await fetch(
    `${API_URL}/api/products?search=${encodeURIComponent(keyword)}&limit=8&page=1`,
    { signal },
  );
  if (!fallbackRes.ok) throw new Error("Failed to fetch fallback search suggestions");

  const fallbackData = await fallbackRes.json() as {
    items?: Array<{
      id: string;
      slug: string;
      name: string;
      image_url: string;
      brand?: string;
      price: number;
    }>;
  };

  return (fallbackData.items ?? []).map((item) => ({
    type: "product",
    id: item.id,
    slug: item.slug,
    name: item.name,
    image_url: item.image_url,
    brand: item.brand,
    price: item.price,
  }));
}

async function fetchBlogSuggestions(
  keyword: string,
  signal: AbortSignal,
): Promise<BlogSuggestion[]> {
  const res = await fetch(
    `${API_URL}/api/blog?search=${encodeURIComponent(keyword)}&limit=4&page=1`,
    { signal },
  );

  if (!res.ok) return [];

  const data = (await res.json()) as {
    items?: Array<{
      id: string;
      slug: string;
      title: string;
      cover_image_url: string | null;
      published_at: string | null;
    }>;
  };

  const normalizedKeyword = normalizeSearchText(keyword);

  return (data.items ?? [])
    .filter((item) => normalizeSearchText(item.title).includes(normalizedKeyword))
    .map((item) => ({
      type: "blog",
      id: item.id,
      slug: item.slug,
      title: item.title,
      cover_image_url: item.cover_image_url,
      published_at: item.published_at,
    }));
}

interface HeaderProps {
  /** When true, header starts transparent and becomes solid on scroll */
  transparent?: boolean;
  /** When true, solid header state uses dark styling (homepage-only). */
  darkOnSolid?: boolean;
}

interface UserNotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface UserNotificationsResponse {
  items: UserNotificationItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

const Header = ({ transparent = false, darkOnSolid = true }: HeaderProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { items } = useCart();
  const { wishlistIds } = useWishlist();
  const { user, isAuthenticated, logout } = useAuth();
  const { settings } = useShopSettingsCtx();
  const storeName = (settings.store_name ?? "Small Shop").trim() || "Small Shop";
  const storeLogoUrl = (
    settings.store_logo_url
    ?? settings.store_logo
    ?? settings.logo_url
    ?? settings.storeLogoUrl
    ?? settings.brand_logo_url
    ?? settings.logo
    ?? ""
  ).trim();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalWishlistItems = wishlistIds.length;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<GlobalSearchSuggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notificationItems, setNotificationItems] = useState<UserNotificationItem[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!transparent) return;
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [transparent]);

  useEffect(() => {
    setLogoFailed(false);
  }, [storeLogoUrl]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
    setBellOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!searchOpen) return;
    const id = window.setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(id);
  }, [searchOpen]);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotificationItems([]);
      setUnreadNotifications(0);
      return;
    }

    let active = true;
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    const pullNotifications = async () => {
      try {
        const [listRes, unreadRes] = await Promise.all([
          fetch(`${API_URL}/api/notifications?limit=10&page=1`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/api/notifications/unread-count`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!listRes.ok || !unreadRes.ok) return;

        const listPayload = (await listRes.json()) as UserNotificationsResponse;
        const unreadPayload = (await unreadRes.json()) as { unread?: number };
        if (!active) return;

        setNotificationItems(listPayload.items ?? []);
        setUnreadNotifications(unreadPayload.unread ?? 0);
      } catch {
        // ignore polling errors
      }
    };

    void pullNotifications();
    const intervalId = window.setInterval(() => {
      void pullNotifications();
    }, 15000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!bellOpen) return;

    const token = localStorage.getItem("auth_token");
    if (!token) return;

    setLoadingNotifications(true);
    fetch(`${API_URL}/api/notifications/mark-all-read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
      .finally(() => {
        setUnreadNotifications(0);
        setLoadingNotifications(false);
      });
  }, [bellOpen]);

  useEffect(() => {
    if (!searchOpen) {
      setSearchSuggestions([]);
      setSearchLoading(false);
      return;
    }

    const keyword = searchTerm.trim();
    if (keyword.length < 2) {
      setSearchSuggestions([]);
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const [products, blogs] = await Promise.all([
          fetchProductSuggestions(keyword, controller.signal),
          fetchBlogSuggestions(keyword, controller.signal),
        ]);

        setSearchSuggestions([
          ...products.slice(0, 4),
          ...blogs.slice(0, 4),
        ]);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSearchSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchOpen, searchTerm]);

  const handleLoginClick = () => {
    const returnTo = location.pathname + location.search;
    if (returnTo !== "/login" && returnTo !== "/register") {
      sessionStorage.setItem("returnTo", returnTo);
    }
    navigate("/login", { state: { returnTo } });
  };

  const handleSearchClick = () => {
    setMobileMenuOpen(false);
    setSearchOpen((prev) => !prev);
  };

  const submitSearch = (value: string) => {
    const keyword = value.trim();
    if (!keyword) return;
    setSearchOpen(false);
    navigate(`/products?search=${encodeURIComponent(keyword)}`);
  };

  const formatPrice = (value: number) => `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
  const formatDate = (value: string | null) => {
    if (!value) return "Bài viết";
    return new Date(value).toLocaleDateString("vi-VN");
  };
  const resolveSuggestionImage = (url: string | null) => {
    if (!url) return storeLogoUrl || "";
    return url.startsWith("/") ? `${API_URL}${url}` : url;
  };

  const isHomepage = location.pathname === "/";
  // Only homepage with explicit transparent mode can use the transparent behavior.
  const allowHomepageTransparentMode = isHomepage && transparent;
  const forceBlackNavbar = !allowHomepageTransparentMode;

  const isSolid = forceBlackNavbar || scrolled || mobileMenuOpen || searchOpen;
  const solidDark = forceBlackNavbar || (isSolid && darkOnSolid);

  const hasSuggestionKeyword = searchTerm.trim().length >= 2;
  const showNoSuggestion = hasSuggestionKeyword && !searchLoading && searchSuggestions.length === 0;

  const searchPanelTone = solidDark
    ? "bg-black/95 border-white/15"
    : "bg-white/95 border-black/10";
  const searchInputTone = solidDark
    ? "bg-white/10 border-white/20 text-white placeholder:text-white/45 focus:border-white/35"
    : "bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-primary/40";
  const searchHintTone = solidDark ? "text-white/60" : "text-muted-foreground";
  const searchItemTone = solidDark
    ? "hover:bg-white/10 focus:bg-white/10 text-white/90"
    : "hover:bg-black/[0.04] focus:bg-black/[0.04] text-foreground";
  const searchSubTone = solidDark ? "text-white/60" : "text-muted-foreground";

  const navLinks = [
    { label: "Cửa Hàng", href: "/products" },
    { label: "Blog", href: "/blog" },
    { label: "Giới Thiệu", href: "/about" },
    { label: "Liên Hệ", href: "/contact" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 pb-2 md:pb-3 transition-all duration-300 ${
        forceBlackNavbar
          ? "!bg-black backdrop-blur-md border-b border-white/10 shadow-[0_14px_36px_rgba(0,0,0,0.7)]"
          : isSolid
          ? solidDark
            ? "bg-black/95 backdrop-blur-md border-b border-white/10 shadow-[0_14px_36px_rgba(0,0,0,0.7)]"
            : "bg-background/96 backdrop-blur-md border-b border-black/10 shadow-[0_10px_28px_rgba(0,0,0,0.18)]"
          : "bg-black/90 backdrop-blur-md border-b border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.55)]"
      }`}
    >
      <div className="container relative mx-auto px-4 md:px-8 flex items-center justify-between h-24 md:h-28 gap-3 md:gap-4 md:grid md:grid-cols-[1fr_auto_1fr]">
        {/* Left user (desktop) */}
        <div className="hidden md:flex md:col-start-1 items-center justify-start">
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`inline-flex p-0.5 rounded-full transition-colors outline-none ${
                    solidDark ? "hover:bg-white/10" : isSolid ? "hover:bg-muted" : "hover:bg-white/10"
                  }`}
                  aria-label="Hồ sơ cá nhân"
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name}
                      className="w-12 h-12 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xs font-semibold ${
                      solidDark ? "bg-white/20 text-white" : isSolid ? "bg-primary/15 text-primary" : "bg-white/20 text-white"
                    }`}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel className="pb-1">
                  <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                  <p className="text-xs font-normal text-muted-foreground truncate">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/account" className="flex items-center gap-2 cursor-pointer">
                    <Settings size={14} /> Tài khoản
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/account?tab=orders" className="flex items-center gap-2 cursor-pointer">
                    <Package size={14} /> Đơn hàng của tôi
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/wishlist" className="flex items-center gap-2 cursor-pointer">
                    <Heart size={14} /> Yêu thích
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive flex items-center gap-2 cursor-pointer"
                  onClick={logout}
                >
                  <LogOut size={14} /> Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              onClick={handleLoginClick}
              aria-label="Đăng nhập"
              className={`inline-flex p-1.5 rounded-full transition-colors ${
                solidDark
                  ? "text-white/80 hover:text-white hover:bg-white/10"
                  : isSolid
                  ? "text-muted-foreground hover:text-foreground hover:bg-muted"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <User size={18} />
            </button>
          )}
        </div>

        {/* Brand name */}
        <Link
          to="/"
          className={`shrink-0 h-full flex items-center justify-center px-2 md:col-start-2 md:justify-self-center font-display font-bold tracking-wide whitespace-nowrap ${
            solidDark ? "text-white" : isSolid ? "text-foreground" : "text-white"
          }`}
          aria-label="Tên cửa hàng"
        >
          {storeLogoUrl && !logoFailed ? (
            <img
              src={storeLogoUrl}
              alt={storeName}
              className="h-14 w-auto max-w-[220px] object-contain md:h-20 md:max-w-[320px]"
              loading="eager"
              decoding="async"
              onError={() => setLogoFailed(true)}
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-lg md:text-[2rem] leading-none">{storeName}</span>
          )}
        </Link>

        {/* Right icons */}
        <div className="flex items-center justify-end gap-1 shrink-0 md:col-start-3 md:justify-self-end">
          {/* Search */}
          <button
            onClick={handleSearchClick}
            aria-label="Tìm kiếm"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              solidDark
                ? "text-white/80 hover:text-white hover:bg-white/10"
                : isSolid
                ? "text-muted-foreground hover:text-foreground hover:bg-muted"
                : "text-white/80 hover:text-white hover:bg-white/10"
            }`}
          >
            <Search size={18} />
            <span className="leading-none">Tìm kiếm</span>
          </button>

          {/* Menu toggle (all screens) */}
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              solidDark
                ? "text-white/80 hover:text-white hover:bg-white/10"
                : isSolid
                ? "text-muted-foreground hover:text-foreground hover:bg-muted"
                : "text-white/80 hover:text-white hover:bg-white/10"
            }`}
            aria-label="Mở menu"
          >
            {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
            <span className="leading-none">Menu</span>
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className={`px-4 pb-3 md:px-8 ${solidDark ? "text-white" : "text-foreground"}`}>
          <div className={`container mx-auto rounded-2xl border p-3 md:p-4 ${searchPanelTone}`}>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                submitSearch(searchTerm);
              }}
              className="flex items-center gap-2"
            >
              <div className={`flex h-11 flex-1 items-center gap-2 rounded-xl border px-3 ${searchInputTone}`}>
                <Search size={16} className={searchHintTone} />
                <input
                  ref={searchInputRef}
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Tìm theo tên nước hoa hoặc tiêu đề bài viết..."
                  className="h-full w-full bg-transparent text-sm outline-none"
                />
              </div>
              <button
                type="submit"
                className="h-11 rounded-xl bg-white px-4 text-sm font-semibold text-black hover:bg-white/90"
              >
                Tìm
              </button>
            </form>

            <div className="mt-3 max-h-[55vh] overflow-y-auto">
              {!hasSuggestionKeyword && (
                <p className={`px-1 text-xs ${searchHintTone}`}>
                  Nhập ít nhất 2 ký tự để xem gợi ý.
                </p>
              )}

              {searchLoading && (
                <p className={`px-1 text-xs ${searchHintTone}`}>Đang tìm...</p>
              )}

              {showNoSuggestion && (
                <p className={`px-1 text-xs ${searchHintTone}`}>Không có gợi ý sản phẩm hoặc bài viết phù hợp.</p>
              )}

              {searchSuggestions.length > 0 && (
                <div className="space-y-1">
                  {searchSuggestions.map((item) => (
                    <Link
                      key={`${item.type}-${item.id}`}
                      to={item.type === "product" ? `/product/${item.slug}` : `/blog/${item.slug}`}
                      onClick={() => setSearchOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors ${searchItemTone}`}
                    >
                      <img
                        src={item.type === "product" ? item.image_url : resolveSuggestionImage(item.cover_image_url)}
                        alt={item.type === "product" ? item.name : item.title}
                        className="h-11 w-11 shrink-0 rounded-lg object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {item.type === "product" ? item.name : item.title}
                        </p>
                        <p className={`truncate text-xs ${searchSubTone}`}>
                          {item.type === "product"
                            ? (item.brand ? `${item.brand} · ${formatPrice(item.price)}` : formatPrice(item.price))
                            : `Blog · ${formatDate(item.published_at)}`}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Slide-down menu (mobile + desktop) */}
      {mobileMenuOpen && (
        <div className={`flex flex-col gap-1 shadow-lg px-4 py-3 border-b md:absolute md:right-6 md:top-full md:mt-2 md:w-[22rem] md:rounded-2xl md:border md:px-3 md:py-3 md:backdrop-blur-md ${
          darkOnSolid
            ? "bg-black border-white/15"
            : "bg-white border-black/10"
        }`}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                location.pathname === link.href
                  ? darkOnSolid
                    ? "bg-white/15 text-white"
                    : "bg-primary/10 text-primary"
                  : darkOnSolid
                  ? "text-white/85 hover:bg-white/10"
                  : "text-black hover:bg-black/5"
              }`}
            >
              {link.label}
            </Link>
          ))}

          <div className={`my-2 border-t ${darkOnSolid ? "border-white/15" : "border-black/10"}`} />

          {isAuthenticated && user ? (
            <>
              <Link
                to="/account"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 ${
                  darkOnSolid ? "text-white/85 hover:bg-white/10" : "text-black hover:bg-black/5"
                }`}
              >
                {user.avatar_url ? (
                  <>
                    <img
                      src={user.avatar_url}
                      alt={user.name}
                      className="h-6 w-6 rounded-full object-cover md:hidden"
                      referrerPolicy="no-referrer"
                    />
                    <span className="hidden h-6 w-6 items-center justify-center rounded-full bg-white/10 md:inline-flex">
                      <User size={14} />
                    </span>
                  </>
                ) : (
                  <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-semibold flex items-center justify-center">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
                Hồ sơ
              </Link>

              <Link
                to="/wishlist"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between ${
                  darkOnSolid ? "text-white/85 hover:bg-white/10" : "text-black hover:bg-black/5"
                }`}
              >
                <span className="flex items-center gap-2"><Heart size={16} /> Yêu thích</span>
                {totalWishlistItems > 0 && (
                  <span className="text-[10px] min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white font-semibold flex items-center justify-center">
                    {totalWishlistItems}
                  </span>
                )}
              </Link>

              <div className="relative">
                <button
                  onClick={() => setBellOpen((prev) => !prev)}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between text-left ${
                    darkOnSolid ? "text-white/85 hover:bg-white/10" : "text-black hover:bg-black/5"
                  }`}
                >
                  <span className="flex items-center gap-2"><Bell size={16} /> Thông báo</span>
                  {unreadNotifications > 0 && (
                    <span className="text-[10px] min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white font-semibold flex items-center justify-center">
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </span>
                  )}
                </button>

                {bellOpen && (
                  <div
                    className={`absolute z-[70] left-2 right-2 top-full mt-3 overflow-hidden rounded-2xl border shadow-2xl md:left-auto md:right-full md:mr-3 md:top-1/2 md:mt-0 md:w-80 md:-translate-y-1/2 ${
                      darkOnSolid ? "border-white/15 bg-black/95" : "border-black/10 bg-white/95"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute -top-1.5 left-10 h-3 w-3 rotate-45 border-l border-t md:left-auto md:-right-1.5 md:top-1/2 md:-translate-y-1/2 md:rotate-45 md:border-l-0 md:border-t-0 md:border-r md:border-b ${
                        darkOnSolid
                          ? "border-white/15 bg-black/95"
                          : "border-black/10 bg-white/95"
                      }`}
                    />

                    <div className={`px-4 py-3 text-xs font-semibold border-b ${darkOnSolid ? "border-white/10 text-white" : "border-black/10 text-foreground"}`}>
                      Thông báo của bạn
                    </div>

                    <div className="notifications-scroll max-h-[20rem] overflow-y-auto overscroll-contain">
                      {loadingNotifications ? (
                        <p className={`px-4 py-5 text-xs ${searchHintTone}`}>Đang cập nhật...</p>
                      ) : notificationItems.length === 0 ? (
                        <p className={`px-4 py-5 text-xs ${searchHintTone}`}>Chưa có thông báo nào.</p>
                      ) : (
                        notificationItems.map((item) => (
                          <div
                            key={item.id}
                            className={`min-h-20 px-4 py-3 border-b last:border-b-0 ${darkOnSolid ? "border-white/10" : "border-black/10"}`}
                          >
                            <p className={`text-xs font-semibold ${darkOnSolid ? "text-white" : "text-foreground"}`}>{item.title}</p>
                            <p className={`mt-1 text-xs ${searchSubTone}`}>{item.message}</p>
                            <p className={`mt-1 text-[10px] ${searchHintTone}`}>
                              {new Date(item.created_at).toLocaleString("vi-VN")}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Link
                to="/cart"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between ${
                  darkOnSolid ? "text-white/85 hover:bg-white/10" : "text-black hover:bg-black/5"
                }`}
              >
                <span className="flex items-center gap-2"><ShoppingCart size={16} /> Giỏ hàng</span>
                {totalItems > 0 && (
                  <span className="text-[10px] min-w-5 h-5 px-1.5 rounded-full bg-primary text-white font-semibold flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Link>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 flex items-center gap-2 text-left"
              >
                <LogOut size={16} /> Đăng xuất
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLoginClick();
              }}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 text-left ${
                darkOnSolid ? "text-white/85 hover:bg-white/10" : "text-black hover:bg-black/5"
              }`}
            >
              <User size={16} /> Đăng nhập
            </button>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
