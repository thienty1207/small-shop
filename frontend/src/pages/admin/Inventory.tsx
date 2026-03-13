import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Layers, AlertCircle, Search, Package } from "lucide-react";
import { adminGet } from "@/lib/admin-api";

interface InventoryRow {
  variant_id:     string;
  product_id:     string;
  product_name:   string;
  brand:          string | null;
  ml:             number;
  price:          number;
  original_price: number | null;
  stock:          number;
}

function formatVnd(n: number) {
  return n.toLocaleString("vi-VN") + " ₫";
}

export default function AdminInventory() {
  const [rows,    setRows]    = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [search,  setSearch]  = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminGet<InventoryRow[]>("/api/admin/inventory");
      setRows(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.product_name.toLowerCase().includes(q) ||
      (r.brand ?? "").toLowerCase().includes(q)
    );
  });

  // Group by product for display
  const grouped: { productId: string; name: string; brand: string | null; variants: InventoryRow[] }[] = [];
  filtered.forEach((row) => {
    const last = grouped[grouped.length - 1];
    if (last && last.productId === row.product_id) {
      last.variants.push(row);
    } else {
      grouped.push({ productId: row.product_id, name: row.product_name, brand: row.brand, variants: [row] });
    }
  });

  // Stats
  const totalVariants = rows.length;
  const totalStock    = rows.reduce((s, r) => s + r.stock, 0);
  const outOfStock    = rows.filter((r) => r.stock === 0).length;

  return (
    <AdminLayout title="Quản lý Tồn Kho">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-1">Tổng dung tích</p>
          <p className="text-lg font-bold text-white">{totalVariants}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-1">Tổng tồn kho</p>
          <p className="text-lg font-bold text-white">{totalStock}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mb-1">Hết hàng</p>
          <p className={`text-lg font-bold ${outOfStock > 0 ? "text-red-400" : "text-emerald-400"}`}>{outOfStock}</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 placeholder:text-gray-600"
            placeholder="Tìm theo tên sản phẩm hoặc thương hiệu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={load}
          className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700"
        >
          Làm mới
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Đang tải tồn kho...</div>
      ) : error ? (
        <div className="text-center py-20 text-red-400 flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <Layers className="w-8 h-8 mx-auto mb-2 text-gray-700" />
          <p>Chưa có dung tích nào.</p>
          <p className="text-xs mt-1 text-gray-700">Hãy thêm sản phẩm kèm dung tích trong mục Quản lý Sản phẩm.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((g) => (
            <div key={g.productId} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              {/* Product header */}
              <div className="px-5 py-3.5 border-b border-gray-800/60 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-gray-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{g.name}</p>
                  {g.brand && (
                    <p className="text-[10px] text-rose-400 font-medium uppercase tracking-wider">{g.brand}</p>
                  )}
                </div>
                <div className="ml-auto text-[10px] text-gray-600">
                  {g.variants.length} dung tích · {g.variants.reduce((s, v) => s + v.stock, 0)} chai
                </div>
              </div>

              {/* Variant rows — read-only */}
              <div className="divide-y divide-gray-800/40">
                {g.variants.map((row) => (
                  <div key={row.variant_id} className="px-5 py-3 flex items-center gap-4 hover:bg-gray-800/20 transition-colors">
                    {/* Size badge */}
                    <div className="w-16 text-center">
                      <span className="inline-block bg-gray-800 text-white text-xs font-semibold px-2.5 py-1 rounded-lg">
                        {row.ml}ml
                      </span>
                    </div>

                    {/* Prices */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium">{formatVnd(row.price)}</p>
                      {row.original_price && row.original_price > row.price && (
                        <p className="text-[11px] text-gray-500 line-through">{formatVnd(row.original_price)}</p>
                      )}
                    </div>

                    {/* Stock display (read-only) */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Tồn:</span>
                      <span className={`text-sm font-semibold ${row.stock > 0 ? "text-white" : "text-red-400"}`}>
                        {row.stock}
                      </span>
                    </div>

                    {/* Status */}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                      row.stock > 0
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}>
                      {row.stock > 0 ? "Còn hàng" : "Hết hàng"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
