import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

export default function Perencanaan() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadItems = async () => {
    try {
      const { data } = await api.get("/perencanaan");
      setItems(data);
    } catch (e) {
      toast.error("Gagal memuat data perencanaan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  if (loading) return <div className="text-slate-500">Memuat...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Modul 6</div>
          <h1 className="font-display text-3xl mt-1">Perencanaan Pengadaan</h1>
          <div className="text-sm text-slate-500 mt-1">
            Barang dengan stok ≤ 5 (perlu segera diadakan)
          </div>
        </div>
        <Button 
          onClick={() => window.open("/surat/perencanaan", "_blank")}
          className="bg-[#1E3A8A] hover:bg-[#1E2A6B]"
        >
          📄 Export ke Google Docs
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500 bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3">Kode</th>
                <th className="text-left">Nama</th>
                <th className="text-left">Satuan</th>
                <th className="text-right">Stok</th>
                <th className="text-left">Kadaluarsa</th>
                <th className="text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-mono-data text-xs">{item.kode}</td>
                  <td className="font-medium">{item.nama}</td>
                  <td>{item.satuan}</td>
                  <td className="text-right font-semibold text-red-600">{item.stok}</td>
                  <td>{item.expiry_date || "-"}</td>
                  <td>
                    {item.status === "expiring_soon" && (
                      <span className="text-xs text-red-600 font-semibold">⚠️ Kadaluarsa</span>
                    )}
                    <span className="text-xs text-amber-600">Stok Menipis</span>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-slate-400">
                  ✅ Semua barang dalam kondisi stok aman.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
