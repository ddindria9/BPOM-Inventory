import React, { useEffect, useState } from "react";
import { api, fmtDate } from "../lib/api";
import { Link } from "react-router-dom";
import { Copy, FileText, ExternalLink, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";

export default function SPBList() {
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const load = async () => {
    const { data } = await api.get("/spb");
    setList(data);
  };
  useEffect(() => { load(); }, []);

  const publicUrl = `${window.location.origin}/spb-public`;
  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("Tautan formulir disalin");
  };

  const openDetail = (spb) => {
    setSelected(spb);
    setShowDetail(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Modul 4</div>
          <h1 className="font-display text-3xl mt-1">Permintaan Barang (SPB)</h1>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-3 flex-wrap">
          <div className="text-xs text-slate-500">Tautan formulir publik:</div>
          <code className="text-xs font-mono-data bg-slate-50 px-2 py-1 rounded break-all">{publicUrl}</code>
          <Button size="sm" variant="outline" onClick={copyLink}><Copy className="w-4 h-4 mr-1" />Salin</Button>
          <a href={publicUrl} target="_blank" rel="noreferrer" className="text-[#1E3A8A]"><ExternalLink className="w-4 h-4" /></a>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500 bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3">Nomor SPB</th>
                <th className="text-left">Tanggal</th>
                <th className="text-left">Pegawai</th>
                <th className="text-left">Fungsi</th>
                <th className="text-right">Item</th>
                <th className="text-left">Status</th>
                <th className="text-right pr-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {list.map((d) => (
                <tr key={d.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono-data text-xs">{d.nomor}</td>
                  <td>{fmtDate(d.created_at)}</td>
                  <td>{d.nama_pegawai || d.nama_peminta || "-"}</td>
                  <td>{d.unit_kerja || d.fungsi || "-"}</td>
                  <td className="text-right">{d.lines?.length || 0}</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${
                      d.status === "PENDING" ? "bg-amber-50 text-amber-700" :
                      d.status === "APPROVED_KF" ? "bg-blue-50 text-blue-700" :
                      d.status === "APPROVED" ? "bg-emerald-50 text-emerald-700" :
                      "bg-red-50 text-red-700"
                    }`}>
                      {d.status === "APPROVED_KF" ? "DISETUJUI KF" : d.status}
                    </span>
                  </td>
                  <td className="text-right pr-4 space-x-2">
                    <button onClick={() => openDetail(d)} className="text-blue-600 hover:underline text-xs">
                      <Eye className="w-4 h-4 inline" /> Detail
                    </button>
                    <Link to={`/surat/spb/${d.id}`} className="inline-flex items-center gap-1 text-[#1E3A8A] hover:underline"><FileText className="w-4 h-4" /> SPB</Link>
                    {d.status === "APPROVED" && d.sbbk_nomor && (
                      <Link to={`/surat/sbbk/${d.id}`} className="ml-2 inline-flex items-center gap-1 text-[#1E3A8A] hover:underline"><FileText className="w-4 h-4" /> SBBK</Link>
                    )}
                  </td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-slate-400">Belum ada permintaan.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail SPB */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detail SPB: {selected?.nomor}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-500">Pegawai:</span> {selected.nama_pegawai}</div>
                <div><span className="text-slate-500">Fungsi:</span> {selected.unit_kerja}</div>
                <div><span className="text-slate-500">Tanggal:</span> {fmtDate(selected.created_at)}</div>
                <div><span className="text-slate-500">Status:</span> {selected.status}</div>
                {selected.alasan_tolak && (
                  <div className="col-span-2"><span className="text-slate-500">Alasan Penolakan:</span> {selected.alasan_tolak}</div>
                )}
                {selected.approver_name && (
                  <div className="col-span-2"><span className="text-slate-500">Disetujui oleh:</span> {selected.approver_name}</div>
                )}
              </div>

              <div className="bg-slate-50 rounded p-3">
                <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  <div className="col-span-4">Nama Barang</div>
                  <div className="col-span-2 text-right">Diminta</div>
                  <div className="col-span-2 text-right">Disetujui</div>
                  <div className="col-span-4">Keterangan</div>
                </div>
                {selected.lines.map((l, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center mb-2 text-sm">
                    <div className="col-span-4">{l.nama || l.item_id}</div>
                    <div className="col-span-2 text-right">{l.jumlah}</div>
                    <div className="col-span-2 text-right">{l.disetujui ?? l.jumlah}</div>
                    <div className="col-span-4">{l.keterangan || "-"}</div>
                  </div>
                ))}
              </div>

              {selected.alasan_tolak && (
                <div className="text-sm text-red-600">Alasan Ditolak: {selected.alasan_tolak}</div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetail(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
