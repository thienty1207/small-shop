import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <Link to="/policy" className="hover:text-foreground transition-colors">
              Chính sách vận chuyển
            </Link>
            <Link to="/policy" className="hover:text-foreground transition-colors">
              FAQ
            </Link>
            <Link to="/policy" className="hover:text-foreground transition-colors">
              Chính sách bảo mật
            </Link>
            <Link to="/policy" className="hover:text-foreground transition-colors">
              Điều khoản dịch vụ
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              <Facebook size={18} />
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              <Twitter size={18} />
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              <Instagram size={18} />
            </a>
          </div>
        </div>
        <div className="text-center text-xs text-muted-foreground mt-6">
          © 2024 Handmade Haven. Tất cả quyền được bảo lưu.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
