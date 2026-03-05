import AdminLayout from "@/components/admin/AdminLayout";
import { Paintbrush, Clock } from "lucide-react";

export default function AdminSettingsAppearance() {
  return (
    <AdminLayout title="Giao diện">
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
          <Paintbrush className="w-8 h-8 text-gray-600" />
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Tuỳ chỉnh giao diện</h2>
        <p className="text-sm text-gray-500 max-w-xs">
          Thay đổi màu sắc, font chữ và bố cục cửa hàng của bạn.
        </p>
        <div className="mt-6 flex items-center gap-2 text-xs text-gray-600 bg-gray-800 px-4 py-2 rounded-full">
          <Clock className="w-3.5 h-3.5" />
          Sẽ ra mắt sớm
        </div>
      </div>
    </AdminLayout>
  );
}
