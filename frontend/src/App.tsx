import { lazy, Suspense } from "react";
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

const Index = lazy(() => import("./pages/client/Index"));
const Products = lazy(() => import("./pages/client/Products"));
const ProductDetail = lazy(() => import("./pages/client/ProductDetail"));
const Cart = lazy(() => import("./pages/client/Cart"));
const Checkout = lazy(() => import("./pages/client/Checkout"));
const OrderSuccess = lazy(() => import("./pages/client/OrderSuccess"));
const Login = lazy(() => import("./pages/client/Login"));
const AuthCallback = lazy(() => import("./pages/client/AuthCallback"));
const Account = lazy(() => import("./pages/client/Account"));
const WishlistPage = lazy(() => import("./pages/client/Wishlist"));
const OrderDetail = lazy(() => import("./pages/client/OrderDetail"));
const About = lazy(() => import("./pages/client/About"));
const Contact = lazy(() => import("./pages/client/Contact"));
const Policy = lazy(() => import("./pages/client/Policy"));
const BlogList = lazy(() => import("./pages/client/BlogList"));
const BlogDetail = lazy(() => import("./pages/client/BlogDetail"));
const NotFound = lazy(() => import("./pages/client/NotFound"));

const AdminLogin = lazy(() => import("./pages/admin/Login"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminProducts = lazy(() => import("./pages/admin/Products"));
const AdminOrders = lazy(() => import("./pages/admin/Orders"));
const AdminCustomers = lazy(() => import("./pages/admin/Customers"));
const AdminCategories = lazy(() => import("./pages/admin/Categories"));
const AdminStaff = lazy(() => import("./pages/admin/Staff"));
const AdminPermissions = lazy(() => import("./pages/admin/Permissions"));
const AdminSettingsAppearance = lazy(() => import("./pages/admin/SettingsAppearance"));
const AdminSettingsStore = lazy(() => import("./pages/admin/SettingsStore"));
const AdminSettingsShipping = lazy(() => import("./pages/admin/SettingsShipping"));
const AdminSettingsEmail = lazy(() => import("./pages/admin/SettingsEmail"));
const AdminSettingsNotifications = lazy(() => import("./pages/admin/SettingsNotifications"));
const AdminReviews = lazy(() => import("./pages/admin/Reviews"));
const AdminCoupons = lazy(() => import("./pages/admin/Coupons"));
const AdminBlog = lazy(() => import("./pages/admin/Blog"));
const AdminBlogTags = lazy(() => import("./pages/admin/BlogTags"));
const AdminBlogReviews = lazy(() => import("./pages/admin/BlogReviews"));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Đang tải...</p>
    </div>
  );
}

function FontApplier() {
  const { settings } = useShopSettingsCtx();
  useApplyShopFont(settings);
  return null;
}

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    sessionStorage.setItem("returnTo", location.pathname + location.search);
    return <Navigate to="/login" state={{ returnTo: location.pathname + location.search }} replace />;
  }

  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdminAuthenticated, isAdminLoading } = useAdminAuth();

  if (isAdminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <p className="text-sm text-gray-500">Đang tải...</p>
      </div>
    );
  }

  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

const SuperAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdminAuthenticated, isAdminLoading, adminUser } = useAdminAuth();

  if (isAdminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <p className="text-sm text-gray-500">Đang tải...</p>
      </div>
    );
  }

  if (!isAdminAuthenticated) return <Navigate to="/admin/login" replace />;
  if (adminUser?.role !== "super_admin") return <Navigate to="/admin" replace />;

  return <>{children}</>;
};

const ManagerRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdminAuthenticated, isAdminLoading, adminUser } = useAdminAuth();

  if (isAdminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
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
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/products" element={<Products />} />
                      <Route path="/product/:slug" element={<ProductDetail />} />
                      <Route path="/cart" element={<Cart />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/auth/callback" element={<AuthCallback />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/policy" element={<Policy />} />
                      <Route path="/blog" element={<BlogList />} />
                      <Route path="/blog/:slug" element={<BlogDetail />} />

                      <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
                      <Route path="/order/success" element={<ProtectedRoute><OrderSuccess /></ProtectedRoute>} />
                      <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
                      <Route path="/wishlist" element={<ProtectedRoute><WishlistPage /></ProtectedRoute>} />
                      <Route path="/account/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />

                      <Route path="/admin/login" element={<AdminLogin />} />

                      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                      <Route path="/admin/products" element={<AdminRoute><AdminProducts /></AdminRoute>} />
                      <Route path="/admin/products/categories" element={<AdminRoute><AdminCategories /></AdminRoute>} />
                      <Route path="/admin/inventory" element={<Navigate to="/admin/products" replace />} />
                      <Route path="/admin/orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />
                      <Route path="/admin/customers" element={<AdminRoute><AdminCustomers /></AdminRoute>} />
                      <Route path="/admin/users/customers" element={<AdminRoute><AdminCustomers /></AdminRoute>} />
                      <Route path="/admin/users/staff" element={<ManagerRoute><AdminStaff /></ManagerRoute>} />
                      <Route path="/admin/users/permissions" element={<SuperAdminRoute><AdminPermissions /></SuperAdminRoute>} />
                      <Route path="/admin/settings/appearance" element={<SuperAdminRoute><AdminSettingsAppearance /></SuperAdminRoute>} />
                      <Route path="/admin/settings/store" element={<SuperAdminRoute><AdminSettingsStore /></SuperAdminRoute>} />
                      <Route path="/admin/settings/shipping" element={<SuperAdminRoute><AdminSettingsShipping /></SuperAdminRoute>} />
                      <Route path="/admin/settings/email" element={<SuperAdminRoute><AdminSettingsEmail /></SuperAdminRoute>} />
                      <Route path="/admin/settings/notifications" element={<SuperAdminRoute><AdminSettingsNotifications /></SuperAdminRoute>} />
                      <Route path="/admin/reviews" element={<ManagerRoute><AdminReviews /></ManagerRoute>} />
                      <Route path="/admin/coupons" element={<ManagerRoute><AdminCoupons /></ManagerRoute>} />
                      <Route path="/admin/blog" element={<ManagerRoute><AdminBlog /></ManagerRoute>} />
                      <Route path="/admin/blog/tags" element={<ManagerRoute><AdminBlogTags /></ManagerRoute>} />
                      <Route path="/admin/blog/reviews" element={<ManagerRoute><AdminBlogReviews /></ManagerRoute>} />

                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
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
