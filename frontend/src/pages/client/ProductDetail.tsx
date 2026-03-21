import { useState, useMemo, useEffect } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronRight, Star, ShoppingBag, Zap, CheckCircle2,
  Droplets, Wind, Clock, BadgeCheck, Send, Heart
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/shop/ProductCard";
import QuantityStepper from "@/components/shop/QuantityStepper";
import { useProduct, useProducts, useRelatedProducts } from "@/hooks/useProducts";
import type { ProductVariant } from "@/hooks/useProducts";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { formatPrice } from "@/data/products";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

interface ReviewPublic {
  id: string; user_name: string; user_avatar: string | null;
  rating: number; comment: string | null; created_at: string;
}

function StarRow({ value, onChange, size = 20 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <Star key={s} size={size}
          onClick={() => onChange?.(s)}
          className={`${onChange ? "cursor-pointer" : ""} transition-colors ${
            s <= value ? "fill-amber-400 text-amber-400" : "text-gray-300"
          }`}
        />
      ))}
    </span>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pricePer10ml(price: number, ml: number): string {
  const per10 = Math.round((price / ml) * 10);
  return formatPrice(per10);
}


const isBestValueVariant = (v: ProductVariant, all: ProductVariant[]): boolean => {
  if (all.length < 2) return false;
  const byRatio = [...all].sort((a, b) => a.price / a.ml - b.price / b.ml);
  return byRatio[0].id === v.id;
};

// ─── Component ────────────────────────────────────────────────────────────────

const ProductDetail = () => {
  const { slug } = useParams();
  const { product, isLoading, error } = useProduct(slug ?? "");
  const { products: relatedFromApi, isLoading: relatedLoading } = useRelatedProducts(slug ?? "", 4);
  // Fallback: query by brand or category client-side when API returns nothing yet
  const { products: fallbackProducts } = useProducts({
    category: (!relatedLoading && relatedFromApi.length === 0 && product?.category) ? product.category : undefined,
    limit: 8,
  });
  const related = relatedFromApi.length > 0
    ? relatedFromApi
    : fallbackProducts.filter((p) => p.id !== product?.id).slice(0, 4);
  const { addItem, items } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("description");
  const [selectedImage, setSelectedImage] = useState(0);

  // Reviews state
  const [reviews, setReviews]               = useState<ReviewPublic[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [myRating, setMyRating]             = useState(5);
  const [myComment, setMyComment]           = useState("");
  const [submitingReview, setSubmitingReview] = useState(false);

  useEffect(() => {
    if (!product) return;
    setReviewsLoading(true);
    fetch(`${API_URL}/api/products/${product.id}/reviews?limit=20`)
      .then((r) => r.json())
      .then((d) => setReviews(d.items ?? []))
      .finally(() => setReviewsLoading(false));
  }, [product?.id]);

  const handleSubmitReview = async () => {
    if (!isAuthenticated) { toast.error("Đăng nhập để đánh giá"); return; }
    if (!product) return;
    setSubmitingReview(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${API_URL}/api/products/${product.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating: myRating, comment: myComment || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lỗi khi gửi đánh giá");
      setReviews((prev) => {
        const exists = prev.findIndex((r) => r.id === data.id);
        if (exists >= 0) { const next = [...prev]; next[exists] = data; return next; }
        return [data, ...prev];
      });
      setMyComment("");
      toast.success("Đánh giá của bạn đã được ghi nhận!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitingReview(false);
    }
  };

  // ── Derived state ──────────────────────────────────────────────────────────
  const variants = product?.variants ?? [];

  const selectedVariant: ProductVariant | null = useMemo(() => {
    if (!variants.length) return null;
    if (selectedVariantId) return variants.find((v) => v.id === selectedVariantId) ?? null;
    // Default priority: isDefault flag → exact 100ml → closest to 100ml (matching card display)
    return (
      variants.find((v) => v.isDefault) ??
      variants.find((v) => Number(v.ml) === 100) ??
      [...variants].sort((a, b) => Math.abs(Number(a.ml) - 100) - Math.abs(Number(b.ml) - 100))[0]
    );
  }, [variants, selectedVariantId]);

  const activePrice    = selectedVariant?.price    ?? product?.price    ?? 0;
  const activeOriginal = selectedVariant?.originalPrice ?? product?.originalPrice;
  const activeStock    = selectedVariant?.stock    ?? product?.stock    ?? 0;
  const selectedVariantLabel = selectedVariant ? `${selectedVariant.ml}ml` : undefined;
  const quantityAlreadyInCart = product
    ? items.find((item) =>
        item.product.id === product.id &&
        (item.variantLabel ?? item.variant ?? "") === (selectedVariantLabel ?? ""),
      )?.quantity ?? 0
    : 0;
  const availableToAdd = Math.max(0, activeStock - quantityAlreadyInCart);
  const activeOutOfStock = activeStock === 0;
  const activeLowStock   = !activeOutOfStock && activeStock < 5;

  useEffect(() => {
    if (availableToAdd <= 0) {
      setQuantity(1);
      return;
    }
    setQuantity((prev) => Math.min(prev, availableToAdd));
  }, [availableToAdd, selectedVariant?.id]);

  // ── Loading / error states ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <div className="flex-1 container mx-auto px-4 py-20 flex items-center justify-center pt-24">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Đang tải sản phẩm...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <div className="flex-1 container mx-auto px-4 py-20 text-center pt-24">
          <p className="text-muted-foreground">Không tìm thấy sản phẩm.</p>
          <Link to="/products" className="mt-4 inline-block text-sm underline">Xem tất cả sản phẩm</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
  const resolveImg = (url: string) => url && url.startsWith("/") ? `${API_URL}${url}` : url;

  const images = [
    resolveImg(product.image),
    ...(product.images?.filter((img) => img && img.length > 0).map(resolveImg) ?? []),
  ];

  const discountPct = activeOriginal && activeOriginal > activePrice
    ? Math.round((1 - activePrice / activeOriginal) * 100)
    : null;

  const handleAddToCart = async () => {
    if (activeOutOfStock || availableToAdd <= 0) return false;
    const result = await addItem(
      {
        ...product,
        price: activePrice,
        originalPrice: activeOriginal,
        stock: activeStock,
      },
      quantity,
      selectedVariant?.id,
      selectedVariantLabel,
    );
    if (!result.ok) {
      toast.error(result.error ?? "Khong the them vao gio hang");
      return false;
    }
    toast.success(
      selectedVariant
        ? `Đã thêm ${product.name} (${selectedVariant.ml}ml) vào giỏ hàng!`
        : "Đã thêm vào giỏ hàng!",
    );
    return true;
  };

  const handleBuyNow = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const added = await handleAddToCart();
    if (added) navigate("/cart");
  };

  const handleToggleWishlist = async () => {
    if (!isAuthenticated) {
      const returnTo = location.pathname + location.search;
      sessionStorage.setItem("returnTo", returnTo);
      navigate("/login", { state: { returnTo } });
      return;
    }

    try {
      const nowWishlisted = await toggleWishlist(product.id);
      toast.success(nowWishlisted ? "Đã thêm vào yêu thích" : "Đã bỏ khỏi yêu thích");
    } catch {
      toast.error("Không thể cập nhật yêu thích");
    }
  };

  const tabs = [
    { key: "description", label: "Mô tả" },
    { key: "notes",       label: "Hương điệu" },
    { key: "howto",       label: "Cách dùng" },
    { key: "reviews",     label: `Đánh giá${reviews.length ? ` (${reviews.length})` : ""}` },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      {/* Breadcrumb */}
      <div className="container mx-auto px-4 md:px-8 pt-20 pb-2">
        <nav className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">Trang chủ</Link>
          <ChevronRight size={12} />
          <Link to="/products" className="hover:text-foreground transition-colors">Nước hoa</Link>
          {product.brand && (
            <>
              <ChevronRight size={12} />
              <span className="hover:text-foreground transition-colors">{product.brand}</span>
            </>
          )}
          <ChevronRight size={12} />
          <span className="text-foreground font-medium truncate max-w-[200px]">{product.name}</span>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 container mx-auto px-4 md:px-8 pb-16 max-w-6xl">
        <div className="grid md:grid-cols-[42%_1fr] gap-6 md:gap-12 items-start">

          {/* ── Gallery ──────────────────────────────────────────────────── */}
          <div className="md:sticky md:top-6">
            <div className="aspect-[4/5] bg-foreground/[0.03] overflow-hidden relative group">
              <img
                src={images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
              />
              {discountPct && (
                <div className="absolute top-4 left-4 bg-foreground text-background text-xs font-bold px-2.5 py-1 tracking-wider">
                  -{discountPct}%
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 mt-3">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-16 h-16 border transition-colors overflow-hidden bg-foreground/[0.03] ${
                      i === selectedImage ? "border-foreground" : "border-foreground/10 hover:border-foreground/30"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Info ─────────────────────────────────────────────────────── */}
          <div className="py-2">
            {/* Brand + name header */}
            {product.brand && (
              <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-[0.15em] mb-1">
                {product.brand}
              </p>
            )}
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight leading-tight">
              {product.name}
            </h1>
            {product.concentration && (
              <p className="mt-1 text-sm text-muted-foreground font-medium">{product.concentration}</p>
            )}

            {/* Rating */}
            {product.rating && (
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={13}
                      className={i < Math.floor(product.rating!) ? "fill-foreground text-foreground" : "fill-foreground/15 text-foreground/15"}
                    />
                  ))}
                </div>
                {product.reviewCount ? (
                  <span className="text-xs text-muted-foreground">({product.reviewCount} đánh giá)</span>
                ) : null}
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-foreground/8 my-5" />

            {/* Price display */}
            <div>
              <div className="flex items-baseline gap-3">
                <span className="font-display text-2xl md:text-3xl font-bold text-foreground">
                  {formatPrice(activePrice)}
                </span>
                {activeOriginal && activeOriginal > activePrice && (
                  <span className="text-base text-muted-foreground line-through">
                    {formatPrice(activeOriginal)}
                  </span>
                )}
              </div>
              {selectedVariant && (
                <p className="text-xs text-muted-foreground mt-1">
                  {pricePer10ml(activePrice, selectedVariant.ml)} / 10ml
                </p>
              )}
            </div>

            {/* Stock status */}
            <div className="mt-3">
              {activeOutOfStock ? (
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  Hết hàng — tạm ngừng bán
                </div>
              ) : activeLowStock ? (
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Còn {activeStock} sản phẩm — đặt ngay kẻo hết!
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                  <CheckCircle2 size={12} />
                  Còn hàng
                </div>
              )}
            </div>

            {/* ── Size selector (ML variants) ──────────────────────────── */}
            {variants.length > 0 && (
              <div className="mt-6">
                <p className="text-sm font-semibold text-foreground mb-3">
                  Dung tích:{" "}
                  {selectedVariant && (
                    <span className="font-bold">{selectedVariant.ml}ml</span>
                  )}
                </p>
                {selectedVariant && (
                  <p className="mb-3 text-xs text-muted-foreground">
                    Con {selectedVariant.stock} chai cho dung tich nay. Hien da co {quantityAlreadyInCart} chai trong gio, con them toi da {availableToAdd} chai.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {variants.map((v) => {
                    const isSelected = selectedVariant?.id === v.id;
                    const isBest     = isBestValueVariant(v, variants);
                    const outOfStock = v.stock === 0;
                    return (
                      <button
                        key={v.id}
                        onClick={() => !outOfStock && setSelectedVariantId(v.id)}
                        disabled={outOfStock}
                        className={`relative min-w-[100px] px-4 py-3 border text-left transition-all ${
                          isSelected
                            ? "border-foreground bg-foreground text-background"
                            : outOfStock
                            ? "border-foreground/10 text-foreground/25 cursor-not-allowed"
                            : "border-foreground/15 hover:border-foreground/50 text-foreground"
                        }`}
                      >
                        {isBest && !outOfStock && (
                          <span className="absolute -top-2 left-2 text-[9px] font-bold uppercase tracking-wider bg-foreground text-background px-1.5 py-0.5">
                            Tiết kiệm nhất
                          </span>
                        )}
                        <div className="text-sm font-bold">{v.ml}ml</div>
                        <div className="text-xs mt-0.5 opacity-80">{formatPrice(v.price)}</div>
                        <div className="text-[10px] opacity-50 mt-0.5">{pricePer10ml(v.price, v.ml)} / 10ml</div>
                        {!outOfStock && (
                          <div className="text-[10px] mt-0.5 opacity-70">Con {v.stock} chai</div>
                        )}
                        {outOfStock && (
                          <div className="text-[10px] text-red-400 mt-0.5">Hết hàng</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Quantity + CTA ──────────────────────────────────────── */}
            <div className="mt-8 flex items-center gap-3">
              {activeOutOfStock ? (
                <div className="flex-1 py-4 bg-foreground/5 text-muted-foreground text-sm font-medium text-center select-none">
                  Hết hàng
                </div>
              ) : (
                <>
                  <QuantityStepper
                    value={quantity}
                    max={Math.max(1, availableToAdd)}
                    onChange={(value) => setQuantity(Math.min(value, Math.max(1, availableToAdd)))}
                  />
                  <button
                    onClick={() => { void handleAddToCart(); }}
                    disabled={availableToAdd <= 0}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-foreground text-background text-sm font-semibold hover:bg-foreground/85 transition-colors tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ShoppingBag size={16} />
                    Thêm vào giỏ
                  </button>
                </>
              )}
            </div>
            {!activeOutOfStock && (
              <Link
                to="/cart"
                onClick={handleBuyNow}
                className={`block mt-2 w-full py-4 border border-foreground text-foreground text-sm font-semibold text-center transition-colors tracking-wide ${
                  availableToAdd <= 0
                    ? "pointer-events-none cursor-not-allowed opacity-50"
                    : "hover:bg-foreground hover:text-background"
                }`}
              >
                Mua ngay
              </Link>
            )}

            <button
              type="button"
              onClick={handleToggleWishlist}
              className="mt-2 w-full py-3 border border-rose-200 text-rose-600 text-sm font-semibold text-center hover:bg-rose-50 transition-colors tracking-wide flex items-center justify-center gap-2"
            >
              <Heart size={15} className={isWishlisted(product.id) ? "fill-rose-500" : ""} />
              {isWishlisted(product.id) ? "Đã yêu thích" : "Thêm vào yêu thích"}
            </button>

            {/* ── Trust badges ──────────────────────────────────────────── */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
                { icon: BadgeCheck, text: "Hàng chính hãng 100%" },
                { icon: Wind,       text: "Miễn phí ship >300k" },
                { icon: Droplets,   text: "Nước hoa nhập khẩu" },
                { icon: Clock,      text: "Giao trong 1-3 ngày" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Icon size={13} className="shrink-0 text-foreground/50" />
                  {text}
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="border-t border-foreground/8 mt-8 pt-7">
              {/* Tabs */}
              <div className="flex gap-6 border-b border-foreground/8">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      activeTab === t.key
                        ? "border-foreground text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="mt-5 text-sm text-muted-foreground leading-relaxed">
                {activeTab === "description" && (
                  <p>{product.description || "Đang cập nhật mô tả sản phẩm."}</p>
                )}
                {activeTab === "notes" && (
                  <div className="space-y-3">
                    {(product.topNote || product.midNote || product.baseNote) ? (
                      <>
                        {product.topNote && (
                          <div className="flex items-start gap-3">
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-yellow-500 w-16 pt-0.5">Nốt đầu</span>
                            <span>{product.topNote}</span>
                          </div>
                        )}
                        {product.midNote && (
                          <div className="flex items-start gap-3">
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-rose-400 w-16 pt-0.5">Nốt giữa</span>
                            <span>{product.midNote}</span>
                          </div>
                        )}
                        {product.baseNote && (
                          <div className="flex items-start gap-3">
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-amber-700 w-16 pt-0.5">Nốt cuối</span>
                            <span>{product.baseNote}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <p>Thông tin hương điệu đang được cập nhật.</p>
                    )}
                  </div>
                )}
                {activeTab === "howto" && (
                  <div className="space-y-2">
                    <p>{product.care || "Xịt lên các điểm mạch như cổ tay, sau tai, khuỷu tay. Giữ chai cách da 15-20cm khi xịt. Bảo quản nơi thoáng mát, tránh ánh nắng trực tiếp."}</p>
                  </div>
                )}
                {activeTab === "reviews" && (
                  <div className="space-y-5">
                    {/* Write review — only for logged in users */}
                    {isAuthenticated ? (
                      <div className="border border-foreground/8 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Đánh giá của bạn</p>
                        <StarRow value={myRating} onChange={setMyRating} size={20} />
                        <textarea
                          rows={3}
                          className="w-full px-3 py-2.5 text-sm border border-foreground/10 rounded-lg bg-background text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-foreground/20"
                          placeholder="Chia sẻ cảm nhận của bạn về sản phẩm này..."
                          value={myComment}
                          onChange={(e) => setMyComment(e.target.value)}
                        />
                        <button
                          onClick={handleSubmitReview}
                          disabled={submitingReview}
                          className="flex items-center gap-2 px-4 py-2 bg-foreground text-background text-xs font-semibold rounded-lg hover:opacity-80 disabled:opacity-50 transition-opacity"
                        >
                          <Send size={12} />
                          {submitingReview ? "Đang gửi..." : "Gửi đánh giá"}
                        </button>

                      </div>
                    ) : (
                      <div className="border border-foreground/8 rounded-xl p-4 text-center">
                        <p className="text-sm text-muted-foreground">
                          <Link to="/login" className="text-foreground underline underline-offset-2">Đăng nhập</Link> để viết đánh giá.
                        </p>
                      </div>
                    )}

                    {/* Review list */}
                    {reviewsLoading ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="h-16 bg-foreground/5 rounded-lg animate-pulse" />
                        ))}
                      </div>
                    ) : reviews.length === 0 ? (
                      <p className="text-center text-muted-foreground py-6">Chưa có đánh giá nào. Hãy là người đầu tiên!</p>
                    ) : (
                      <div className="space-y-4">
                        {reviews.map((r) => (
                          <div key={r.id} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-foreground/10 overflow-hidden shrink-0">
                              {r.user_avatar
                                ? <img src={r.user_avatar} alt="" className="w-full h-full object-cover" />
                                : <span className="w-full h-full flex items-center justify-center text-xs font-bold text-foreground/50">{r.user_name[0]}</span>
                              }
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-foreground">{r.user_name}</span>
                                <StarRow value={r.rating} size={11} />
                                <span className="text-[10px] text-muted-foreground ml-auto">
                                  {new Date(r.created_at).toLocaleDateString("vi-VN")}
                                </span>
                              </div>
                              {r.comment && <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{r.comment}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Related products */}
        {(related.length > 0 || relatedLoading) && (
          <div className="mt-12 pt-8 border-t border-foreground/8">
            <div className="flex items-end justify-between mb-5">
              <div>
                <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-widest mb-1">Có thể bạn thích</p>
                <h2 className="font-display text-lg md:text-xl font-bold text-foreground tracking-tight">
                  {product.brand && related.some((p) => p.brand === product.brand)
                    ? `Cùng Thương Hiệu ${product.brand}`
                    : "Sản Phẩm Tương Tự"}
                </h2>
              </div>
              <Link to="/products" className="hidden md:inline-flex items-center gap-1.5 text-sm text-foreground/50 hover:text-foreground transition-colors">
                Xem thêm <Zap size={13} />
              </Link>
            </div>
            {relatedLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="aspect-[3/4] bg-foreground/5 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {related.map((p) => (
                  <ProductCard key={p.id} product={p} compact />
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

export default ProductDetail;

