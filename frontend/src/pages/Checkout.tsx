import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/data/products";

const Checkout = () => {
  const { items, totalAmount, clearCart } = useCart();
  const navigate = useNavigate();
  const shippingFee = totalAmount > 500000 ? 0 : 30000;
  const [paymentMethod, setPaymentMethod] = useState("cod");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearCart();
    navigate("/order/success");
  };

  return (
    <div className="min-h-screen bg-surface-pink">
      <Header />
      <div className="container mx-auto px-4 md:px-8 py-8">
        <h1 className="font-display text-2xl font-bold text-foreground mb-6">Thanh Toán</h1>
        <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            {/* Shipping Info */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="font-display text-base font-bold text-foreground mb-4">Thông tin nhận hàng</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required placeholder="Họ và tên" className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground" />
                <input required placeholder="Số điện thoại" className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground" />
                <input placeholder="Email" className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground md:col-span-2" />
                <input required placeholder="Địa chỉ" className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground md:col-span-2" />
                <textarea placeholder="Ghi chú đơn hàng (tùy chọn)" rows={2} className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground md:col-span-2 resize-none" />
              </div>
            </div>

            {/* Payment */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="font-display text-base font-bold text-foreground mb-4">Phương thức thanh toán</h3>
              <div className="space-y-2">
                {[
                  { key: "cod", label: "Thanh toán khi nhận hàng (COD)" },
                  { key: "bank", label: "Chuyển khoản ngân hàng" },
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
            <button type="submit" className="mt-4 w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              Đặt hàng
            </button>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
};

export default Checkout;
