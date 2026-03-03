import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronRight, Star, Minus, Plus } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/shop/ProductCard";
import PriceDisplay from "@/components/shop/PriceDisplay";
import QuantityStepper from "@/components/shop/QuantityStepper";
import SectionTitle from "@/components/shop/SectionTitle";
import { products } from "@/data/products";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

const ProductDetail = () => {
  const { slug } = useParams();
  const product = products.find((p) => p.slug === slug);
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState("description");
  const [selectedImage, setSelectedImage] = useState(0);

  if (!product) {
    return (
      <div className="min-h-screen bg-surface-pink">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Không tìm thấy sản phẩm.</p>
        </div>
        <Footer />
      </div>
    );
  }

  const images = product.images || [product.image];
  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);

  const handleAddToCart = () => {
    addItem(product, quantity);
    toast.success("Đã thêm vào giỏ hàng!");
  };

  const tabs = [
    { key: "description", label: "Mô tả" },
    { key: "material", label: "Chất liệu" },
    { key: "care", label: "Bảo quản" },
  ];

  return (
    <div className="min-h-screen bg-surface-pink">
      <Header />

      <div className="container mx-auto px-4 md:px-8 py-4">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Trang chủ</Link>
          <ChevronRight size={14} />
          <Link to="/products" className="hover:text-foreground">Sản phẩm</Link>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">{product.name}</span>
        </nav>
      </div>

      <div className="container mx-auto px-4 md:px-8 pb-16">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {/* Gallery */}
          <div>
            <div className="aspect-square rounded-xl overflow-hidden bg-muted">
              <img src={images[selectedImage]} alt={product.name} className="w-full h-full object-cover" />
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 mt-3">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      i === selectedImage ? "border-primary" : "border-border"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">{product.name}</h1>
            {product.rating && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} className={i < Math.floor(product.rating!) ? "fill-amber-400 text-amber-400" : "text-border"} />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">({product.reviewCount} đánh giá)</span>
              </div>
            )}

            <div className="mt-4">
              <PriceDisplay price={product.price} originalPrice={product.originalPrice} size="lg" />
            </div>

            {/* Variants */}
            {product.variants?.map((v) => (
              <div key={v.label} className="mt-5">
                <label className="text-sm font-medium text-foreground">{v.label}</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {v.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setSelectedVariants((p) => ({ ...p, [v.label]: opt }))}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        selectedVariants[v.label] === opt
                          ? "border-primary bg-secondary text-foreground"
                          : "border-border text-muted-foreground hover:border-primary"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Handmade options */}
            <div className="mt-5 p-4 bg-card rounded-xl border border-border">
              <p className="text-sm font-medium text-foreground mb-2">Tùy chọn handmade</p>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" className="accent-primary" /> Gói quà (+15.000đ)
              </label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <input type="checkbox" className="accent-primary" /> Kèm thiệp viết tay (+10.000đ)
              </label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <input type="checkbox" className="accent-primary" /> Khắc tên (+20.000đ)
              </label>
            </div>

            {/* Quantity + CTA */}
            <div className="mt-6 flex items-center gap-4">
              <QuantityStepper value={quantity} onChange={setQuantity} />
              <button
                onClick={handleAddToCart}
                className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Thêm vào giỏ
              </button>
            </div>
            <Link
              to="/cart"
              onClick={handleAddToCart}
              className="block mt-2 w-full py-3 rounded-lg border border-primary text-primary text-sm font-medium text-center hover:bg-secondary transition-colors"
            >
              Mua ngay
            </Link>

            {/* Tabs */}
            <div className="mt-8 border-t border-border pt-6">
              <div className="flex gap-4 border-b border-border">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === t.key
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="mt-4 text-sm text-muted-foreground leading-relaxed">
                {activeTab === "description" && <p>{product.description}</p>}
                {activeTab === "material" && <p>{product.material || "Đang cập nhật"}</p>}
                {activeTab === "care" && <p>{product.care || "Đang cập nhật"}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-16">
            <SectionTitle className="mb-8">Sản Phẩm Tương Tự</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default ProductDetail;
