import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const OrderSuccess = () => {
  const location = useLocation();
  const orderCode = (location.state as { orderCode?: string } | null)?.orderCode ?? "";
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Trigger entrance animation after mount
    const t = setTimeout(() => setShow(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-surface-pink flex flex-col">
      <Header />
      <div className="flex-1 container mx-auto px-4 md:px-8 pt-20 pb-10">
        <div
          className={`max-w-md mx-auto text-center transition-all duration-700 ${
            show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* Animated checkmark */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div
              className={`absolute inset-0 rounded-full bg-green-100 transition-transform duration-500 ${
                show ? "scale-100" : "scale-0"
              }`}
            />
            <div
              className={`absolute inset-0 flex items-center justify-center transition-all duration-500 delay-200 ${
                show ? "opacity-100 scale-100" : "opacity-0 scale-50"
              }`}
            >
              <CheckCircle size={48} className="text-green-600" />
            </div>
          </div>

          <h1 className="font-display text-2xl font-bold text-foreground">Đặt Hàng Thành Công! 🎉</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Cảm ơn bạn đã tin tưởng Handmade Haven. Đơn hàng đã được xác nhận và
            email xác nhận đã được gửi đến bạn.
          </p>

          {orderCode && (
            <div className="mt-6 p-4 bg-card rounded-xl border border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
                Mã đơn hàng
              </p>
              <p className="text-xl font-bold text-primary tracking-wider">{orderCode}</p>
            </div>
          )}

          <p className="mt-4 text-xs text-muted-foreground">
            Chúng tôi sẽ liên hệ xác nhận và giao hàng trong 1–3 ngày làm việc.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <Link
              to="/account"
              className="py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity text-center"
            >
              Theo dõi đơn hàng
            </Link>
            <Link
              to="/products"
              className="py-3 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-secondary transition-colors text-center"
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default OrderSuccess;
