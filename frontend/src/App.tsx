import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AdminAuthProvider, useAdminAuth } from "@/contexts/AdminAuthContext";
import { ShopSettingsProvider, useShopSettingsCtx } from "@/contexts/ShopSettingsContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { useApplyShopFont } from "@/hooks/useApplyShopFont";

// ── Client pages ──────────────────────────────────────────────────────────────
import Index from "./pages/client/Index";
import Products from "./pages/client/Products";
import ProductDetail from "./pages/client/ProductDetail";
import Cart from "./pages/client/Cart";
import Checkout from "./pages/client/Checkout";
import OrderSuccess from "./pages/client/OrderSuccess";
import Login from "./pages/client/Login";
import AuthCallback from "./pages/client/AuthCallback";
import Account from "./pages/client/Account";
import WishlistPage from "./pages/client/Wishlist";
import OrderDetail from "./pages/client/OrderDetail";
import About from "./pages/client/About";
import Contact from "./pages/client/Contact";
import Policy from "./pages/client/Policy";
import NotFound from "./pages/client/NotFound";

// ── Admin pages ───────────────────────────────────────────────────────────────
import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminProducts from "./pages/admin/Products";
import AdminOrders from "./pages/admin/Orders";
import AdminCustomers from "./pages/admin/Customers";
import AdminCategories from "./pages/admin/Categories";
import AdminStaff from "./pages/admin/Staff";
import AdminPermissions from "./pages/admin/Permissions";
import AdminSettingsAppearance from "./pages/admin/SettingsAppearance";
import AdminSettingsStore from "./pages/admin/SettingsStore";
import AdminSettingsShipping from "./pages/admin/SettingsShipping";
import AdminSettingsEmail from "./pages/admin/SettingsEmail";
import AdminInventory from "./pages/admin/Inventory";
import AdminReviews from "./pages/admin/Reviews";
import AdminCoupons from "./pages/admin/Coupons";

const queryClient = new QueryClient();

/** Applies the shop font from settings to the entire document. */
function FontApplier() {
  const { settings } = useShopSettingsCtx();
  useApplyShopFont(settings);
  return null;
}

/** Redirects unauthenticated users to /login, preserving the intended destination. */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-pink flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Đang tải...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Save the current path so Login can restore it after OAuth callback
    sessionStorage.setItem("returnTo", location.pathname + location.search);
    return <Navigate to="/login" state={{ returnTo: location.pathname + location.search }} replace />;
  }

  return <>{children}</>;
};

/** Redirects non-admin users — requires a valid admin JWT stored in AdminAuthContext. */
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdminAuthenticated, isAdminLoading } = useAdminAuth();

  if (isAdminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <p className="text-sm text-gray-500">Đang tải...</p>
      </div>
    );
  }

  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

/** Requires super_admin role. Redirects manager/staff to /admin dashboard. */
const SuperAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdminAuthenticated, isAdminLoading, adminUser } = useAdminAuth();

  if (isAdminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <p className="text-sm text-gray-500">Đang tải...</p>
      </div>
    );
  }

  if (!isAdminAuthenticated) return <Navigate to="/admin/login" replace />;
  if (adminUser?.role !== "super_admin") return <Navigate to="/admin" replace />;

  return <>{children}</>;
};

/** Requires manager or super_admin role. Redirects staff to /admin dashboard. */
const ManagerRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdminAuthenticated, isAdminLoading, adminUser } = useAdminAuth();

  if (isAdminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <p className="text-sm text-gray-500">Đang tải...</p>
      </div>
    );
  }

  if (!isAdminAuthenticated) return <Navigate to="/admin/login" replace />;
  if (adminUser?.role === "staff") return <Navigate to="/admin" replace />;

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <AdminAuthProvider>
          <ShopSettingsProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <WishlistProvider>
                <CartProvider>
                  <Toaster />
                  <Sonner />
                  <FontApplier />
                  <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/product/:slug" element={<ProductDetail />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/policy" element={<Policy />} />

                  {/* Protected routes — require login */}
                  <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
                  <Route path="/order/success" element={<ProtectedRoute><OrderSuccess /></ProtectedRoute>} />
                  <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
                  <Route path="/wishlist" element={<ProtectedRoute><WishlistPage /></ProtectedRoute>} />
                  <Route path="/account/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />

                  {/* Admin public */}
                  <Route path="/admin/login" element={<AdminLogin />} />

                  {/* Admin protected — require admin JWT */}
                  <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                  <Route path="/admin/products" element={<AdminRoute><AdminProducts /></AdminRoute>} />
                  <Route path="/admin/products/categories" element={<AdminRoute><AdminCategories /></AdminRoute>} />
                  <Route path="/admin/inventory" element={<AdminRoute><AdminInventory /></AdminRoute>} />
                  <Route path="/admin/orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />
                  <Route path="/admin/customers" element={<AdminRoute><AdminCustomers /></AdminRoute>} />
                  <Route path="/admin/users/customers" element={<AdminRoute><AdminCustomers /></AdminRoute>} />
                  <Route path="/admin/users/staff" element={<ManagerRoute><AdminStaff /></ManagerRoute>} />
                  <Route path="/admin/users/permissions" element={<SuperAdminRoute><AdminPermissions /></SuperAdminRoute>} />
                  <Route path="/admin/settings/appearance" element={<SuperAdminRoute><AdminSettingsAppearance /></SuperAdminRoute>} />
                  <Route path="/admin/settings/store" element={<SuperAdminRoute><AdminSettingsStore /></SuperAdminRoute>} />
                  <Route path="/admin/settings/shipping" element={<SuperAdminRoute><AdminSettingsShipping /></SuperAdminRoute>} />
                  <Route path="/admin/settings/email" element={<SuperAdminRoute><AdminSettingsEmail /></SuperAdminRoute>} />
                  <Route path="/admin/reviews" element={<ManagerRoute><AdminReviews /></ManagerRoute>} />
                  <Route path="/admin/coupons" element={<ManagerRoute><AdminCoupons /></ManagerRoute>} />

                  <Route path="*" element={<NotFound />} />
                  </Routes>
                </CartProvider>
              </WishlistProvider>
            </BrowserRouter>
          </ShopSettingsProvider>
        </AdminAuthProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
