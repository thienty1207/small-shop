import { Link, useLocation } from "react-router-dom";
import { Search, ShoppingCart, User } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/contexts/CartContext";

const Header = () => {
  const location = useLocation();
  const { items } = useCart();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const navLinks = [
    { label: "Cửa Hàng", href: "/products" },
    { label: "Giới Thiệu", href: "/about" },
    { label: "Liên Hệ", href: "/contact" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      {/* Top row: logo + search + icons */}
      <div className="container mx-auto px-4 md:px-8 flex items-center justify-between h-16 gap-4">
        <Link to="/" className="font-display text-xl font-bold text-foreground shrink-0">
          Handmade Haven
        </Link>

        {/* Desktop search bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-auto relative">
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm..."
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Mobile search toggle */}
          <button
            onClick={() => setMobileSearchOpen((v) => !v)}
            className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Search size={20} />
          </button>
          <Link to="/login" className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <User size={20} />
          </Link>
          <Link to="/cart" className="p-2 text-muted-foreground hover:text-foreground transition-colors relative">
            <ShoppingCart size={20} />
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-xs w-4 h-4 rounded-full flex items-center justify-center font-medium">
                {totalItems}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile search bar (toggle) */}
      {mobileSearchOpen && (
        <div className="md:hidden px-4 pb-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm..."
              autoFocus
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Nav links - always visible */}
      <nav className="container mx-auto px-4 md:px-8 flex items-center gap-1 overflow-x-auto border-t border-border">
        {navLinks.map((link, i) => (
          <Link
            key={link.href}
            to={link.href}
            className={`${i === 0 ? "pl-0 pr-4" : "px-4"} py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
              location.pathname === link.href
                ? "text-foreground border-b-2 border-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
};

export default Header;
