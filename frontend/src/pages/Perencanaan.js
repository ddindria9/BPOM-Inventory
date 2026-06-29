import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Perencanaan() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadItems = async () => {
    try {
      const { data } = await api.get("/perencanaan");
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error("Gagal memuat data perencanaan");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  // ============ EXPORT FUNCTIONS ============
  const exportToExcel = () => {
    if (!items.length) {
      toast.error("Tidak ada data untuk diexport");
      return;
    }
    const exportData = items.map((item) => ({
      Kode: item.kode,
      Nama: item.nama,
      Satuan: item.satuan,
      Stok: item.stok,
      Kadaluarsa: item.expiry_date || "-",
      Status: item.status === "expiring_soon" ? "Kadaluarsa" : "Stok Menipis",
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Perencanaan");
    XLSX.writeFile(wb, `perencanaan_pengadaan.xlsx`);
    toast.success("File Excel berhasil diunduh");
  };

  const exportToPDF = () => {
    if (!items.length) {
      toast.error("Tidak ada data untuk diexport");
      return;
    }
    const doc = new jsPDF();
    doc.text("Perencanaan Pengadaan", 14, 20);
    doc.text(`Tanggal: ${new Date().toLocaleDateString("id-ID")}`, 14, 28);
    const tableData = items.map((item) => [
      item.kode,
      item.nama,
      item.satuan,
      item.stok,
      item.expiry_date || "-",
      item.status === "expiring_soon" ? "Kadaluarsa" : "Stok Menipis",
    ]);
    autoTable(doc, {
      head: [["Kode", "Nama", "Satuan", "Stok", "Kadaluarsa", "Status"]],
      body: tableData,
      startY: 35,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 58, 138] },
    });
    doc.save(`perencanaan_pengadaan.pdf`);
    toast.success("File PDF berhasil diunduh");
  };

  // ============ RENDER ============
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
        <div className="flex gap-2">
          <Button 
            onClick={exportToExcel}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            📊 Excel
          </Button>
          <Button 
            onClick={exportToPDF}
            className="bg-red-600 hover:bg-red-700"
          >
            📄 PDF
          </Button>
        </div>
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
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">
                    Semua barang dalam kondisi stok aman.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-mono-data text-xs">{item.kode}</td>
                    <td className="font-medium">{item.nama}</td>
                    <td>{item.satuan}</td>
                    <td className="text-right font-semibold text-red-600">{item.stok}</td>
                    <td>{item.expiry_date || "-"}</td>
                    <td>
                      {item.status === "expiring_soon" ? (
                        <span className="text-xs text-red-600 font-semibold">⚠️ Kadaluarsa</span>
                      ) : (
                        <span className="text-xs text-amber-600">Stok Menipis</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
