import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, User, LogOut, Package, Settings, Menu, X, Heart } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useShopSettingsCtx } from "@/contexts/ShopSettingsContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

interface SearchSuggestion {
  id: string;
  slug: string;
  name: string;
  image_url: string;
  brand?: string;
  price: number;
}

interface HeaderProps {
  /** When true, header starts transparent and becomes solid on scroll */
  transparent?: boolean;
  /** When true, solid header state uses dark styling (homepage-only). */
  darkOnSolid?: boolean;
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
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
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
        const res = await fetch(
          `${API_URL}/api/products/search/suggest?search=${encodeURIComponent(keyword)}&limit=8`,
          { signal: controller.signal },
        );

        if (res.ok) {
          const data = (await res.json()) as SearchSuggestion[];
          setSearchSuggestions(Array.isArray(data) ? data : []);
        } else if (res.status === 404) {
          // Backward compatibility: backend chưa bật endpoint suggest
          const fallbackRes = await fetch(
            `${API_URL}/api/products?search=${encodeURIComponent(keyword)}&limit=8&page=1`,
            { signal: controller.signal },
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

          const mapped = (fallbackData.items ?? []).map((item) => ({
            id: item.id,
            slug: item.slug,
            name: item.name,
            image_url: item.image_url,
            brand: item.brand,
            price: item.price,
          }));
          setSearchSuggestions(mapped);
        } else {
          throw new Error("Failed to fetch search suggestions");
        }
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

  const isSolid = !transparent || scrolled || mobileMenuOpen || searchOpen;
  const solidDark = isSolid && darkOnSolid;

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
    { label: "Giới Thiệu", href: "/about" },
    { label: "Liên Hệ", href: "/contact" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isSolid
          ? solidDark
            ? "bg-black/90 backdrop-blur-md"
            : "bg-background/92 backdrop-blur-md"
          : "bg-transparent border-b-0 shadow-none"
      }`}
    >
      <div className="container mx-auto px-4 md:px-8 flex items-center justify-between h-20 md:h-24 gap-3 md:gap-4 md:grid md:grid-cols-[1fr_auto_1fr]">
        {/* Left user (desktop) */}
        <div className="hidden md:flex items-center justify-start">
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
          className={`shrink-0 h-16 md:h-24 flex items-center md:justify-self-center font-display font-bold tracking-wide whitespace-nowrap ${
            solidDark ? "text-white" : isSolid ? "text-foreground" : "text-white"
          }`}
          aria-label="Tên cửa hàng"
        >
          {storeLogoUrl && !logoFailed ? (
            <img
              src={storeLogoUrl}
              alt={storeName}
              className="mt-4 h-16 w-auto scale-[1.75] object-contain md:mt-5 md:h-20 md:scale-[2.0]"
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
        <div className="flex items-center justify-end gap-1 shrink-0 md:justify-self-end">
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
            <span className="leading-none">Search</span>
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
                  placeholder="Tìm theo tên hoặc thương hiệu..."
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
                <p className={`px-1 text-xs ${searchHintTone}`}>Không có gợi ý phù hợp.</p>
              )}

              {searchSuggestions.length > 0 && (
                <div className="space-y-1">
                  {searchSuggestions.map((item) => (
                    <Link
                      key={item.id}
                      to={`/product/${item.slug}`}
                      onClick={() => setSearchOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors ${searchItemTone}`}
                    >
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-11 w-11 shrink-0 rounded-lg object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className={`truncate text-xs ${searchSubTone}`}>
                          {item.brand ? `${item.brand} · ${formatPrice(item.price)}` : formatPrice(item.price)}
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