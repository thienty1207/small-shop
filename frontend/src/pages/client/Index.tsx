import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/shop/ProductCard";
import { useCategories, useProducts } from "@/hooks/useProducts";
import { useShopSettingsCtx } from "@/contexts/ShopSettingsContext";
import type { Product } from "@/data/products";
import heroBanner from "@/assets/hero-banner.jpg";
import candlesCat from "@/assets/categories/candles.jpg";
import cardsCat from "@/assets/categories/cards.jpg";
import totesCat from "@/assets/categories/totes.jpg";
import jewelryCat from "@/assets/categories/jewelry.jpg";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const SLIDE_DURATION = 5000;
const BRAND_SLIDE_DURATION = 4000;
const HOMEPAGE_SECTION_LIMIT = 1000;

const categoryImages = [candlesCat, cardsCat, totesCat, jewelryCat];

function resolveMediaUrl(url: string): string {
  const value = url.trim();
  if (!value) return "";
  if (
    value.startsWith("http://")
    || value.startsWith("https://")
    || value.startsWith("//")
    || value.startsWith("data:")
    || value.startsWith("blob:")
  ) {
    return value;
  }

  return value.startsWith("/") ? `${API_URL}${value}` : value;
}

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
    sub: "Lan tỏa không gian với những mùi hương handmade đặc biệt",
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

interface BrandItem {
  name: string;
  slug: string;
  image: string;
}

interface BrandSlide {
  thumbnail: string;
  href: string;
  brands: Array<BrandItem | null>;
}

interface BrandSlideAsset {
  thumbnail: string;
  href: string;
}

const fallbackBrandItems: BrandItem[] = [
  { name: "Nến thơm", slug: "nen-thom", image: candlesCat },
  { name: "Thiệp", slug: "thiep", image: cardsCat },
  { name: "Túi vải", slug: "tui-vai", image: totesCat },
  { name: "Trang sức", slug: "trang-suc", image: jewelryCat },
];

function buildBrandSlides(brands: BrandItem[], assets: BrandSlideAsset[]): BrandSlide[] {
  const safeBrands = brands.length > 0 ? brands : fallbackBrandItems;
  const safeAssets = assets.length > 0 ? assets : [{ thumbnail: heroBanner, href: "/products" }];
  const slideCount = Math.max(1, safeAssets.length, Math.ceil(safeBrands.length / 12));

  return Array.from({ length: slideCount }, (_, slideIdx) => {
    const start = slideIdx * 12;
    const chunk = safeBrands.slice(start, start + 12);
    const paddedChunk = [...chunk];

    while (paddedChunk.length < 12) {
      paddedChunk.push(null);
    }

    return {
      thumbnail: safeAssets[slideIdx % safeAssets.length]?.thumbnail ?? heroBanner,
      href: safeAssets[slideIdx % safeAssets.length]?.href || "/products",
      brands: paddedChunk,
    };
  });
}

function useReveal() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.classList.add("visible");
          observer.disconnect();
        }
      },
      { threshold: 0.12 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return ref;
}

interface ProductSectionProps {
  eyebrow: string;
  title: string;
  description?: string;
  link: string;
  products: Product[];
  bordered?: "top" | "bottom" | "both" | "none";
  muted?: boolean;
}

function ProductSection({
  eyebrow,
  title,
  description,
  link,
  products,
  bordered = "none",
  muted = false,
}: ProductSectionProps) {
  if (products.length === 0) return null;

  const borderClass =
    bordered === "both"
      ? "border-y border-black/10"
      : bordered === "top"
        ? "border-t border-black/10"
        : bordered === "bottom"
          ? "border-b border-black/10"
          : "";

  return (
    <section className={`${borderClass} ${muted ? "bg-[#f2f1ee]" : ""}`}>
      <div className="container mx-auto px-4 py-12 md:px-8 md:py-16">
        <div className="mb-6 flex items-end justify-between md:mb-7">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/45">
              {eyebrow}
            </p>
            <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <Link
            to={link}
            className="hidden items-center gap-1.5 text-sm text-foreground/55 transition-colors hover:text-foreground md:inline-flex"
          >
            Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="stagger mx-auto grid max-w-[1080px] grid-cols-3 gap-3 md:grid-cols-6 md:gap-4">
          {products.map((product) => (
            <div key={product.id} className="animate-fade-up">
              <ProductCard product={product} compact />
            </div>
          ))}
        </div>

        <div className="mt-5 text-center md:hidden">
          <Link
            to={link}
            className="inline-flex items-center gap-1.5 text-sm text-foreground/55 transition-colors hover:text-foreground"
          >
            Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Index() {
  const [slideIdx, setSlideIdx] = useState(0);
  const [progKey, setProgKey] = useState(0);
  const [brandSlideIdx, setBrandSlideIdx] = useState(0);
  const { settings } = useShopSettingsCtx();
  const { categories } = useCategories();

  const { products: featuredProducts } = useProducts({ badge: "featured", limit: HOMEPAGE_SECTION_LIMIT });
  const { products: newProducts } = useProducts({ badge: "new", limit: HOMEPAGE_SECTION_LIMIT });
  const { products: maleFeed } = useProducts({ homepageSection: "male", limit: HOMEPAGE_SECTION_LIMIT });
  const { products: femaleFeed } = useProducts({ homepageSection: "female", limit: HOMEPAGE_SECTION_LIMIT });
  const { products: unisexFeed } = useProducts({ homepageSection: "unisex", limit: HOMEPAGE_SECTION_LIMIT });

  const maleProducts = maleFeed.filter((product) => product.homepageSection === "male");
  const femaleProducts = femaleFeed.filter((product) => product.homepageSection === "female");
  const unisexProducts = unisexFeed.filter((product) => product.homepageSection === "unisex");

  const brandItems = (() => {
    const fromCategories = categories
      .map((category, index) => {
        const rawImage = (category.image ?? "").trim();
        const image = rawImage.length > 0
          ? resolveMediaUrl(rawImage)
          : categoryImages[index % categoryImages.length];

        return {
          name: category.name.trim(),
          slug: category.slug.trim(),
          image,
        };
      })
      .filter((category) => category.name.length > 0 && category.slug.length > 0);

    return fromCategories.length > 0 ? fromCategories : fallbackBrandItems;
  })();

  const brandThumbnails = (() => {
    const fromSettings = [1, 2, 3]
      .map((index) => {
        const thumbnail = resolveMediaUrl(
          settings[`brand_slide_${index}_thumbnail`]
          || settings[`brand_slide_${index}_img`]
          || "",
        );
        const href = (settings[`brand_slide_${index}_href`] ?? "").trim() || "/products";

        if (!thumbnail) return null;
        return { thumbnail, href };
      })
      .filter((item): item is BrandSlideAsset => item !== null);

    return fromSettings.length > 0
      ? fromSettings
      : [
          { thumbnail: heroBanner, href: "/products" },
          { thumbnail: candlesCat, href: "/products" },
          { thumbnail: cardsCat, href: "/products" },
        ];
  })();

  const brandSlides = buildBrandSlides(brandItems, brandThumbnails);

  const heroSlides = (() => {
    const fromSettings = [1, 2, 3]
      .map((index) => ({
        img: resolveMediaUrl(settings[`hero_slide_${index}_img`] ?? ""),
        tag: settings[`hero_slide_${index}_title`] ?? "",
        title: settings[`hero_slide_${index}_title`] ?? "",
        sub: settings[`hero_slide_${index}_subtitle`] ?? "",
        cta: settings[`hero_slide_${index}_cta`] || "Xem ngay",
        href: settings[`hero_slide_${index}_href`] || "/products",
      }))
      .filter((item) => item.img.length > 0);

    return fromSettings.length > 0 ? fromSettings : staticSlides;
  })();

  const nextHeroSlide = useCallback(() => {
    setSlideIdx((current) => (current + 1) % heroSlides.length);
    setProgKey((current) => current + 1);
  }, [heroSlides.length]);

  useEffect(() => {
    const timeoutId = setTimeout(nextHeroSlide, SLIDE_DURATION);
    return () => clearTimeout(timeoutId);
  }, [slideIdx, nextHeroSlide]);

  useEffect(() => {
    setBrandSlideIdx(0);
  }, [brandSlides.length]);

  useEffect(() => {
    if (brandSlides.length <= 1) return;

    const intervalId = setInterval(() => {
      setBrandSlideIdx((current) => (current + 1) % brandSlides.length);
    }, BRAND_SLIDE_DURATION);

    return () => clearInterval(intervalId);
  }, [brandSlides.length]);

  const goToHeroSlide = (index: number) => {
    setSlideIdx(index);
    setProgKey((current) => current + 1);
  };

  const categoriesRef = useReveal() as RefObject<HTMLElement>;
  const bannerRef = useReveal() as RefObject<HTMLElement>;
  const slide = heroSlides[Math.min(slideIdx, heroSlides.length - 1)];
  const brandSectionTitle = settings["brand_section_title"]?.trim() || "Các thương hiệu đang bán";

  return (
    <div className="relative min-h-screen bg-[#f7f6f3] text-foreground">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(15,15,15,0.75) 0.8px, transparent 0)",
          backgroundSize: "20px 20px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[38rem] bg-[radial-gradient(ellipse_at_top,rgba(20,20,20,0.08),transparent_62%)]"
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header transparent />

        <section className="relative w-full min-h-[100dvh] overflow-hidden border-b border-black/10">
          {heroSlides.map((heroSlide, index) => (
            <div
              key={index}
              aria-hidden={index !== slideIdx}
              className={`absolute inset-0 transition-opacity duration-700 ${
                index === slideIdx ? "opacity-100" : "opacity-0"
              }`}
            >
              <img
                src={heroSlide.img}
                alt={heroSlide.title}
                loading={index === 0 ? "eager" : "lazy"}
                decoding="async"
                className={`hero-img ${index === slideIdx ? "animate-hero-scale" : ""}`}
              />
            </div>
          ))}

          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25" />

          <div className="relative container mx-auto flex min-h-[100dvh] items-end px-4 pb-16 pt-28 md:items-center md:px-8 md:pb-20 md:pt-36">
            <div className="grid w-full grid-cols-1 items-end gap-10 md:items-center">
              <div className="max-w-2xl">
                <span
                  key={`tag-${slideIdx}`}
                  className="animate-fade-in mb-3 inline-flex items-center gap-2 border border-white/25 bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/85"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {slide.tag}
                </span>

                <h1
                  key={`title-${slideIdx}`}
                  className="animate-fade-up font-display text-4xl font-semibold leading-[0.95] tracking-[-0.03em] text-white text-wrap-balance whitespace-pre-line md:text-6xl"
                  style={{ animationDelay: "60ms" }}
                >
                  {slide.title}
                </h1>

                <p
                  key={`sub-${slideIdx}`}
                  className="animate-fade-up mt-4 max-w-[62ch] text-sm leading-relaxed text-white/75 md:text-base"
                  style={{ animationDelay: "140ms" }}
                >
                  {slide.sub}
                </p>

                <div
                  key={`cta-${slideIdx}`}
                  className="animate-fade-up mt-8 flex flex-wrap items-center gap-3"
                  style={{ animationDelay: "220ms" }}
                >
                  <Link
                    to={slide.href}
                    className="group inline-flex items-center gap-2.5 border border-white/25 bg-white px-6 py-3 text-sm font-semibold tracking-wide text-black transition-all duration-300 hover:-translate-y-[1px] hover:bg-white/90 active:translate-y-0 active:scale-[0.98]"
                  >
                    {slide.cta}
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-black/15 bg-black/5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-px">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>

                  <Link
                    to="/about"
                    className="inline-flex items-center gap-2 text-sm tracking-wide text-white/70 transition-colors hover:text-white"
                  >
                    Tìm hiểu thêm
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 left-0 right-0">
            <div className="container mx-auto flex items-center gap-3 px-4 md:px-8">
              {heroSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToHeroSlide(index)}
                  className={`rounded-full transition-all duration-300 ${
                    index === slideIdx
                      ? "h-2 w-9 bg-white"
                      : "h-2 w-2 bg-white/45 hover:bg-white/75"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
            <div
              key={progKey}
              className="animate-slide-progress h-full origin-left bg-white"
              style={{ animationDuration: `${SLIDE_DURATION}ms` }}
            />
          </div>

          <div className="animate-float-y absolute bottom-4 right-6 flex flex-col items-center gap-1.5 text-white/55 md:right-8">
            <span className="text-[10px] uppercase tracking-[0.2em]">Scroll</span>
            <ChevronDown className="h-4 w-4" />
          </div>
        </section>

        <section className="border-y border-black/10 bg-[#fdfcf9]">
          <div className="container mx-auto grid grid-cols-1 divide-y divide-black/10 px-4 py-2 md:grid-cols-3 md:divide-x md:divide-y-0 md:px-8">
            {[
              { num: "2,000+", label: "Sản phẩm đã bán" },
              { num: "500+", label: "Khách hàng hài lòng" },
              { num: "100%", label: "Thủ công tự nhiên" },
            ].map((stat) => (
              <div key={stat.label} className="py-4 text-center md:py-5">
                <p className="font-display text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{stat.num}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground md:text-[11px]">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        <ProductSection
          eyebrow="Handpicked for you"
          title="Sản phẩm nổi bật"
          link="/products?sort=best_selling"
          products={featuredProducts}
          bordered="top"
        />

        <section
          ref={categoriesRef as RefObject<HTMLDivElement>}
          className="reveal container mx-auto px-4 py-14 md:px-8 md:py-20"
        >
          <div className="mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/45">Thương hiệu</p>
              <h2 className="font-display text-3xl font-semibold tracking-tight md:text-5xl">{brandSectionTitle}</h2>
            </div>
          </div>

          <div className="animate-fade-up relative min-h-[510px] overflow-hidden rounded-[1.5rem] md:min-h-[430px]">
            {brandSlides.map((brandSlide, slideIndex) => (
              <div
                key={`brand-slide-${slideIndex}`}
                aria-hidden={slideIndex !== brandSlideIdx}
                className={`absolute inset-0 grid grid-cols-1 gap-4 transition-opacity duration-700 md:grid-cols-[1.15fr_1fr] md:gap-5 ${
                  slideIndex === brandSlideIdx ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                <Link
                  to={brandSlide.href || "/products"}
                  className="group relative block min-h-[250px] overflow-hidden border border-black/12 bg-black/5 md:min-h-[430px]"
                >
                  <img
                    src={brandSlide.thumbnail}
                    alt={`Brand slide ${slideIndex + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent transition-opacity group-hover:opacity-90" />
                </Link>

                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 md:gap-3">
                  {brandSlide.brands.map((brand, brandIndex) => (
                    brand ? (
                      <Link
                        key={`${slideIndex}-${brand.slug}-${brandIndex}`}
                        to={`/products?category=${encodeURIComponent(brand.slug)}`}
                        className="group relative flex min-h-[78px] overflow-hidden border border-black/15 bg-[#fdfcf9] transition-all duration-300 hover:-translate-y-[1px] hover:border-black/30 md:min-h-[94px]"
                      >
                        <img src={brand.image} alt={brand.name} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-black/35 transition-colors group-hover:bg-black/45" />
                        <div className="absolute inset-0 flex items-center justify-center px-2 text-center">
                          <span className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-white drop-shadow md:text-base">
                            {brand.name}
                          </span>
                        </div>
                      </Link>
                    ) : (
                      <div
                        key={`${slideIndex}-empty-${brandIndex}`}
                        aria-hidden="true"
                        className="min-h-[78px] border border-dashed border-black/10 bg-black/[0.025] md:min-h-[94px]"
                      />
                    )
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            {brandSlides.map((_, index) => (
              <button
                key={`brand-dot-${index}`}
                onClick={() => setBrandSlideIdx(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === brandSlideIdx ? "w-8 bg-foreground" : "w-2 bg-foreground/30 hover:bg-foreground/60"
                }`}
                aria-label={`Brand slide ${index + 1}`}
              />
            ))}
          </div>
        </section>

        <ProductSection
          eyebrow="Mới cập nhật"
          title="Dòng sản phẩm mới"
          description="Những sản phẩm vừa được thêm vào cửa hàng."
          link="/products?sort=newest"
          products={newProducts}
          bordered="bottom"
        />

        <ProductSection
          eyebrow="Gợi ý cho nam"
          title="Nước hoa nam"
          description="Tổng hợp các mùi hương dành cho nam đang có tại cửa hàng."
          link="/products?fragrance_gender=male"
          products={maleProducts}
        />

        <ProductSection
          eyebrow="Gợi ý cho nữ"
          title="Nước hoa nữ"
          description="Những lựa chọn nổi bật dành cho nữ, dễ xem và dễ chọn."
          link="/products?fragrance_gender=female"
          products={femaleProducts}
        />

        <ProductSection
          eyebrow="Linh hoáº¡t cho má»i ngÆ°á»i"
          title="NÆ°á»›c hoa unisex"
          description="Nhá»¯ng mÃ¹i hÆ°Æ¡ng unisex Ä‘Æ°á»£c chá»n riÃªng Ä‘á»ƒ hiá»ƒn thá»‹ á»Ÿ trang chá»§."
          link="/products?fragrance_gender=unisex"
          products={unisexProducts}
        />

        {(() => {
          const bannerImg = resolveMediaUrl(settings["banner_image_url"] ?? "");
          const bannerLink = settings["banner_link"] || "/products";
          const bannerTitle = settings["banner_title"] || (() => {
            const freeFrom = settings["free_shipping_from"] ?? "300000";
            return `Miễn phí vận chuyển\ncho đơn từ ${Number(freeFrom).toLocaleString("vi-VN")}đ`;
          })();
          const bannerSubtitle = settings["banner_subtitle"] ?? "";

          return (
            <section
              ref={bannerRef as RefObject<HTMLDivElement>}
              className="reveal container mx-auto px-4 py-14 md:px-8 md:py-20"
            >
              <Link to={bannerLink} className="group block">
                <div className="rounded-[1.75rem] border border-black/10 bg-black/5 p-1.5">
                  <div className="relative min-h-[220px] overflow-hidden rounded-[calc(1.75rem-0.375rem)] bg-foreground md:min-h-[260px]">
                    <div className="absolute inset-0">
                      <img
                        src={bannerImg || totesCat}
                        alt="Banner khuyến mãi"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      />
                      <div className="absolute inset-0 bg-black/55" />
                    </div>
                    <div className="relative flex min-h-[220px] flex-col items-start justify-between gap-8 px-7 py-11 md:min-h-[260px] md:flex-row md:items-center md:px-12 md:py-14">
                      <div>
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">Ưu đãi đặc biệt</p>
                        <h3 className="font-display text-3xl font-semibold leading-[1.05] tracking-tight text-white whitespace-pre-line md:text-4xl">
                          {bannerTitle}
                        </h3>
                        {bannerSubtitle && (
                          <p className="mt-2 text-sm text-white/75">{bannerSubtitle}</p>
                        )}
                      </div>
                      <span className="group/cta inline-flex shrink-0 items-center gap-2.5 border border-white/20 bg-white px-6 py-3 text-sm font-semibold tracking-wide text-black transition-all duration-300 group-hover:translate-y-[-1px] group-hover:bg-white/90">
                        Mua ngay
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-black/15 bg-black/5 transition-transform duration-300 group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-px">
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </section>
          );
        })()}

        <Footer />
      </div>
    </div>
  );
}
