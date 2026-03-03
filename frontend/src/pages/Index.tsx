import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/shop/ProductCard";
import SectionTitle from "@/components/shop/SectionTitle";
import { products, categories, reviews } from "@/data/products";
import heroBanner from "@/assets/hero-banner.jpg";
import candlesCat from "@/assets/categories/candles.jpg";
import cardsCat from "@/assets/categories/cards.jpg";
import totesCat from "@/assets/categories/totes.jpg";
import jewelryCat from "@/assets/categories/jewelry.jpg";

const categoryImages = [candlesCat, cardsCat, totesCat, jewelryCat];
const categoryNames = ["Nến", "Thiệp & In Ấn", "Túi Vải", "Trang Sức"];

const Index = () => {
  const [reviewIdx, setReviewIdx] = useState(0);
  const featuredProducts = products.slice(0, 4);
  const moreProducts = products.slice(4, 8);

  return (
    <div className="min-h-screen bg-surface-pink">
      <Header />

      {/* Hero Banner */}
      <section className="container mx-auto px-4 md:px-8 pt-6">
        <div className="relative rounded-2xl overflow-hidden">
          <img
            src={heroBanner}
            alt="Handcrafted Gifts"
            className="w-full h-[300px] md:h-[420px] object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-16">
            <h1 className="font-display text-3xl md:text-5xl font-bold text-background leading-tight max-w-lg">
              Quà Tặng Thủ Công Cho Mọi Dịp
            </h1>
            <Link
              to="/products"
              className="mt-6 inline-flex items-center self-start px-6 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Mua Ngay
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="container mx-auto px-4 md:px-8 py-12">
        <SectionTitle className="mb-8">Sản Phẩm Nổi Bật</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Quick Categories */}
      <section className="container mx-auto px-4 md:px-8 pb-12">
        <SectionTitle className="mb-8">Danh Mục Nhanh</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {categoryNames.map((name, i) => (
            <Link
              key={name}
              to="/products"
              className="group flex flex-col"
            >
              <div className="aspect-square rounded-xl overflow-hidden border border-border bg-card">
                <img
                  src={categoryImages[i]}
                  alt={name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <span className="mt-2 text-sm font-medium text-foreground text-center">{name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* More Products */}
      <section className="container mx-auto px-4 md:px-8 pb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {moreProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Customer Feedback */}
      <section className="container mx-auto px-4 md:px-8 pb-16">
        <SectionTitle className="mb-8">Phản Hồi Khách Hàng</SectionTitle>
        <div className="relative max-w-3xl mx-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReviewIdx((p) => (p > 0 ? p - 1 : Math.max(reviews.length - 2, 0)))}
              className="p-1 text-muted-foreground hover:text-foreground shrink-0"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
              {[0, 1].map((offset) => {
                const idx = (reviewIdx + offset) % reviews.length;
                return (
                  <div key={idx} className="flex items-start gap-3 bg-card rounded-xl p-5 border border-border">
                    <div className="w-10 h-10 rounded-full bg-surface-pink-dark flex items-center justify-center shrink-0">
                      <span className="font-display text-xs font-bold text-foreground">
                        {reviews[idx].name[0]}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground italic">
                        "{reviews[idx].content}"
                      </p>
                      <p className="mt-2 text-xs font-medium text-foreground">
                        — {reviews[idx].name}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setReviewIdx((p) => (p < reviews.length - 2 ? p + 1 : 0))}
              className="p-1 text-muted-foreground hover:text-foreground shrink-0"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="flex justify-center gap-1.5 mt-4">
            {reviews.map((_, i) => (
              <button
                key={i}
                onClick={() => setReviewIdx(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === reviewIdx ? "bg-foreground" : "bg-border"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
