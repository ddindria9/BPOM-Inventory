import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, fmtDate, NAMA_BULAN_ID } from "../lib/api";
import { Button } from "../components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";

export default function SuratPreview() {
  const { type, id } = useParams();
  const [spb, setSpb] = useState(null);
  const [items, setItems] = useState([]);
  const [templateUrl, setTemplateUrl] = useState(localStorage.getItem("surat_template_url") || "");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/spb/${id}`);
        setSpb(data);
        const it = await api.get("/items").catch(() => ({ data: [] }));
        setItems(it.data);
      } catch {}
    })();
  }, [id]);

  if (!spb) return <div className="min-h-screen grid place-items-center text-slate-500">Memuat...</div>;
  const isSBBK = type === "sbbk";
  const nameOf = (iid) => items.find(x => x.id === iid)?.nama || iid;
  const satOf = (iid) => items.find(x => x.id === iid)?.satuan || "";

  const today = new Date();
  const tglIndo = `Jember, ${today.getDate()} ${NAMA_BULAN_ID[today.getMonth()]} ${today.getFullYear()}`;

  return (
    <div className="min-h-screen bg-slate-100 py-6">
      <div className="max-w-4xl mx-auto px-4">
        <div className="no-print flex items-center justify-between mb-4">
          <button onClick={() => window.history.back()} className="flex items-center gap-1 text-slate-600 hover:text-slate-900"><ArrowLeft className="w-4 h-4" /> Kembali</button>
          <div className="flex gap-2 items-center">
            <input
              type="url"
              placeholder="URL Template GDoc (opsional)..."
              value={templateUrl}
              onChange={(e) => { setTemplateUrl(e.target.value); localStorage.setItem("surat_template_url", e.target.value); }}
              className="h-9 px-3 border border-slate-200 rounded text-sm w-72"
            />
            {templateUrl && <a href={templateUrl} target="_blank" rel="noreferrer" className="text-sm text-[#1E3A8A] underline">Buka Template</a>}
            <Button data-testid="surat-print" onClick={() => window.print()} className="bg-[#1E3A8A] hover:bg-[#1E2A6B]"><Printer className="w-4 h-4 mr-1" />Cetak PDF</Button>
          </div>
        </div>

        <div className="print-area bg-white shadow-sm border border-slate-200 p-10 sm:p-14">
          {/* Kop Surat */}
          <div className="kop-surat flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-[#1E3A8A] text-white grid place-items-center text-2xl font-bold">BP</div>
            <div className="flex-1 text-center">
              <div className="text-xs uppercase tracking-widest">Kementerian Kesehatan Republik Indonesia</div>
              <div className="lembaga text-lg">BADAN PENGAWAS OBAT DAN MAKANAN</div>
              <div className="lembaga text-xl font-bold">LOKA POM JEMBER</div>
              <div className="text-[11px] mt-1">Jl. Mastrip No. 21, Jember · Telp. (0331) 480000 · email: lokapom_jember@pom.go.id</div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mt-8">
            <div className="font-display text-xl font-bold underline tracking-wider">
              {isSBBK ? "SURAT BUKTI BARANG KELUAR (SBBK)" : "SURAT PERMINTAAN BARANG (SPB)"}
            </div>
            <div className="text-sm mt-1">Nomor: <span className="font-mono-data">{isSBBK ? spb.sbbk_nomor : spb.nomor}</span></div>
          </div>

          {/* Info */}
          <div className="mt-6 text-sm">
            <table>
              <tbody>
                <tr><td className="pr-4 align-top">Nama Peminta</td><td className="pr-2">:</td><td className="font-semibold">{spb.nama_peminta}</td></tr>
                <tr><td className="pr-4 align-top">Unit Kerja</td><td className="pr-2">:</td><td>{spb.unit_kerja}</td></tr>
                <tr><td className="pr-4 align-top">Keperluan</td><td className="pr-2">:</td><td>{spb.keperluan || "-"}</td></tr>
                <tr><td className="pr-4 align-top">Tanggal</td><td className="pr-2">:</td><td>{fmtDate(spb.created_at)}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Tabel barang */}
          <table className="w-full mt-6 text-sm border-collapse">
            <thead>
              <tr className="border-y-2 border-black">
                <th className="py-2 px-2 text-left w-12">No</th>
                <th className="py-2 px-2 text-left">Nama Barang</th>
                <th className="py-2 px-2 text-center w-24">Jumlah</th>
                <th className="py-2 px-2 text-center w-20">Satuan</th>
                <th className="py-2 px-2 text-left">Keperluan</th>
              </tr>
            </thead>
            <tbody>
              {spb.lines.map((l, i) => (
                <tr key={i} className="border-b border-slate-300">
                  <td className="py-2 px-2">{i + 1}</td>
                  <td className="py-2 px-2">{nameOf(l.item_id)}</td>
                  <td className="py-2 px-2 text-center font-semibold">{l.jumlah}</td>
                  <td className="py-2 px-2 text-center">{satOf(l.item_id)}</td>
                  <td className="py-2 px-2">{l.keperluan || spb.keperluan || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Tanda tangan */}
          <div className="mt-12 grid grid-cols-2 gap-12 text-sm">
            <div>
              <div>{isSBBK ? "Penerima," : "Peminta,"}</div>
              <div className="h-20"></div>
              <div className="border-t border-black pt-1 font-semibold">{spb.nama_peminta}</div>
              <div className="text-xs">{spb.unit_kerja}</div>
            </div>
            <div className="text-right">
              <div>{tglIndo}</div>
              <div className="mt-1">{isSBBK ? "Pengelola Gudang," : "Mengetahui / Menyetujui,"}</div>
              <div className="h-16 flex items-end justify-end">
                {spb.approver_paraf && <div className="font-display italic text-xl text-[#1E3A8A]">{spb.approver_paraf}</div>}
              </div>
              <div className="border-t border-black pt-1 font-semibold">{spb.approver_name || "_______________________"}</div>
              <div className="text-xs">NIP. _______________________</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
