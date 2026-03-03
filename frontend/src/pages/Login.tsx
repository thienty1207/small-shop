import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen bg-surface-pink">
      <Header />
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-sm mx-auto bg-card rounded-xl border border-border p-6">
          <h1 className="font-display text-xl font-bold text-foreground text-center mb-6">Đăng Nhập</h1>
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground"
            />
            <input
              type="password"
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground"
            />
            <button className="w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              Đăng nhập
            </button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <Link to="/forgot-password" className="hover:text-foreground">Quên mật khẩu?</Link>
            <span className="mx-2">·</span>
            <Link to="/register" className="hover:text-foreground">Đăng ký</Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Login;
