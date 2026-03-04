import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

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
import OrderDetail from "./pages/client/OrderDetail";
import About from "./pages/client/About";
import Contact from "./pages/client/Contact";
import Policy from "./pages/client/Policy";
import NotFound from "./pages/client/NotFound";

// ── Admin pages ───────────────────────────────────────────────────────────────
import AdminDashboard from "./pages/admin/Dashboard";
import AdminProducts from "./pages/admin/Products";
import AdminOrders from "./pages/admin/Orders";
import AdminCustomers from "./pages/admin/Customers";

const queryClient = new QueryClient();

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

/** Redirects non-admin users — requires authentication AND role === "admin". */
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <p className="text-sm text-gray-400">Đang tải...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    sessionStorage.setItem("returnTo", location.pathname);
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <BrowserRouter>
          <CartProvider>
            <Toaster />
            <Sonner />
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
              <Route path="/account/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />

              {/* Admin routes — require role === "admin" */}
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="/admin/products" element={<AdminRoute><AdminProducts /></AdminRoute>} />
              <Route path="/admin/orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />
              <Route path="/admin/customers" element={<AdminRoute><AdminCustomers /></AdminRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </CartProvider>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
