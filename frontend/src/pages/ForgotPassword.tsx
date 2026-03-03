import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const ForgotPassword = () => {
  return (
    <div className="min-h-screen bg-surface-pink">
      <Header />
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-sm mx-auto bg-card rounded-xl border border-border p-6">
          <h1 className="font-display text-xl font-bold text-foreground text-center mb-2">Quên Mật Khẩu</h1>
          <p className="text-sm text-muted-foreground text-center mb-6">Nhập email để nhận link đặt lại mật khẩu.</p>
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="Email" className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground" />
            <button className="w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              Gửi link đặt lại
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link to="/login" className="hover:text-foreground">Quay lại đăng nhập</Link>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ForgotPassword;
