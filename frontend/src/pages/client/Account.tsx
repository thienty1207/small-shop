import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/shop/ProductCard";
import { formatPrice, type Product } from "@/data/products";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const TOKEN_KEY = "auth_token";
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

interface OrderListItem {
  id: string;
  order_code: string;
  status: string;
  total: number;
  items_count: number;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Đang xử lý",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã huỷ",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  shipping: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

const Account = () => {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab");
  const initialTab = tab === "orders" || tab === "wishlist" ? tab : "profile";
  const [activeTab, setActiveTab] = useState(initialTab);

  const { user, updateProfile } = useAuth();
  const { fetchWishlistProducts } = useWishlist();

  const [phone, setPhone] = useState(user?.phone ?? "");
  const [address, setAddress] = useState(user?.address ?? "");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  useEffect(() => {
    setPhone(user?.phone ?? "");
    setAddress(user?.address ?? "");
  }, [user?.phone, user?.address]);

  useEffect(() => {
    if (activeTab !== "orders") return;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    setOrdersLoading(true);
    fetch(`${API_BASE}/api/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "wishlist") return;

    setWishlistLoading(true);
    fetchWishlistProducts()
      .then(setWishlist)
      .catch(() => {
        setWishlist([]);
        toast.error("Không thể tải danh sách yêu thích");
      })
      .finally(() => setWishlistLoading(false));
  }, [activeTab, fetchWishlistProducts]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      await updateProfile({ phone: phone || null, address: address || null });
      setSaveMsg("Đã lưu thành công!");
    } catch {
      setSaveMsg("Lưu thất bại, thử lại sau.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  };

  const tabs = [
    { key: "profile", label: "Thông tin" },
    { key: "orders", label: "Đơn hàng" },
    { key: "wishlist", label: "Yêu thích" },
  ];

  return (
    <div className="min-h-screen bg-surface-pink flex flex-col">
      <Header />
      <div className="flex-1 container mx-auto px-4 md:px-8 pt-24 md:pt-28 pb-8">
        <h1 className="font-display text-2xl font-bold text-foreground mb-6">Tài Khoản</h1>

        <div className="flex gap-4 border-b border-border mb-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === "profile" && (
          <div className="max-w-lg mx-auto bg-card rounded-xl border border-border p-6 space-y-4">
            {user && (
              <div className="flex items-center gap-3 pb-2">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="w-12 h-12 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {user.role === "admin" ? "Quản trị viên" : "Khách hàng"}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Họ tên</label>
              <input
                readOnly
                value={user?.name ?? ""}
                className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-muted/50 text-muted-foreground cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground/70">Đồng bộ từ Google, không thể chỉnh sửa</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</label>
              <input
                readOnly
                value={user?.email ?? ""}
                className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-muted/50 text-muted-foreground cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground/70">Đồng bộ từ Google, không thể chỉnh sửa</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Số điện thoại</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ví dụ: 0901 234 567"
                className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Địa chỉ giao hàng</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                placeholder="Ví dụ: 123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM"
                className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
              {saveMsg && (
                <span className={`text-sm ${saveMsg.includes("thành công") ? "text-green-600" : "text-destructive"}`}>
                  {saveMsg}
                </span>
              )}
            </div>
          </div>
        )}

        {activeTab === "orders" && (
          <div className="max-w-lg mx-auto space-y-4">
            {ordersLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-muted-foreground" size={28} />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">Bạn chưa có đơn hàng nào.</p>
                <Link to="/products" className="mt-3 inline-block text-sm text-primary hover:underline">
                  Mua sắm ngay
                </Link>
              </div>
            ) : (
              orders.map((order) => (
                <Link
                  key={order.id}
                  to={`/account/orders/${order.id}`}
                  className="block bg-card rounded-xl border border-border p-4 hover:border-primary transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">#{order.order_code}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(order.created_at)} · {order.items_count} sản phẩm
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-md ${
                          STATUS_STYLE[order.status] ?? "bg-muted text-muted-foreground"
                        }`}
                      >
                        {STATUS_LABEL[order.status] ?? order.status}
                      </span>
                      <p className="text-sm text-price font-semibold mt-1">{formatPrice(order.total)}</p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {activeTab === "wishlist" && (
          <div className="max-w-5xl mx-auto">
            {wishlistLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-muted-foreground" size={28} />
              </div>
            ) : wishlist.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">Bạn chưa có sản phẩm yêu thích nào.</p>
                <Link to="/products" className="mt-3 inline-block text-sm text-primary hover:underline">
                  Khám phá sản phẩm
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
                {wishlist.map((product) => (
                  <ProductCard key={product.id} product={product} compact />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Account;

