import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useShopSettingsCtx } from "@/contexts/ShopSettingsContext";
import type { CartItem } from "@/contexts/CartContext";
import { formatPrice } from "@/data/products";
import { API_BASE_URL } from "@/lib/api-base";
import { calculateShippingFee } from "@/lib/shipping";
import { toast } from "sonner";
import { Tag, Check } from "lucide-react";

const API_URL = API_BASE_URL;
const TOKEN_KEY = "auth_token";
const CF_SITE_KEY = "0x4AAAAAACl-DXPV4UZR7cmo";
const BUY_NOW_CHECKOUT_KEY = "buy_now_checkout_item";
const REQUIRE_TURNSTILE = import.meta.env.MODE !== "test";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
          theme?: "light" | "dark" | "auto";
        }
      ) => string;
      reset: (widgetId: string) => void;
    };
  }
}

interface OrderItemInput {
  product_id: string;
  product_name: string;
  product_image: string;
  variant?: string;
  quantity: number;
  unit_price: number;
}

const Checkout = () => {
  const { items, clearCart } = useCart();
  const { user } = useAuth();
  const { settings } = useShopSettingsCtx();
  const navigate = useNavigate();
  const location = useLocation();

  const isBuyNowMode = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("mode") === "buy-now";
  }, [location.search]);

  const buyNowItem = useMemo(() => {
    if (!isBuyNowMode) return null;

    const raw = sessionStorage.getItem(BUY_NOW_CHECKOUT_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as CartItem;
      if (!parsed?.product?.id || !parsed?.quantity) return null;
      return parsed;
    } catch {
      return null;
    }
  }, [isBuyNowMode]);

  useEffect(() => {
    if (!isBuyNowMode) return;
    if (buyNowItem) return;

    toast.error("Không tìm thấy sản phẩm Mua ngay. Vui lòng chọn lại sản phẩm.");
    navigate("/products", { replace: true });
  }, [buyNowItem, isBuyNowMode, navigate]);

  const checkoutItems = useMemo(
    () => (isBuyNowMode ? (buyNowItem ? [buyNowItem] : []) : items),
    [isBuyNowMode, buyNowItem, items],
  );

  const checkoutSubtotal = useMemo(
    () => checkoutItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [checkoutItems],
  );

  const shippingFee = calculateShippingFee(checkoutSubtotal, settings);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cfToken, setCfToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Coupon state
  const [couponCode, setCouponCode]       = useState("");
  const [couponApplied, setCouponApplied] = useState<{ code: string; coupon_type: string; value: number; discount_amt: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError]     = useState<string | null>(null);

  const discountAmt = couponApplied?.discount_amt ?? 0;
  const finalTotal  = checkoutSubtotal + shippingFee - discountAmt;

  const [form, setForm] = useState({
    customerName: user?.name ?? "",
    customerPhone: user?.phone ?? "",
    customerEmail: user?.email ?? "",
    address: user?.address ?? "",
    note: "",
  });

  useEffect(() => {
    const SCRIPT_ID = "cf-turnstile-script";

    const renderWidget = () => {
      if (!turnstileRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: CF_SITE_KEY,
        callback: (token: string) => setCfToken(token),
        "expired-callback": () => setCfToken(null),
        "error-callback": () => {
          setCfToken(null);
          toast.error("Cloudflare verification error. Please refresh.");
        },
        theme: "light",
      });
    };

    if (window.turnstile) {
      renderWidget();
      return;
    }

    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = renderWidget;
      document.head.appendChild(script);
    } else {
      document.getElementById(SCRIPT_ID)?.addEventListener("load", renderWidget);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await fetch(`${API_URL}/api/coupons/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), order_total: checkoutSubtotal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Mã không hợp lệ");
      setCouponApplied(data);
      toast.success(`Áp dụng thành công! Giảm ${formatPrice(data.discount_amt)}`);
    } catch (e) {
      setCouponError((e as Error).message);
      setCouponApplied(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (REQUIRE_TURNSTILE && !cfToken) {
      toast.error("Vui lòng xác thực Cloudflare trước khi đặt hàng.");
      return;
    }

    // Non-COD payment methods → redirect to 404 for now
    if (paymentMethod !== "cod") {
      navigate("/404");
      return;
    }

    setIsSubmitting(true);

    const orderItems: OrderItemInput[] = checkoutItems.map((item) => ({
      product_id: item.product.id,
      product_name: item.product.name,
      product_image: item.product.image,
      variant: item.variantLabel ?? item.variant,
      quantity: item.quantity,
      unit_price: item.product.price,
    }));

    const payload = {
      customer_name:  form.customerName,
      customer_email: form.customerEmail,
      customer_phone: form.customerPhone,
      address:        form.address,
      note:           form.note || undefined,
      payment_method: paymentMethod,
      items:          orderItems,
      coupon_code:    couponApplied?.code ?? null,
      discount_amt:   couponApplied?.discount_amt ?? 0,
      cf_turnstile_response: cfToken,
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
      if (isBuyNowMode) {
        sessionStorage.removeItem(BUY_NOW_CHECKOUT_KEY);
      } else {
        clearCart();
      }
      setCfToken(null);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
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
      <div className="flex-1 container mx-auto px-4 md:px-8 pt-24 md:pt-28 pb-8">
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
          <div className="bg-card rounded-xl border border-border p-6 h-fit sticky top-24 md:top-28">
            <h3 className="font-display text-base font-bold text-foreground mb-4">Đơn hàng</h3>
            <div className="space-y-3 mb-4">
              {checkoutItems.map((item) => (
                <div
                  key={`${item.product.id}-${item.variantLabel ?? item.variant ?? "default"}`}
                  className="flex items-center gap-3"
                >
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
              {/* Coupon input */}
              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <Tag size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className="w-full pl-7 pr-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground uppercase"
                    placeholder="Mã giảm giá"
                    value={couponCode}
                    onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null); }}
                    disabled={!!couponApplied}
                  />
                </div>
                {couponApplied ? (
                  <button
                    type="button"
                    className="px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => { setCouponApplied(null); setCouponCode(""); }}
                  >
                    Xoá
                  </button>
                ) : (
                  <button
                    type="button"
                    className="px-3 py-2 rounded-lg bg-foreground text-background text-xs font-medium hover:opacity-80 disabled:opacity-50"
                    disabled={couponLoading || !couponCode.trim()}
                    onClick={handleApplyCoupon}
                  >
                    {couponLoading ? "..." : "Áp dụng"}
                  </button>
                )}
              </div>
              {couponError && <p className="text-xs text-red-500 -mt-2 mb-1">{couponError}</p>}
              {couponApplied && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 -mt-2 mb-1">
                  <Check size={12} /> Mã <span className="font-mono font-semibold">{couponApplied.code}</span> — giảm {formatPrice(couponApplied.discount_amt)}
                </div>
              )}

              <div className="flex justify-between"><span className="text-muted-foreground">Tạm tính</span><span>{formatPrice(checkoutSubtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Vận chuyển</span><span>{shippingFee === 0 ? "Miễn phí" : formatPrice(shippingFee)}</span></div>
              {discountAmt > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Giảm giá</span><span>-{formatPrice(discountAmt)}</span>
                </div>
              )}
              <div className="border-t border-border pt-2 flex justify-between font-semibold">
                <span>Tổng cộng</span>
                <span className="text-price">{formatPrice(finalTotal)}</span>
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting || checkoutItems.length === 0 || (REQUIRE_TURNSTILE && !cfToken)}
              className="mt-4 w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Đang xử lý..." : "Đặt hàng"}
            </button>
            <div className="mt-3">
              <div ref={turnstileRef} />
              {REQUIRE_TURNSTILE && !cfToken && (
                <p className="mt-1 text-xs text-muted-foreground">
                  * Vui lòng xác thực Cloudflare trước khi đặt hàng.
                </p>
              )}
            </div>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
};

export default Checkout;
