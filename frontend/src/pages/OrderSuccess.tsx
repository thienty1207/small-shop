import { Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const OrderSuccess = () => {
  const orderCode = `HMH${Date.now().toString().slice(-6)}`;

  return (
    <div className="min-h-screen bg-surface-pink">
      <Header />
      <div className="container mx-auto px-4 md:px-8 py-16">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Đặt Hàng Thành Công!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Cảm ơn bạn đã đặt hàng. Mã đơn hàng của bạn là:
          </p>
          <p className="mt-2 text-lg font-bold text-foreground">{orderCode}</p>
          <div className="mt-8 flex flex-col gap-3">
            <Link to="/account" className="py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              Theo dõi đơn hàng
            </Link>
            <Link to="/products" className="py-3 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-secondary transition-colors">
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
