import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const Register = () => {
  return (
    <div className="min-h-screen bg-surface-pink">
      <Header />
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-sm mx-auto bg-card rounded-xl border border-border p-6">
          <h1 className="font-display text-xl font-bold text-foreground text-center mb-6">Đăng Ký</h1>
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <input placeholder="Họ và tên" className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground" />
            <input type="email" placeholder="Email" className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground" />
            <input type="password" placeholder="Mật khẩu" className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground" />
            <input type="password" placeholder="Xác nhận mật khẩu" className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground" />
            <button className="w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              Đăng ký
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Đã có tài khoản? <Link to="/login" className="hover:text-foreground">Đăng nhập</Link>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Register;
