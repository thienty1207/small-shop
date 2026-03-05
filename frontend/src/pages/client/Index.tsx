import { Link } from "react-router-dom";
import { ChevronDown, ArrowRight, Star, Sparkles, Tag, Zap } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/shop/ProductCard";
import { useProducts, useCategories } from "@/hooks/useProducts";
import { useShopSettings } from "@/hooks/useShopSettings";
import heroBanner from "@/assets/hero-banner.jpg";
import candlesCat from "@/assets/categories/candles.jpg";
import cardsCat from "@/assets/categories/cards.jpg";
import totesCat from "@/assets/categories/totes.jpg";
import jewelryCat from "@/assets/categories/jewelry.jpg";

const categoryImages = [candlesCat, cardsCat, totesCat, jewelryCat];

// Fallback static slides (used when settings slides are not configured)
const staticSlides = [
  {
    img: heroBanner,
    tag: "Bộ sưu tập mới",
    title: "Quà Tặng\nThủ Công",
    sub: "Mỗi sản phẩm được tạo ra bằng tình yêu và sự tỉ mỉ",
    cta: "Khám phá ngay",
    href: "/products",
  },
  {
    img: candlesCat,
    tag: "Nến thơm cao cấp",
    title: "Hương Thơm\nDịu Nhẹ",
    sub: "Lan toả không gian với những mùi hương handmade đặc biệt",
    cta: "Xem nến thơm",
    href: "/products?category=nen-thom",
  },
  {
    img: jewelryCat,
    tag: "Trang sức handmade",
    title: "Vẻ Đẹp\nTừ Bàn Tay",
    sub: "Trang sức độc đáo, không có sản phẩm thứ hai giống nhau",
    cta: "Xem trang sức",
    href: "/products?category=trang-suc",
  },
];

const SLIDE_DURATION = 5000;

const staticReviews = [
  { id: "1", name: "Linh N.", rating: 5, content: "Sản phẩm rất xinh xắn, đóng gói cẩn thận, mình rất thích! Sẽ mua lại." },
  { id: "2", name: "Thu H.", rating: 5, content: "Nến thơm mùi dễ chịu, cháy đều không bị tắt. Tặng bạn bè ai cũng khen." },
  { id: "3", name: "Minh A.", rating: 5, content: "Vòng tay đẹp lắm, chất lượng vượt kỳ vọng. Shop giao hàng nhanh." },
  { id: "4", name: "Hoa T.", rating: 5, content: "Thiệp handmade rất tinh tế, bạn mình nhận được xúc động lắm." },
];

// Hook for intersection observer scroll-reveal
function useReveal() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("visible"); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

const Index = () => {
  const [slideIdx, setSlideIdx] = useState(0);
  const [progKey, setProgKey] = useState(0);
  const { settings } = useShopSettings();

  // Fetch products for each section separately
  const { products: allProducts, isLoading } = useProducts({ sort: "newest", limit: 20 });
  const { products: featuredProducts }        = useProducts({ sort: "best_selling", limit: 4 });
  const { categories }                        = useCategories();

  // Deal hời: products with original_price > price
  const dealProducts = allProducts
    .filter((p) => p.originalPrice != null && p.originalPrice > p.price)
    .slice(0, 4);

  // Dòng sản phẩm mới: newest 4
  const newProducts = allProducts.slice(0, 4);

  // Build hero slides from settings — fall back to static if none configured
  const heroSlides = (() => {
    const fromSettings = [1, 2, 3]
      .map((n) => ({
        img:   settings[`hero_slide_${n}_img`]      ?? "",
        tag:   settings[`hero_slide_${n}_title`]    ?? "",
        title: settings[`hero_slide_${n}_title`]    ?? "",
        sub:   settings[`hero_slide_${n}_subtitle`] ?? "",
        cta:   settings[`hero_slide_${n}_cta`]      || "Xem ngay",
        href:  settings[`hero_slide_${n}_href`]     || "/products",
      }))
      .filter((s) => s.img.length > 0);
    return fromSettings.length > 0 ? fromSettings : staticSlides;
  })();

  // Auto-advance slides
  const nextSlide = useCallback(() => {
    setSlideIdx((p) => (p + 1) % heroSlides.length);
    setProgKey((p) => p + 1);
  }, [heroSlides.length]);

  useEffect(() => {
    const t = setTimeout(nextSlide, SLIDE_DURATION);
    return () => clearTimeout(t);
  }, [slideIdx, nextSlide]);

  const goTo = (i: number) => { setSlideIdx(i); setProgKey((p) => p + 1); };

  // Scroll-reveal refs
  const featuredRef = useReveal() as React.RefObject<HTMLElement>;
  const dealRef     = useReveal() as React.RefObject<HTMLElement>;
  const newRef      = useReveal() as React.RefObject<HTMLElement>;
  const catRef      = useReveal() as React.RefObject<HTMLElement>;
  const reviewRef   = useReveal() as React.RefObject<HTMLElement>;
  const bannerRef   = useReveal() as React.RefObject<HTMLElement>;

  const slide = heroSlides[Math.min(slideIdx, heroSlides.length - 1)];

  return (
    <div className="min-h-screen bg-surface-pink flex flex-col">
      {/* Header is fixed, transparent over hero */}
      <Header transparent />

      {/*  Hero  full viewport, no top padding so it bleeds under fixed header */}
      <section className="relative w-full h-screen min-h-[560px] max-h-[860px] overflow-hidden">
        {/* Slides */}
        {heroSlides.map((s, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-700 ${
              i === slideIdx ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src={s.img}
              alt={s.title}
              className={`w-full h-full object-cover ${i === slideIdx ? "animate-hero-scale" : ""}`}
            />
          </div>
        ))}

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />

        {/* Content */}
        <div className="relative h-full flex flex-col justify-center px-6 md:px-16 lg:px-24 max-w-3xl">
          <span
            key={`tag-${slideIdx}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/80 uppercase tracking-widest mb-4 animate-fade-in"
          >
            <Sparkles size={12} className="text-primary" />
            {slide.tag}
          </span>

          <h1
            key={`h1-${slideIdx}`}
            className="font-display text-5xl md:text-7xl font-bold text-white leading-tight whitespace-pre-line animate-fade-up"
            style={{ animationDelay: "60ms" }}
          >
            {slide.title}
          </h1>

          <p
            key={`sub-${slideIdx}`}
            className="mt-4 text-base md:text-lg text-white/75 max-w-md animate-fade-up"
            style={{ animationDelay: "140ms" }}
          >
            {slide.sub}
          </p>

          <div
            key={`cta-${slideIdx}`}
            className="mt-8 flex items-center gap-4 animate-fade-up"
            style={{ animationDelay: "220ms" }}
          >
            <Link
              to={slide.href}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 hover:gap-3 transition-all shadow-lg shadow-primary/30"
            >
              {slide.cta} <ArrowRight size={15} />
            </Link>
            <Link to="/about" className="text-sm text-white/70 hover:text-white transition-colors underline underline-offset-4">
              Tìm hiểu thêm
            </Link>
          </div>
        </div>

        {/* Slide dots + progress */}
        <div className="absolute bottom-8 left-6 md:left-16 lg:left-24 flex items-center gap-3">
          {heroSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`transition-all duration-300 rounded-full ${
                i === slideIdx
                  ? "w-8 h-2 bg-white"
                  : "w-2 h-2 bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
          <div
            key={progKey}
            className="h-full bg-primary origin-left animate-slide-progress"
            style={{ animationDuration: `${SLIDE_DURATION}ms` }}
          />
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 right-6 md:right-16 text-white/50 flex flex-col items-center gap-1.5 animate-float-y">
          <span className="text-[10px] uppercase tracking-widest">Scroll</span>
          <ChevronDown size={16} />
        </div>
      </section>

      {/*  Stats bar  */}
      <section className="bg-foreground text-background">
        <div className="container mx-auto px-4 md:px-8 py-5 grid grid-cols-3 divide-x divide-background/10 text-center">
          {[
            { num: "2,000+", label: "Sản phẩm đã bán" },
            { num: "500+", label: "Khách hàng hài lòng" },
            { num: "100%", label: "Thủ công tự nhiên" },
          ].map((s) => (
            <div key={s.label} className="py-2">
              <p className="font-display text-xl md:text-2xl font-bold text-primary">{s.num}</p>
              <p className="text-xs text-background/50 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/*  Featured Products  */}
      <section
        ref={featuredRef as React.RefObject<HTMLDivElement>}
        className="reveal container mx-auto px-4 md:px-8 py-14"
      >
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">Handpicked for you</p>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">Sản Phẩm Nổi Bật</h2>
          </div>
          <Link
            to="/products?sort=best_selling"
            className="hidden md:inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:gap-3 transition-all"
          >
            Xem tất cả <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger">
          {featuredProducts.map((product) => (
            <div key={product.id} className="animate-fade-up">
              <ProductCard product={product} compact />
            </div>
          ))}
        </div>
        <div className="mt-5 text-center md:hidden">
          <Link to="/products" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
            Xem tất cả <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/*  Deal Hời  */}
      {dealProducts.length > 0 && (
        <section className="bg-rose-50/60 dark:bg-rose-950/10">
          <section
            ref={dealRef as React.RefObject<HTMLDivElement>}
            className="reveal container mx-auto px-4 md:px-8 py-14"
          >
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <Tag size={11} /> Giảm giá hôm nay
                </p>
                <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">Deal Hời</h2>
                <p className="text-sm text-muted-foreground mt-1">Sản phẩm đang được giảm giá — số lượng có hạn!</p>
              </div>
              <Link
                to="/products"
                className="hidden md:inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:gap-3 transition-all"
              >
                Xem tất cả <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger">
              {dealProducts.map((product) => (
                <div key={product.id} className="animate-fade-up">
                  <ProductCard product={product} compact />
                </div>
              ))}
            </div>
          </section>
        </section>
      )}

      {/*  Dòng Sản Phẩm Mới  */}
      <section
        ref={newRef as React.RefObject<HTMLDivElement>}
        className="reveal container mx-auto px-4 md:px-8 py-14"
      >
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Zap size={11} /> Mới cập nhật
            </p>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">Dòng Sản Phẩm Mới</h2>
            <p className="text-sm text-muted-foreground mt-1">Những sản phẩm vừa được thêm vào cửa hàng</p>
          </div>
          <Link
            to="/products?sort=newest"
            className="hidden md:inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:gap-3 transition-all"
          >
            Xem tất cả <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-muted animate-pulse rounded-2xl" />
              ))
            : newProducts.map((product) => (
                <div key={product.id} className="animate-fade-up">
                  <ProductCard product={product} compact />
                </div>
              ))
          }
        </div>
        <div className="mt-5 text-center md:hidden">
          <Link to="/products?sort=newest" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
            Xem tất cả <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/*  Promo Banner  */}
      <section
        ref={bannerRef as React.RefObject<HTMLDivElement>}
        className="reveal container mx-auto px-4 md:px-8 pb-16"
      >
        <div className="relative rounded-3xl overflow-hidden bg-foreground">
          <div className="absolute inset-0 opacity-20">
            <img src={totesCat} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="relative px-8 md:px-14 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Ưu đãi đặc biệt</p>
              <h3 className="font-display text-2xl md:text-3xl font-bold text-background leading-snug">
                Miễn phí vận chuyển<br />cho đơn từ 300.000đ
              </h3>
            </div>
            <Link
              to="/products"
              className="shrink-0 inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg"
            >
              Mua ngay <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/*  Categories  */}
      <section
        ref={catRef as React.RefObject<HTMLDivElement>}
        className="reveal container mx-auto px-4 md:px-8 pb-16"
      >
        <div className="text-center mb-10">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">Danh mục</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">Khám Phá Theo Chủ Đề</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 stagger">
          {(categories.length > 0
            ? categories.map((cat, i) => ({
                name: cat.name,
                href: `/products?category=${cat.slug}`,
                img: (cat.image && cat.image.startsWith("http")) ? cat.image : categoryImages[i % categoryImages.length],
              }))
            : ["Nến Thơm", "Thiệp", "Túi Vải", "Trang Sức"].map((name, i) => ({
                name,
                href: "/products",
                img: categoryImages[i],
              }))
          ).map((cat) => (
            <Link
              key={cat.href + cat.name}
              to={cat.href}
              className="group relative aspect-square rounded-2xl overflow-hidden animate-fade-up"
            >
              <img
                src={cat.img}
                alt={cat.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <div className="absolute inset-0 flex items-end p-4">
                <span className="text-white font-display text-base md:text-lg font-semibold leading-tight">
                  {cat.name}
                </span>
              </div>
              <div className="absolute inset-0 border-2 border-white/0 group-hover:border-white/30 rounded-2xl transition-all duration-300" />
            </Link>
          ))}
        </div>
      </section>

      {/*  Reviews  */}
      <section
        ref={reviewRef as React.RefObject<HTMLDivElement>}
        className="reveal bg-foreground/4 py-16"
      >
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">Khách hàng nói gì</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">Phản Hồi Thực Tế</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 stagger">
            {staticReviews.map((r) => (
              <div
                key={r.id}
                className="animate-fade-up bg-card rounded-2xl p-5 border border-border hover:border-primary/30 hover:shadow-md transition-all duration-300"
              >
                {/* Stars */}
                <div className="flex items-center gap-0.5 mb-3">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <Star key={i} size={13} className="fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed italic">"{r.content}"</p>
                <div className="mt-4 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <span className="font-display text-xs font-bold text-primary">{r.name[0]}</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{r.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;