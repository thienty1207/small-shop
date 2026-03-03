import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { formatPrice } from "@/data/products";

const mockOrders = [
  { id: "HMH001", date: "2024-12-15", status: "Đã giao", total: 430000, items: 3 },
  { id: "HMH002", date: "2025-01-20", status: "Đang giao", total: 220000, items: 1 },
];

const Account = () => {
  const [activeTab, setActiveTab] = useState("profile");

  const tabs = [
    { key: "profile", label: "Thông tin" },
    { key: "orders", label: "Đơn hàng" },
    { key: "addresses", label: "Địa chỉ" },
  ];

  return (
    <div className="min-h-screen bg-surface-pink">
      <Header />
      <div className="container mx-auto px-4 md:px-8 py-8">
        <h1 className="font-display text-2xl font-bold text-foreground mb-6">Tài Khoản</h1>
        <div className="flex gap-4 border-b border-border mb-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === "profile" && (
          <div className="max-w-md bg-card rounded-xl border border-border p-6 space-y-4">
            <input defaultValue="Nguyễn Văn A" className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground" />
            <input defaultValue="email@example.com" className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground" />
            <input defaultValue="0901234567" className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground" />
            <button className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Lưu thay đổi</button>
          </div>
        )}

        {activeTab === "orders" && (
          <div className="space-y-4">
            {mockOrders.map((order) => (
              <Link key={order.id} to={`/account/orders/${order.id}`} className="block bg-card rounded-xl border border-border p-4 hover:border-primary transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">#{order.id}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{order.date} · {order.items} sản phẩm</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-medium px-2 py-1 rounded-md ${order.status === "Đã giao" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{order.status}</span>
                    <p className="text-sm text-price font-semibold mt-1">{formatPrice(order.total)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {activeTab === "addresses" && (
          <div className="max-w-md bg-card rounded-xl border border-border p-6">
            <p className="text-sm text-foreground font-medium">Địa chỉ mặc định</p>
            <p className="text-sm text-muted-foreground mt-1">123 Đường Nguyễn Huệ, Quận 1, TP.HCM</p>
            <button className="mt-4 px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors">
              Chỉnh sửa
            </button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Account;
