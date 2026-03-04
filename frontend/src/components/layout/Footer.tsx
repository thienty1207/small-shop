import { Link } from "react-router-dom";
import { Facebook, Instagram, Youtube, MapPin, Phone, Mail } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background/80">
      <div className="container mx-auto px-4 md:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <h3 className="font-display text-2xl font-bold text-background mb-3">
              Handmade Haven
            </h3>
            <p className="text-sm leading-relaxed text-background/60 mb-5">
              Mỗi sản phẩm là một câu chuyện  được tạo ra với tình yêu và sự tỉ mỉ của bàn tay thủ công.
            </p>
            <div className="flex items-center gap-3">
              <a href="#" aria-label="Facebook" className="w-9 h-9 rounded-xl bg-background/10 flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                <Facebook size={15} />
              </a>
              <a href="#" aria-label="Instagram" className="w-9 h-9 rounded-xl bg-background/10 flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                <Instagram size={15} />
              </a>
              <a href="#" aria-label="Youtube" className="w-9 h-9 rounded-xl bg-background/10 flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                <Youtube size={15} />
              </a>
            </div>
          </div>

          {/* Shop links */}
          <div>
            <h4 className="text-background text-sm font-semibold uppercase tracking-wider mb-4">Cửa hàng</h4>
            <ul className="space-y-2.5">
              {[
                { label: "Tất cả sản phẩm", href: "/products" },
                { label: "Nến thơm", href: "/products?category=nen-thom" },
                { label: "Trang sức", href: "/products?category=trang-suc" },
                { label: "Túi vải", href: "/products?category=tui-vai" },
                { label: "Thiệp handmade", href: "/products?category=thiep" },
              ].map((l) => (
                <li key={l.href}>
                  <Link to={l.href} className="text-sm text-background/60 hover:text-background transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info links */}
          <div>
            <h4 className="text-background text-sm font-semibold uppercase tracking-wider mb-4">Thông tin</h4>
            <ul className="space-y-2.5">
              {[
                { label: "Giới thiệu", href: "/about" },
                { label: "Liên hệ", href: "/contact" },
                { label: "Chính sách vận chuyển", href: "/policy" },
                { label: "Chính sách bảo mật", href: "/policy" },
                { label: "Điều khoản dịch vụ", href: "/policy" },
              ].map((l) => (
                <li key={l.label}>
                  <Link to={l.href} className="text-sm text-background/60 hover:text-background transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-background text-sm font-semibold uppercase tracking-wider mb-4">Liên hệ</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-sm text-background/60">
                <MapPin size={14} className="mt-0.5 shrink-0 text-primary" />
                123 Đường Lê Lợi, Quận 1, TP.HCM
              </li>
              <li className="flex items-center gap-2.5 text-sm text-background/60">
                <Phone size={14} className="shrink-0 text-primary" />
                0901 234 567
              </li>
              <li className="flex items-center gap-2.5 text-sm text-background/60">
                <Mail size={14} className="shrink-0 text-primary" />
                hello@handmadehaven.vn
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-background/10">
        <div className="container mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-xs text-background/40"> 2025 Handmade Haven. Tất cả quyền được bảo lưu.</p>
          <p className="text-xs text-background/40">Thiết kế với  tại Việt Nam</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;