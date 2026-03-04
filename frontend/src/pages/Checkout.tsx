import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatPrice } from "@/data/products";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const TOKEN_KEY = "auth_token";

interface OrderItemInput {
  product_id: string;
  product_name: string;
  product_image: string;
  variant?: string;
  quantity: number;
  unit_price: number;
}

const Checkout = () => {
  const { items, totalAmount, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const shippingFee = 30000;
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    customerName: user?.name ?? "",
    customerPhone: user?.phone ?? "",
    customerEmail: user?.email ?? "",
    address: user?.address ?? "",
    note: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Non-COD payment methods → redirect to 404 for now
    if (paymentMethod !== "cod") {
      navigate("/404");
      return;
    }

    setIsSubmitting(true);

    const orderItems: OrderItemInput[] = items.map((item) => ({
      product_id: item.product.id,
      product_name: item.product.name,
      product_image: item.product.image,
      variant: item.variant,
      quantity: item.quantity,
      unit_price: item.product.price,
    }));

    const payload = {
      customer_name: form.customerName,
      customer_email: form.customerEmail,
      customer_phone: form.customerPhone,
      address: form.address,
      note: form.note || undefined,
      payment_method: paymentMethod,
      items: orderItems,
    };

    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const res = await fetch(`${API_URL}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Đặt hàng thất bại");
      }

      const order = await res.json();
      clearCart();
      navigate("/order/success", { state: { orderCode: order.order_code } });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-pink flex flex-col">
      <Header />
      <div className="flex-1 container mx-auto px-4 md:px-8 pt-20 pb-8">
        <h1 className="font-display text-2xl font-bold text-foreground mb-6">Thanh Toán</h1>
        <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            {/* Shipping Info */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="font-display text-base font-bold text-foreground mb-4">Thông tin nhận hàng</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  required
                  name="customerName"
                  value={form.customerName}
                  onChange={handleChange}
                  placeholder="Họ và tên"
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground"
                />
                <input
                  required
                  name="customerPhone"
                  value={form.customerPhone}
                  onChange={handleChange}
                  placeholder="Số điện thoại"
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground"
                />
                <input
                  name="customerEmail"
                  value={form.customerEmail}
                  onChange={handleChange}
                  placeholder="Email"
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground md:col-span-2"
                />
                <input
                  required
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Địa chỉ"
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground md:col-span-2"
                />
                <textarea
                  name="note"
                  value={form.note}
                  onChange={handleChange}
                  placeholder="Ghi chú đơn hàng (tùy chọn)"
                  rows={2}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground md:col-span-2 resize-none"
                />
              </div>
            </div>

            {/* Payment */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="font-display text-base font-bold text-foreground mb-4">Phương thức thanh toán</h3>
              <div className="space-y-2">
                {[
                  { key: "cod", label: "Thanh toán khi nhận hàng (COD)" },
                  { key: "bank_transfer", label: "Chuyển khoản ngân hàng" },
                  { key: "wallet", label: "Ví điện tử (MoMo / ZaloPay)" },
                ].map((m) => (
                  <label key={m.key} className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-secondary transition-colors">
                    <input
                      type="radio"
                      name="payment"
                      value={m.key}
                      checked={paymentMethod === m.key}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="accent-primary"
                    />
                    <span className="text-sm text-foreground">{m.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-card rounded-xl border border-border p-6 h-fit sticky top-20">
            <h3 className="font-display text-base font-bold text-foreground mb-4">Đơn hàng</h3>
            <div className="space-y-3 mb-4">
              {items.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3">
                  <img src={item.product.image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                  </div>
                  <span className="text-sm text-price font-medium">{formatPrice(item.product.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Tạm tính</span><span>{formatPrice(totalAmount)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Vận chuyển</span><span>{shippingFee === 0 ? "Miễn phí" : formatPrice(shippingFee)}</span></div>
              <div className="border-t border-border pt-2 flex justify-between font-semibold">
                <span>Tổng cộng</span>
                <span className="text-price">{formatPrice(totalAmount + shippingFee)}</span>
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting || items.length === 0}
              className="mt-4 w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Đang xử lý..." : "Đặt hàng"}
            </button>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
};

export default Checkout;
