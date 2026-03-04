import AdminLayout from "@/components/admin/AdminLayout";
import { Package, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminProducts() {
  return (
    <AdminLayout title="Quản lý Sản phẩm">
      <div className="space-y-4">
        {/* Actions bar */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">Danh sách tất cả sản phẩm</p>
          <Button size="sm" className="gap-2 bg-rose-500 hover:bg-rose-600 text-white">
            <PlusCircle className="w-4 h-4" />
            Thêm sản phẩm
          </Button>
        </div>

        {/* Placeholder */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
            <Package className="w-6 h-6 text-gray-500" />
          </div>
          <p className="text-sm text-gray-400">Chức năng quản lý sản phẩm đang phát triển.</p>
          <p className="text-xs text-gray-600">API endpoint: GET /api/admin/products</p>
        </div>
      </div>
    </AdminLayout>
  );
}
