import { useEffect, useRef, useState, type RefObject } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useCategories } from "@/hooks/useProducts";
import { useShopSettingsCtx } from "@/contexts/ShopSettingsContext";
import { API_BASE_URL } from "@/lib/api-base";
import heroBanner from "@/assets/hero-banner.jpg";
import candlesCat from "@/assets/categories/candles.jpg";
import cardsCat from "@/assets/categories/cards.jpg";
import totesCat from "@/assets/categories/totes.jpg";
import jewelryCat from "@/assets/categories/jewelry.jpg";

const API_URL = API_BASE_URL;
const BRAND_SLIDE_DURATION = 4000;

const categoryImages = [candlesCat, cardsCat, totesCat, jewelryCat];

function resolveMediaUrl(url: string): string {
  const value = url.trim();
  if (!value) return "";

  // Guard against partially copied/truncated Cloudinary URLs like
  // https://res.cloudinary.com/<cloud>/image/up
  // which would render as broken images on client pages.
  if (
    value.includes("res.cloudinary.com")
    && value.includes("/image/up")
    && !value.includes("/image/upload")
  ) {
    return "";
  }

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

function isLikelyVideoUrl(url: string): boolean {
  const value = url.toLowerCase();
  return [".mp4", ".webm", ".mov", ".m4v", ".ogg"].some((ext) => value.includes(ext));
}

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

interface ArtisticSplitSectionProps {
  leftImage: string;
  rightImage: string;
  leftTitle: string;
  rightTitle: string;
  leftLink: string;
  rightLink: string;
  leftDiscoverLabel: string;
  rightDiscoverLabel: string;
}

function ArtisticSplitSection({
  leftImage,
  rightImage,
  leftTitle,
  rightTitle,
  leftLink,
  rightLink,
  leftDiscoverLabel,
  rightDiscoverLabel,
}: ArtisticSplitSectionProps) {
  const cards = [
    { image: leftImage, title: leftTitle, link: leftLink, discoverLabel: leftDiscoverLabel },
    { image: rightImage, title: rightTitle, link: rightLink, discoverLabel: rightDiscoverLabel },
  ];

  return (
    <section className="relative w-full min-h-[160svh] overflow-hidden bg-black">
      <div className="grid h-full grid-cols-1 gap-0 md:grid-cols-2">
        {cards.map((card, index) => (
          <Link
            key={`homepage-featured-${index}`}
            to={card.link || "/products"}
            className="group relative min-h-[80svh] overflow-hidden md:h-[160svh]"
          >
            <img
              src={card.image}
              alt={card.title}
              className="hero-img transition-transform duration-700 group-hover:scale-[1.03]"
              onError={(event) => {
                const target = event.currentTarget;
                if (target.src !== heroBanner) {
                  target.src = heroBanner;
                }
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />

            <div className="absolute inset-x-0 bottom-0 p-5 md:p-8">
              <h3 className="font-display text-lg font-semibold uppercase leading-[0.98] tracking-[0.05em] text-white whitespace-nowrap md:text-2xl">
                {card.title}
              </h3>
              <span className="mt-1.5 inline-flex items-center gap-2 whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.13em] text-white/90 underline underline-offset-4 transition-colors group-hover:text-white md:text-xs">
                {card.discoverLabel}
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

interface HeroSectionThreeItem {
  image: string;
  link: string;
}

interface HeroSectionThreeProps {
  items: HeroSectionThreeItem[];
}

interface HeroSectionSingleProps {
  image: string;
  link: string;
  title: string;
  discoverLabel: string;
}

function HeroSectionSingle({ image, link, title, discoverLabel }: HeroSectionSingleProps) {
  return (
    <section className="relative w-full min-h-[92dvh] overflow-hidden md:min-h-[100dvh]">
      <Link to={link || "/products?fragrance_gender=unisex"} className="group absolute inset-0 block">
        <img
          src={image}
          alt="New Arrival Unisex"
          className="hero-img transition-transform duration-700 group-hover:scale-[1.02]"
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-black/20" />

        <div className="absolute inset-x-0 bottom-0 z-10 p-5 md:p-8">
          <div>
            <h2 className="font-display text-lg font-semibold uppercase tracking-[0.05em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)] whitespace-nowrap leading-none md:text-2xl">
              {title}
            </h2>
            <span className="mt-1.5 inline-flex whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.13em] text-white underline underline-offset-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] md:text-xs">
              {discoverLabel}
            </span>
          </div>
        </div>
      </Link>
    </section>
  );
}

function HeroSectionThree({ items }: HeroSectionThreeProps) {
  return (
    <section className="mx-auto w-full max-w-[1920px] px-3 py-14 md:px-5 md:py-20">
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
        <div className="flex min-w-max gap-3 md:grid md:min-w-0 md:grid-cols-4 md:gap-3">
          {items.map((item, index) => (
            <Link
              key={`hero-section-3-${index}`}
              to={item.link || "/products"}
              className="group relative block w-[62vw] min-w-[240px] max-w-[360px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] md:w-auto md:min-w-0 md:max-w-none"
            >
              <div className="aspect-[4/5] w-full">
                <img
                  src={item.image}
                  alt={`Hero section 3 image ${index + 1}`}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Index() {
  const [brandSlideIdx, setBrandSlideIdx] = useState(0);
  const [heroVideoFailed, setHeroVideoFailed] = useState(false);
  const { settings } = useShopSettingsCtx();
  const { categories } = useCategories();

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

  const heroPrimaryImage = resolveMediaUrl(settings["hero_slide_1_img"] ?? "") || heroBanner;
  const heroPrimaryVideoRaw = resolveMediaUrl(settings["hero_slide_1_video"] ?? "");
  const heroPrimaryVideo = isLikelyVideoUrl(heroPrimaryVideoRaw) ? heroPrimaryVideoRaw : "";
  const heroSectionOneTitle = settings["hero_slide_1_title"]?.trim() || "SPRING SUMMER 2026 COLLECTION";
  const heroSectionOneDiscoverItems = [1, 2, 3].map((index) => ({
    label:
      settings[`hero_slide_1_discover_${index}_label`]?.trim()
      || ["Men's collection", "Women's Collection", "Unisex Collection"][index - 1],
    link: settings[`hero_slide_1_discover_${index}_link`]?.trim() || "/products",
  }));

  useEffect(() => {
    setHeroVideoFailed(false);
  }, [heroPrimaryVideo]);

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

  const sectionTwoRef = useReveal() as RefObject<HTMLElement>;
  const sectionThreeRef = useReveal() as RefObject<HTMLElement>;
  const sectionFourRef = useReveal() as RefObject<HTMLElement>;
  const categoriesRef = useReveal() as RefObject<HTMLElement>;
  const bannerRef = useReveal() as RefObject<HTMLElement>;
  const brandSectionTitle = settings["brand_section_title"]?.trim() || "Các thương hiệu đang bán";
  const homepageFeatured = {
    leftTitle: settings["homepage_featured_left_title"]?.trim() || "New Arrivals Men",
    rightTitle: settings["homepage_featured_right_title"]?.trim() || "New Arrivals Women",
    leftDiscoverLabel:
      settings["homepage_featured_left_discover_label"]?.trim()
      || settings["homepage_featured_discover_label"]?.trim()
      || "Discover sản phẩm",
    rightDiscoverLabel:
      settings["homepage_featured_right_discover_label"]?.trim()
      || settings["homepage_featured_discover_label"]?.trim()
      || "Discover sản phẩm",
    leftLink: settings["homepage_featured_left_link"]?.trim() || "/products",
    rightLink: settings["homepage_featured_right_link"]?.trim() || "/products",
    leftImage: resolveMediaUrl(settings["homepage_featured_left_image"] ?? "") || heroPrimaryImage,
    rightImage: resolveMediaUrl(settings["homepage_featured_right_image"] ?? "") || candlesCat,
  };
  const activeBrandSlide = brandSlides[Math.min(brandSlideIdx, brandSlides.length - 1)] ?? brandSlides[0];
  const heroSectionThreeSingle = {
    image:
      resolveMediaUrl(settings["hero_section_3_image"] ?? "")
      || jewelryCat
      || heroPrimaryImage
      || heroBanner,
    link: settings["hero_section_3_link"]?.trim() || "/products?fragrance_gender=unisex",
    title: settings["hero_section_3_title"]?.trim() || "NEW ARRIVALS UNISEX",
    discoverLabel: settings["hero_section_3_discover_label"]?.trim() || "DISCOVER SẢN PHẨM",
  };

  const heroSectionFourItems = (() => {
    const fallback = [
      heroPrimaryImage,
      candlesCat,
      cardsCat,
      jewelryCat,
    ];

    return [1, 2, 3, 4].map((index) => {
      const image =
        resolveMediaUrl(settings[`hero_section_4_image_${index}`] ?? "")
        || resolveMediaUrl(settings[`hero_section_3_image_${index}`] ?? "")
        || fallback[index - 1]
        || heroBanner;
      const link =
        settings[`hero_section_4_link_${index}`]?.trim()
        || settings[`hero_section_3_link_${index}`]?.trim()
        || "/products";
      return { image, link };
    });
  })();

  return (
    <div className="homepage-dark relative min-h-screen bg-background text-foreground">
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
        <Header transparent darkOnSolid />

        <section className="relative h-[100svh] min-h-[100svh] w-full overflow-hidden md:min-h-[112dvh]">
          {heroPrimaryVideo && !heroVideoFailed ? (
            <video
              src={heroPrimaryVideo}
              className="hero-img hero-video-primary"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster={heroPrimaryImage}
              onError={() => setHeroVideoFailed(true)}
            />
          ) : (
            <img
              src={heroPrimaryImage}
              alt="Hero Section 1"
              loading="eager"
              decoding="async"
              className="hero-img hero-img-primary"
              onError={(event) => {
                const target = event.currentTarget;
                if (target.src !== heroBanner) {
                  target.src = heroBanner;
                }
              }}
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-18 bg-gradient-to-b from-black/100 via-black/100 to-black/65 md:h-24" />
          <div className="pointer-events-none absolute right-0 top-0 h-18 w-[68vw] bg-gradient-to-l from-black/100 via-black/100 to-black/60 md:h-24 md:w-[44rem]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-[38vw] bg-gradient-to-l from-black/95 via-black/70 to-transparent md:hidden" />

          <div className="absolute bottom-36 left-5 z-20 md:bottom-40 md:left-8">
            <h2 className="font-display text-lg font-semibold uppercase tracking-[0.05em] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] md:text-2xl">
              {heroSectionOneTitle}
            </h2>

            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 md:mt-6 md:gap-x-8">
              {heroSectionOneDiscoverItems.map((item, index) => (
                <Link
                  key={`hero-1-discover-${index + 1}`}
                  to={item.link}
                  className="text-[10px] font-medium uppercase tracking-[0.13em] text-white underline underline-offset-4 transition-colors hover:text-white/85 md:text-xs"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <div ref={sectionTwoRef as RefObject<HTMLDivElement>} className="reveal">
          <ArtisticSplitSection
            leftImage={homepageFeatured.leftImage}
            rightImage={homepageFeatured.rightImage}
            leftTitle={homepageFeatured.leftTitle}
            rightTitle={homepageFeatured.rightTitle}
            leftLink={homepageFeatured.leftLink}
            rightLink={homepageFeatured.rightLink}
            leftDiscoverLabel={homepageFeatured.leftDiscoverLabel}
            rightDiscoverLabel={homepageFeatured.rightDiscoverLabel}
          />
        </div>

        <div ref={sectionThreeRef as RefObject<HTMLDivElement>} className="reveal">
          <HeroSectionSingle
            image={heroSectionThreeSingle.image}
            link={heroSectionThreeSingle.link}
            title={heroSectionThreeSingle.title}
            discoverLabel={heroSectionThreeSingle.discoverLabel}
          />
        </div>

        <section
          ref={categoriesRef as RefObject<HTMLDivElement>}
          className="reveal mx-auto w-full max-w-[1700px] px-4 py-14 md:px-8 md:py-20"
        >
          <div className="mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">Thương hiệu</p>
              <h2 className="font-display text-3xl font-semibold tracking-tight md:text-5xl">{brandSectionTitle}</h2>
            </div>
          </div>

          <div className="animate-fade-up relative overflow-hidden rounded-[1.5rem]">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.15fr_1fr] md:gap-5">
              <Link
                to={activeBrandSlide?.href || "/products"}
                className="group relative block aspect-[16/10] overflow-hidden border border-white/15 bg-white/5 md:aspect-auto md:min-h-[520px]"
              >
                <img
                  src={activeBrandSlide?.thumbnail || heroBanner}
                  alt={`Brand slide ${brandSlideIdx + 1}`}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent transition-opacity group-hover:opacity-90" />
              </Link>

              <div className="grid auto-rows-fr grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 md:gap-3">
                {activeBrandSlide?.brands.map((brand, brandIndex) => (
                  brand ? (
                    <Link
                      key={`${brandSlideIdx}-${brand.slug}-${brandIndex}`}
                      to={`/products?category=${encodeURIComponent(brand.slug)}`}
                      className="group relative flex aspect-square overflow-hidden border border-white/20 bg-white/[0.06] transition-all duration-300 hover:-translate-y-[1px] hover:border-white/45"
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
                      key={`${brandSlideIdx}-empty-${brandIndex}`}
                      aria-hidden="true"
                      className="aspect-square border border-dashed border-white/20 bg-white/[0.03]"
                    />
                  )
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            {brandSlides.map((_, index) => (
              <button
                key={`brand-dot-${index}`}
                onClick={() => setBrandSlideIdx(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === brandSlideIdx ? "w-8 bg-white" : "w-2 bg-white/35 hover:bg-white/65"
                }`}
                aria-label={`Brand slide ${index + 1}`}
              />
            ))}
          </div>
        </section>

        <div ref={sectionFourRef as RefObject<HTMLDivElement>} className="reveal">
          <HeroSectionThree items={heroSectionFourItems} />
        </div>

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
                <div className="rounded-[1.75rem] border border-white/15 bg-white/5 p-1.5">
                  <div className="relative min-h-[380px] overflow-hidden rounded-[calc(1.75rem-0.375rem)] bg-foreground md:min-h-[500px]">
                    <div className="absolute inset-0">
                      <img
                        src={bannerImg || totesCat}
                        alt="Banner khuyến mãi"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      />
                      <div className="absolute inset-0 bg-black/55" />
                    </div>
                    <div className="relative flex min-h-[380px] flex-col items-start justify-between gap-8 px-7 py-11 md:min-h-[500px] md:flex-row md:items-center md:px-12 md:py-14">
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
