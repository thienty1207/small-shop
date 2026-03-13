import { Link } from "react-router-dom";
import { ChevronDown, ArrowRight, Star, Sparkles, Tag, Zap } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/shop/ProductCard";
import { useProducts, useCategories } from "@/hooks/useProducts";
import { useShopSettingsCtx } from "@/contexts/ShopSettingsContext";
import type { Product } from "@/data/products";
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
  const { settings } = useShopSettingsCtx();

  // Fetch products for each badge-driven section
  const { products: featuredBadge }         = useProducts({ badge: "Nổi Bật", limit: 4 });
  const { products: dealBadge }             = useProducts({ badge: "Giảm Giá", limit: 4 });
  const { products: newBadge, isLoading }   = useProducts({ badge: "Mới", limit: 4 });
  // Fallback pool: all products sorted newest — used when badge sections are empty
  const { products: allProducts }           = useProducts({ sort: "newest", limit: 20 });
  const { products: bestSelling }           = useProducts({ sort: "best_selling", limit: 4 });
  const { categories }                      = useCategories();

  // Sections: prefer badge-tagged products. Fallbacks explicitly filter out products with conflicting badges
  // to prevent a "Nổi Bật" product from appearing in "Deal Hời" or "Mới" sections erroneously.
  const featuredProducts = featuredBadge.length > 0 ? featuredBadge : bestSelling;
  
  // Stricter filter: exclude anything that has the "Nổi Bật" badge from Deal/New if we are using fallbacks.
  const isFeatured = (p: Product) => p.badge?.toLowerCase().includes("nổi bật") || p.badge?.includes("Ná»i");
  
  const dealCandidates = allProducts.filter(p => !isFeatured(p) && p.originalPrice && p.originalPrice > p.price);
  const dealProducts = dealBadge.length > 0 ? dealBadge : dealCandidates.slice(0, 6);
    
  const newCandidates = allProducts.filter(p => !isFeatured(p) && (!p.badge || !p.badge.toLowerCase().includes("giảm")));
  const newProducts = newBadge.length > 0 ? newBadge : newCandidates.slice(0, 6);

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
  const newRef      = useReveal() as React.RefObject<HTMLElement>;
  const catRef      = useReveal() as React.RefObject<HTMLElement>;
  const reviewRef   = useReveal() as React.RefObject<HTMLElement>;
  const bannerRef   = useReveal() as React.RefObject<HTMLElement>;

  const slide = heroSlides[Math.min(slideIdx, heroSlides.length - 1)];

  return (
    <div className="min-h-screen bg-surface-pink flex flex-col">
      {/* Header is fixed, transparent over hero */}
      <Header transparent />

      {/*  Hero — image bleeds full width, content aligns with container  */}
      <section className="relative w-full h-screen min-h-[520px] overflow-hidden">
        {/* Slides */}
        {heroSlides.map((s, i) => (
          <div
            key={i}
            aria-hidden={i !== slideIdx}
            className={`absolute inset-0 transition-opacity duration-700 ${
              i === slideIdx ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src={s.img}
              alt={s.title}
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
              className={`hero-img ${i === slideIdx ? "animate-hero-scale" : ""}`}
            />
          </div>
        ))}

        {/* Gradient overlays — deeper, dramatic B&W cinematic feel */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        {/* Content — uses container so text aligns with header & sections */}
        <div className="relative h-full container mx-auto px-4 md:px-8 flex flex-col justify-center">
          <div className="max-w-lg">
            <span
              key={`tag-${slideIdx}`}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/80 uppercase tracking-widest mb-2 animate-fade-in"
            >
              <Sparkles size={12} className="text-primary" />
              {slide.tag}
            </span>

            <h1
              key={`h1-${slideIdx}`}
              className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight whitespace-pre-line animate-fade-up"
              style={{ animationDelay: "60ms" }}
            >
              {slide.title}
            </h1>

            <p
              key={`sub-${slideIdx}`}
              className="mt-2 text-sm text-white/75 max-w-md animate-fade-up"
              style={{ animationDelay: "140ms" }}
            >
              {slide.sub}
            </p>

            <div
              key={`cta-${slideIdx}`}
              className="mt-6 flex items-center gap-4 animate-fade-up"
              style={{ animationDelay: "220ms" }}
            >
              <Link
                to={slide.href}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold text-sm hover:bg-white/90 hover:gap-3 transition-all rounded-none tracking-wide"
              >
                {slide.cta} <ArrowRight size={14} />
              </Link>
              <Link to="/about" className="text-sm text-white/60 hover:text-white transition-colors tracking-wide">
                Tìm hiểu thêm →
              </Link>
            </div>
          </div>
        </div>

        {/* Slide dots + progress — also container-aligned */}
        <div className="absolute bottom-4 left-0 right-0">
          <div className="container mx-auto px-4 md:px-8 flex items-center gap-3">
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
        <div className="absolute bottom-4 right-6 md:right-8 text-white/50 flex flex-col items-center gap-1.5 animate-float-y">
          <span className="text-[10px] uppercase tracking-widest">Scroll</span>
          <ChevronDown size={16} />
        </div>
      </section>

      {/*  Stats bar — B&W, minimal border style  */}
      <section className="border-b border-t border-foreground/8 bg-white">
        <div className="container mx-auto px-4 md:px-8 py-4 grid grid-cols-3 divide-x divide-foreground/10 text-center">
          {[
            { num: "2,000+", label: "Sản phẩm đã bán" },
            { num: "500+",   label: "Khách hàng hài lòng" },
            { num: "100%",   label: "Thủ công tự nhiên" },
          ].map((s) => (
            <div key={s.label} className="py-2">
              <p className="font-display text-xl md:text-2xl font-bold text-foreground tracking-tight">{s.num}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 uppercase tracking-widest">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/*  Categories  */}
      <section
        ref={catRef as React.RefObject<HTMLDivElement>}
        className="reveal container mx-auto px-4 md:px-8 py-10"
      >
        <div className="text-center mb-8">
          <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-widest mb-1">Danh mục</p>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight">Khám Phá Theo Chủ Đề</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 stagger">
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
              className="group relative aspect-[4/3] overflow-hidden animate-fade-up"
            >
              <img
                src={cat.img}
                alt={cat.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 grayscale-[20%] group-hover:grayscale-0"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute inset-0 flex items-end p-4">
                <span className="text-white font-display text-sm md:text-base font-semibold leading-tight tracking-tight">
                  {cat.name}
                </span>
              </div>
              <div className="absolute inset-0 border border-white/0 group-hover:border-white/20 transition-all duration-300" />
            </Link>
          ))}
        </div>
      </section>

      {/*  Featured Products  */}
      <section
        ref={featuredRef as React.RefObject<HTMLDivElement>}
        className="reveal container mx-auto px-4 md:px-8 py-10"
      >
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-widest mb-1">Handpicked for you</p>
            <h2 className="font-display text-xl md:text-2xl font-bold text-foreground tracking-tight">Sản Phẩm Nổi Bật</h2>
          </div>
          <Link
            to="/products?sort=best_selling"
            className="hidden md:inline-flex items-center gap-1.5 text-sm text-foreground/50 hover:text-foreground transition-colors"
          >
            Xem tất cả <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-4 stagger">
          {featuredProducts.map((product) => (
            <div key={product.id} className="animate-fade-up">
              <ProductCard product={product} compact />
            </div>
          ))}
        </div>
        <div className="mt-5 text-center md:hidden">
          <Link to="/products" className="inline-flex items-center gap-1.5 text-sm text-foreground/50 hover:text-foreground transition-colors">
            Xem tất cả <ArrowRight size={14} />
          </Link>
        </div>
      </section>


      {/*  Deal Hời — only shown when there are badge="Giảm Giá" or discounted products */}
      {dealProducts.length > 0 && <section className="bg-foreground/[0.03] border-y border-foreground/8">
        <section className="container mx-auto px-4 md:px-8 py-10">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <Tag size={10} /> Giảm giá hôm nay
              </p>
              <h2 className="font-display text-xl md:text-2xl font-bold text-foreground tracking-tight">Deal Hời</h2>
              <p className="text-sm text-muted-foreground mt-1">Sản phẩm đang được giảm giá — số lượng có hạn!</p>
            </div>
            <Link
              to="/products"
              className="hidden md:inline-flex items-center gap-1.5 text-sm text-foreground/50 hover:text-foreground transition-colors"
            >
              Xem tất cả <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-4 stagger">
            {dealProducts.map((product) => (
              <div key={product.id} className="animate-fade-up">
                <ProductCard product={product} compact />
              </div>
            ))}
          </div>
        </section>
      </section>}

      {/*  Dòng Sản Phẩm Mới  */}
      <section
        ref={newRef as React.RefObject<HTMLDivElement>}
        className="reveal container mx-auto px-4 md:px-8 py-10"
      >
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Zap size={10} /> Mới cập nhật
            </p>
            <h2 className="font-display text-xl md:text-2xl font-bold text-foreground tracking-tight">Dòng Sản Phẩm Mới</h2>
            <p className="text-sm text-muted-foreground mt-1">Những sản phẩm vừa được thêm vào cửa hàng</p>
          </div>
          <Link
            to="/products?sort=newest"
            className="hidden md:inline-flex items-center gap-1.5 text-sm text-foreground/50 hover:text-foreground transition-colors"
          >
            Xem tất cả <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-4 stagger">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-muted animate-pulse rounded-lg" />
              ))
            : newProducts.map((product) => (
                <div key={product.id} className="animate-fade-up">
                  <ProductCard product={product} compact />
                </div>
              ))
          }
        </div>
        <div className="mt-5 text-center md:hidden">
          <Link to="/products?sort=newest" className="inline-flex items-center gap-1.5 text-sm text-foreground/50 hover:text-foreground transition-colors">
            Xem tất cả <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/*  Promo Banner — reads from shop_settings (banner_image_url / banner_link)  */}
      {(() => {
        const bannerImg      = settings["banner_image_url"] ?? "";
        const bannerLink     = settings["banner_link"]      || "/products";
        const bannerTitle    = settings["banner_title"]    || (() => {
          const freeFrom = settings["free_shipping_from"] ?? "300000";
          return `Miễn phí vận chuyển\ncho đơn từ ${Number(freeFrom).toLocaleString("vi-VN")}đ`;
        })();
        const bannerSubtitle = settings["banner_subtitle"] ?? "";
        return (
          <section
            ref={bannerRef as React.RefObject<HTMLDivElement>}
            className="reveal container mx-auto px-4 md:px-8 pb-10"
          >
            <Link to={bannerLink} className="block group">
              <div className="relative overflow-hidden bg-foreground">
                {/* Background: uploaded banner image or fallback to totesCat */}
                <div className="absolute inset-0">
                  <img
                    src={bannerImg || totesCat}
                    alt="Banner khuyến mãi"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  {/* Dark overlay so text remains readable regardless of image */}
                  <div className="absolute inset-0 bg-black/55" />
                </div>
                <div className="relative px-8 md:px-12 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <p className="text-[10px] font-semibold text-white/50 uppercase tracking-widest mb-2">Ưu đãi đặc biệt</p>
                    <h3 className="font-display text-2xl md:text-3xl font-bold text-white leading-snug tracking-tight whitespace-pre-line">
                      {bannerTitle}
                    </h3>
                    {bannerSubtitle && (
                      <p className="mt-1.5 text-sm text-white/70">{bannerSubtitle}</p>
                    )}
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold text-sm group-hover:bg-white/90 transition-all tracking-wide">
                    Mua ngay <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            </Link>
          </section>
        );
      })()}


      {/*  Reviews  */}
      <section
        ref={reviewRef as React.RefObject<HTMLDivElement>}
        className="reveal bg-foreground/[0.03] border-t border-foreground/8 py-12"
      >
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center mb-8">
            <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-widest mb-1">Khách hàng nói gì</p>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight">Phản Hồi Thực Tế</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stagger">
            {staticReviews.map((r) => (
              <div
                key={r.id}
                className="animate-fade-up bg-white rounded-none p-5 border border-foreground/8 hover:border-foreground/20 hover:shadow-sm transition-all duration-300"
              >
                {/* Stars */}
                <div className="flex items-center gap-0.5 mb-3">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <Star key={i} size={12} className="fill-foreground text-foreground" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">&ldquo;{r.content}&rdquo;</p>
                <div className="mt-4 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center shrink-0">
                    <span className="text-[11px] font-bold text-background">{r.name[0]}</span>
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