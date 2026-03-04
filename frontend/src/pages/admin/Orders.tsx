import AdminLayout from "@/components/admin/AdminLayout";
import { ShoppingCart } from "lucide-react";

export default function AdminOrders() {
  return (
    <AdminLayout title="Quản lý Đơn hàng">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">Tất cả đơn hàng của khách hàng</p>
        </div>

        {/* Placeholder */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
            <ShoppingCart className="w-6 h-6 text-gray-500" />
          </div>
          <p className="text-sm text-gray-400">Chức năng quản lý đơn hàng đang phát triển.</p>
          <p className="text-xs text-gray-600">API endpoint: GET /api/admin/orders</p>
        </div>
      </div>
    </AdminLayout>
  );
}
