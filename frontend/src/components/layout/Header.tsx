import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, User, LogOut, Package, Settings, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  /** When true, header starts transparent and becomes solid on scroll */
  transparent?: boolean;
}

const Header = ({ transparent = false }: HeaderProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { items } = useCart();
  const { user, isAuthenticated, logout } = useAuth();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!transparent) return;
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [transparent]);

  const handleLoginClick = () => {
    const returnTo = location.pathname + location.search;
    if (returnTo !== "/login" && returnTo !== "/register") {
      sessionStorage.setItem("returnTo", returnTo);
    }
    navigate("/login", { state: { returnTo } });
  };

  const navLinks = [
    { label: "Cửa Hàng", href: "/products" },
    { label: "Giới Thiệu", href: "/about" },
    { label: "Liên Hệ", href: "/contact" },
  ];

  const isSolid = !transparent || scrolled;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isSolid
          ? "bg-background/95 backdrop-blur-md border-b border-border shadow-sm"
          : "bg-transparent border-b border-white/10"
      }`}
    >
      <div className="container mx-auto px-4 md:px-8 flex items-center justify-between h-16 gap-4">
        {/* Logo */}
        <Link
          to="/"
          className={`font-display text-xl font-bold shrink-0 transition-colors ${
            isSolid ? "text-foreground" : "text-white"
          }`}
        >
          Handmade Haven
        </Link>

        {/* Desktop nav links (centered) */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                location.pathname === link.href
                  ? isSolid
                    ? "text-primary bg-primary/8"
                    : "text-white bg-white/15"
                  : isSolid
                  ? "text-muted-foreground hover:text-foreground hover:bg-muted"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop search */}
        <div className="hidden md:flex flex-1 max-w-xs mx-auto relative">
          <input
            type="text"
            placeholder="Tìm kiếm..."
            className={`w-full h-9 pl-9 pr-4 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
              isSolid
                ? "border border-border bg-muted/60 text-foreground placeholder:text-muted-foreground focus:ring-primary/30"
                : "border border-white/20 bg-white/10 text-white placeholder:text-white/60 focus:ring-white/30 focus:bg-white/15"
            }`}
          />
          <Search
            size={15}
            className={`absolute left-3 top-1/2 -translate-y-1/2 ${
              isSolid ? "text-muted-foreground" : "text-white/60"
            }`}
          />
        </div>

        {/* Right icons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Mobile search */}
          <button
            onClick={() => setMobileSearchOpen((v) => !v)}
            className={`md:hidden p-2 rounded-lg transition-colors ${
              isSolid ? "text-muted-foreground hover:text-foreground hover:bg-muted" : "text-white/80 hover:text-white hover:bg-white/10"
            }`}
          >
            <Search size={19} />
          </button>

          {/* User */}
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`flex items-center gap-2 p-1.5 rounded-xl transition-colors outline-none ${
                  isSolid ? "hover:bg-muted" : "hover:bg-white/10"
                }`}>
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name} className="w-7 h-7 rounded-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                      isSolid ? "bg-primary/15 text-primary" : "bg-white/20 text-white"
                    }`}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className={`hidden lg:block text-sm font-medium max-w-[110px] truncate ${
                    isSolid ? "text-foreground" : "text-white"
                  }`}>
                    {user.name}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
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
              className={`p-2 rounded-lg transition-colors ${
                isSolid ? "text-muted-foreground hover:text-foreground hover:bg-muted" : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <User size={19} />
            </button>
          )}

          {/* Cart */}
          <Link
            to="/cart"
            className={`p-2 rounded-lg transition-colors relative ${
              isSolid ? "text-muted-foreground hover:text-foreground hover:bg-muted" : "text-white/80 hover:text-white hover:bg-white/10"
            }`}
          >
            <ShoppingCart size={19} />
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-semibold">
                {totalItems}
              </span>
            )}
          </Link>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            className={`md:hidden p-2 rounded-lg transition-colors ${
              isSolid ? "text-muted-foreground hover:text-foreground hover:bg-muted" : "text-white/80 hover:text-white hover:bg-white/10"
            }`}
          >
            {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      {/* Mobile search bar */}
      {mobileSearchOpen && (
        <div className="md:hidden px-4 pb-3 pt-1 bg-background/95 backdrop-blur-md border-b border-border">
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm..."
              autoFocus
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-muted/60 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-background/98 backdrop-blur-md border-b border-border px-4 py-3 flex flex-col gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                location.pathname === link.href
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
};

export default Header;