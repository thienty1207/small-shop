import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import EmptyState from "@/components/shop/EmptyState";
import QuantityStepper from "@/components/shop/QuantityStepper";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/data/products";

const Cart = () => {
  const { items, updateQuantity, removeItem, totalAmount } = useCart();
  const shippingFee = totalAmount > 500000 ? 0 : 30000;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-surface-pink">
        <Header />
        <EmptyState
          title="Giỏ hàng trống"
          description="Bạn chưa thêm sản phẩm nào vào giỏ hàng."
          actionLabel="Tiếp tục mua sắm"
          actionHref="/products"
        />
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-pink">
      <Header />
      <div className="container mx-auto px-4 md:px-8 py-8">
        <h1 className="font-display text-2xl font-bold text-foreground mb-6">Giỏ Hàng</h1>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.product.id} className="flex gap-4 p-4 bg-card rounded-xl border border-border">
                <img src={item.product.image} alt={item.product.name} className="w-20 h-20 rounded-lg object-cover" />
                <div className="flex-1">
                  <Link to={`/product/${item.product.slug}`} className="text-sm font-medium text-foreground hover:text-primary">
                    {item.product.name}
                  </Link>
                  {item.variant && <p className="text-xs text-muted-foreground mt-0.5">{item.variant}</p>}
                  <p className="text-sm text-price font-semibold mt-1">{formatPrice(item.product.price)}</p>
                  <div className="flex items-center justify-between mt-2">
                    <QuantityStepper value={item.quantity} onChange={(q) => updateQuantity(item.product.id, q)} />
                    <button onClick={() => removeItem(item.product.id)} className="p-1 text-muted-foreground hover:text-destructive">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-card rounded-xl border border-border p-6 h-fit sticky top-20">
            <h3 className="font-display text-lg font-bold text-foreground mb-4">Tổng đơn hàng</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Tạm tính</span><span className="text-foreground">{formatPrice(totalAmount)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Phí vận chuyển</span><span className="text-foreground">{shippingFee === 0 ? "Miễn phí" : formatPrice(shippingFee)}</span></div>
              <div className="border-t border-border pt-2 flex justify-between font-semibold">
                <span className="text-foreground">Tổng cộng</span>
                <span className="text-price">{formatPrice(totalAmount + shippingFee)}</span>
              </div>
            </div>
            <Link
              to="/checkout"
              className="block mt-4 w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium text-center hover:opacity-90 transition-opacity"
            >
              Thanh toán
            </Link>
            <Link to="/products" className="block mt-2 text-center text-sm text-muted-foreground hover:text-foreground">
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Cart;
