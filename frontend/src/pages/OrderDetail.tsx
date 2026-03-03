import { useParams, Link } from "react-router-dom";
import { ChevronRight, CheckCircle, Package, Truck, Home } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { formatPrice } from "@/data/products";
import { products } from "@/data/products";

const steps = [
  { icon: CheckCircle, label: "Đã xác nhận", time: "15/12/2024 10:00" },
  { icon: Package, label: "Đang chuẩn bị", time: "15/12/2024 14:00" },
  { icon: Truck, label: "Đang giao", time: "16/12/2024 09:00" },
  { icon: Home, label: "Đã giao", time: "17/12/2024 15:00" },
];

const OrderDetail = () => {
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-surface-pink">
      <Header />
      <div className="container mx-auto px-4 md:px-8 py-4">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/account" className="hover:text-foreground">Tài khoản</Link>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">Đơn hàng #{id}</span>
        </nav>
      </div>

      <div className="container mx-auto px-4 md:px-8 pb-16">
        <h1 className="font-display text-xl font-bold text-foreground mb-6">Chi tiết đơn hàng #{id}</h1>

        {/* Timeline */}
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <div className="flex items-center justify-between">
            {steps.map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${i <= 2 ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground"}`}>
                  <step.icon size={18} />
                </div>
                <p className="text-xs font-medium text-foreground mt-2">{step.label}</p>
                <p className="text-xs text-muted-foreground">{step.time}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Products */}
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <h3 className="font-display text-base font-bold text-foreground mb-4">Sản phẩm</h3>
          <div className="space-y-3">
            {products.slice(0, 2).map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <img src={p.image} alt={p.name} className="w-14 h-14 rounded-lg object-cover" />
                <div className="flex-1">
                  <p className="text-sm text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">x1</p>
                </div>
                <span className="text-sm text-price font-medium">{formatPrice(p.price)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Tạm tính</span><span>{formatPrice(230000)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Vận chuyển</span><span>{formatPrice(30000)}</span></div>
            <div className="border-t border-border pt-2 flex justify-between font-semibold">
              <span>Tổng cộng</span><span className="text-price">{formatPrice(260000)}</span>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default OrderDetail;
