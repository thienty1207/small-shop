import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  ChevronRight,
  ChevronDown,
  Store,
  Menu,
  Tag,
  UserCheck,
  Shield,
  Paintbrush,
  Building2,
  Truck,
  Mail,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

// ─── Nav tree structure ───────────────────────────────────────────────────────

interface NavChild {
  label: string;
  href:  string;
  icon:  React.ComponentType<{ className?: string }>;
}

interface NavItem {
  label:    string;
  icon:     React.ComponentType<{ className?: string }>;
  href?:    string;   // leaf item (no children)
  exact?:   boolean;  // match exactly, not prefix
  children?: NavChild[];
}

const NAV: NavItem[] = [
  {
    label: "Dashboard",
    icon:  LayoutDashboard,
    href:  "/admin",
    exact: true,
  },
  {
    label: "Quản lý Sản phẩm",
    icon:  Package,
    children: [
      { label: "Tất cả sản phẩm", href: "/admin/products",            icon: Package },
      { label: "Danh mục",        href: "/admin/products/categories",  icon: Tag },
    ],
  },
  {
    label: "Quản lý Đơn hàng",
    icon:  ShoppingCart,
    href:  "/admin/orders",
  },
  {
    label: "Người dùng",
    icon:  Users,
    children: [
      { label: "Khách hàng",  href: "/admin/users/customers",   icon: Users },
      { label: "Nhân viên",   href: "/admin/users/staff",       icon: UserCheck },
      { label: "Phân quyền",  href: "/admin/users/permissions", icon: Shield },
    ],
  },
  {
    label: "Cài đặt hệ thống",
    icon:  Settings,
    children: [
      { label: "Giao diện",          href: "/admin/settings/appearance",     icon: Paintbrush },
      { label: "Thông tin cửa hàng", href: "/admin/settings/store",          icon: Building2 },
      { label: "Vận chuyển & Phí",   href: "/admin/settings/shipping",       icon: Truck },
      { label: "Email template",     href: "/admin/settings/email",          icon: Mail },
    ],
  },
];

// ─── Helper — check if a nav group is "active" ───────────────────────────────
function groupIsActive(item: NavItem, pathname: string): boolean {
  if (item.href) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
  }
  return item.children?.some((c) => pathname.startsWith(c.href)) ?? false;
}

// ─── Role-based nav filter ────────────────────────────────────────────────────
// super_admin — sees everything
// manager     — no "Cài đặt hệ thống", no "Phân quyền"
// staff       — no "Cài đặt hệ thống", no "Nhân viên" submenu, no "Phân quyền"
function filterNav(nav: NavItem[], role: string | undefined): NavItem[] {
  return nav
    .map((item) => {
      // Hide the whole settings group from non-super_admin
      if (item.label === "Cài đặt hệ thống" && role !== "super_admin") return null;

      // For "Người dùng" group — filter children based on role
      if (item.label === "Người dùng" && item.children) {
        const children = item.children.filter((c) => {
          if (c.label === "Phân quyền" && role !== "super_admin") return false;
          if (c.label === "Nhân viên"  && role === "staff") return false;
          return true;
        });
        return { ...item, children };
      }

      return item;
    })
    .filter(Boolean) as NavItem[];
}

// ─── Sidebar component ────────────────────────────────────────────────────────

interface AdminLayoutProps {
  children:  React.ReactNode;
  title?:    string;
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const { adminUser, adminLogout } = useAdminAuth();
  const location   = useLocation();
  const navigate   = useNavigate();
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  // Track which collapsible groups are open (by label)
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const active = new Set<string>();
    NAV.forEach((item) => {
      if (item.children && groupIsActive(item, location.pathname)) {
        active.add(item.label);
      }
    });
    return active;
  });

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const handleLogout = () => {
    adminLogout();
    navigate("/admin/login");
  };

  // ── Sidebar inner content ─────────────────────────────────────────────────
  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <aside className="flex flex-col h-full w-64 bg-gray-950 border-r border-gray-800">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-800 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-rose-500 flex items-center justify-center">
          <Store className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white leading-tight">Small Shop</p>
          <p className="text-xs text-gray-500">Admin Panel</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
        {filterNav(NAV, adminUser?.role).map((item) => {
          const active = groupIsActive(item, location.pathname);

          // Leaf item (no children)
          if (!item.children) {
            return (
              <Link
                key={item.href}
                to={item.href!}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  active
                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white",
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
                {active && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
              </Link>
            );
          }

          // Group with children
          const isOpen = openGroups.has(item.label);
          return (
            <div key={item.label}>
              <button
                onClick={() => toggleGroup(item.label)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  active
                    ? "text-rose-400"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white",
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 transition-transform duration-200",
                    isOpen && "rotate-180",
                  )}
                />
              </button>

              {/* Children */}
              <div
                className={cn(
                  "overflow-hidden transition-all duration-200",
                  isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
                )}
              >
                <div className="ml-3 pl-3 border-l border-gray-800 mt-0.5 space-y-0.5 pb-1">
                  {item.children.map((child) => {
                    const childActive = location.pathname === child.href;
                    return (
                      <Link
                        key={child.href}
                        to={child.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-all",
                          childActive
                            ? "bg-rose-500/10 text-rose-400 font-medium"
                            : "text-gray-500 hover:bg-gray-800 hover:text-gray-200",
                        )}
                      >
                        <child.icon className="w-3.5 h-3.5 shrink-0" />
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Divider + store link + user */}
      <div className="px-3 py-3 border-t border-gray-800 space-y-1 shrink-0">
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
        >
          <Store className="w-4 h-4" />
          Về cửa hàng
        </Link>

        {/* User row */}
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-xs font-bold text-rose-400 shrink-0">
            {adminUser?.username?.[0]?.toUpperCase() ?? "A"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">
              {adminUser?.username ?? "Admin"}
            </p>
            <p className="text-xs text-gray-500 capitalize">
              {adminUser?.role === "super_admin" ? "Quản trị viên" : adminUser?.role === "manager" ? "Quản lý" : "Nhân viên"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Đăng xuất"
            className="text-gray-500 hover:text-rose-400 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <SidebarContent />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-10">
            <SidebarContent onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-4 px-6 py-4 bg-gray-950 border-b border-gray-800 shrink-0">
          <button
            className="lg:hidden text-gray-400 hover:text-white transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          {title && (
            <h1 className="text-base font-semibold text-white">{title}</h1>
          )}
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
