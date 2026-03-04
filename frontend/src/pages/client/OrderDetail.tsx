import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ChevronRight, CheckCircle, Package, Truck, Home, Loader2 } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { formatPrice } from "@/data/products";

const TOKEN_KEY = "auth_token";
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

interface OrderItem {
  id: string;
  product_name: string;
  product_image: string | null;
  variant: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface OrderDetail {
  id: string;
  order_code: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  address: string;
  note: string | null;
  payment_method: string;
  status: string;
  subtotal: number;
  shipping_fee: number;
  total: number;
  created_at: string;
  items: OrderItem[];
}

const STATUS_STEPS = [
  { key: "pending", icon: CheckCircle, label: "Đã xác nhận" },
  { key: "confirmed", icon: Package, label: "Đang chuẩn bị" },
  { key: "shipping", icon: Truck, label: "Đang giao" },
  { key: "delivered", icon: Home, label: "Đã giao" },
];

const STATUS_INDEX: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  shipping: 2,
  delivered: 3,
  cancelled: -1,
};

const PAYMENT_LABEL: Record<string, string> = {
  cod: "Thanh toán khi nhận hàng (COD)",
  bank_transfer: "Chuyển khoản ngân hàng",
  wallet: "Ví điện tử",
};

const OrderDetail = () => {
  const { id } = useParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || !id) return;

    setIsLoading(true);
    fetch(`${API_BASE}/api/orders/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Không tìm thấy đơn hàng");
        return r.json();
      })
      .then(setOrder)
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [id]);

  const currentStep = order ? (STATUS_INDEX[order.status] ?? 0) : 0;

  return (
    <div className="min-h-screen bg-surface-pink flex flex-col">
      <Header />
      <div className="container mx-auto px-4 md:px-8 pt-20 pb-4">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/account" className="hover:text-foreground">Tài khoản</Link>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">
            {order ? `Đơn hàng #${order.order_code}` : `Đơn hàng #${id}`}
          </span>
        </nav>
      </div>

      <div className="flex-1 container mx-auto px-4 md:px-8 pb-16">
        {isLoading && (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-muted-foreground" size={32} />
          </div>
        )}

        {error && (
          <div className="text-center py-20 text-muted-foreground">{error}</div>
        )}

        {order && (
          <>
            <h1 className="font-display text-xl font-bold text-foreground mb-6">
              Chi tiết đơn hàng #{order.order_code}
            </h1>

            {/* Timeline */}
            <div className="bg-card rounded-xl border border-border p-6 mb-6">
              <div className="flex items-center justify-between">
                {STATUS_STEPS.map((step, i) => (
                  <div key={step.key} className="flex flex-col items-center text-center flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      i <= currentStep ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground"
                    }`}>
                      <step.icon size={18} />
                    </div>
                    <p className="text-xs font-medium text-foreground mt-2">{step.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Products */}
            <div className="bg-card rounded-xl border border-border p-6 mb-6">
              <h3 className="font-display text-base font-bold text-foreground mb-4">Sản phẩm</h3>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    {item.product_image && (
                      <img
                        src={item.product_image}
                        alt={item.product_name}
                        className="w-14 h-14 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{item.product_name}</p>
                      {item.variant && (
                        <p className="text-xs text-muted-foreground">{item.variant}</p>
                      )}
                      <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                    </div>
                    <span className="text-sm text-price font-medium">{formatPrice(item.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Info */}
            <div className="bg-card rounded-xl border border-border p-6 mb-6">
              <h3 className="font-display text-base font-bold text-foreground mb-4">Thông tin giao hàng</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p><span className="text-foreground font-medium">Người nhận:</span> {order.customer_name}</p>
                <p><span className="text-foreground font-medium">Điện thoại:</span> {order.customer_phone}</p>
                <p><span className="text-foreground font-medium">Email:</span> {order.customer_email}</p>
                <p><span className="text-foreground font-medium">Địa chỉ:</span> {order.address}</p>
                <p><span className="text-foreground font-medium">Thanh toán:</span> {PAYMENT_LABEL[order.payment_method] ?? order.payment_method}</p>
                {order.note && (
                  <p><span className="text-foreground font-medium">Ghi chú:</span> {order.note}</p>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tạm tính</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vận chuyển</span>
                  <span>{formatPrice(order.shipping_fee)}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between font-semibold">
                  <span>Tổng cộng</span>
                  <span className="text-price">{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default OrderDetail;
