import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { toast } from "sonner";

export default function MasterData() {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, low_stock, expiring_soon

  const loadItems = async () => {
    try {
      const { data } = await api.get("/items");
      setItems(data);
      setFilteredItems(data);
    } catch (e) {
      toast.error("Gagal memuat data barang");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    if (filter === "all") {
      setFilteredItems(items);
    } else {
      setFilteredItems(items.filter(item => item.status === filter));
    }
  }, [filter, items]);

  const getStatusClass = (item) => {
    if (item.status === "expiring_soon") return "text-red-600 font-semibold";
    if (item.status === "low_stock") return "text-amber-600";
    return "";
  };

  if (loading) return <div className="text-slate-500">Memuat...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Modul 2</div>
          <h1 className="font-display text-3xl mt-1">Data Master Barang</h1>
        </div>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-10 px-3 border border-slate-200 rounded-md text-sm bg-white"
          >
            <option value="all">Semua Barang</option>
            <option value="low_stock">Stok Menipis (≤ 5)</option>
            <option value="expiring_soon">Mendekati Kadaluarsa (6 bulan)</option>
          </select>
          <Button className="bg-[#1E3A8A] hover:bg-[#1E2A6B]">+ Tambah</Button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500 bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3">Kode</th>
                <th className="text-left">Nama</th>
                <th className="text-left">Kategori</th>
                <th className="text-left">Satuan</th>
                <th className="text-right">Stok</th>
                <th className="text-left">Kadaluarsa</th>
                <th className="text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-mono-data text-xs">{item.kode}</td>
                  <td className={getStatusClass(item)}>{item.nama}</td>
                  <td>{item.kategori}</td>
                  <td>{item.satuan}</td>
                  <td className="text-right">{item.stok}</td>
                  <td>{item.expiry_date || "-"}</td>
                  <td>
                    {item.status === "expiring_soon" && (
                      <span className="text-xs text-red-600 font-semibold">⚠️ Kadaluarsa</span>
                    )}
                    {item.status === "low_stock" && (
                      <span className="text-xs text-amber-600">Stok Menipis</span>
                    )}
                    {item.status === "normal" && (
                      <span className="text-xs text-green-600">Normal</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-slate-400">Tidak ada barang</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
