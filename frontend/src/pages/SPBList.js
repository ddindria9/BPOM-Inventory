import React, { useEffect, useState } from "react";
import { api, fmtDate } from "../lib/api";
import { Link } from "react-router-dom";
import { Copy, FileText, ExternalLink, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";

export default function SPBList() {
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

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

  const openModal = (item) => {
    setSelected(item);
    setModalOpen(true);
  };

  // Fungsi untuk mendapatkan status label
  const getStatusLabel = (status) => {
    const map = {
      "PENDING": "Menunggu Persetujuan",
      "APPROVED_KF": "Disetujui Kepala Fungsi",
      "APPROVED": "Disetujui",
      "REJECTED": "Ditolak"
    };
    return map[status] || status;
  };

  const getStatusColor = (status) => {
    const map = {
      "PENDING": "bg-amber-50 text-amber-700",
      "APPROVED_KF": "bg-blue-50 text-blue-700",
      "APPROVED": "bg-emerald-50 text-emerald-700",
      "REJECTED": "bg-red-50 text-red-700"
    };
    return map[status] || "bg-gray-50 text-gray-700";
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
                <th className="text-center">Detail</th>
                <th className="text-right pr-4">Surat</th>
              </tr>
            </thead>
            <tbody>
              {list.map((d) => (
                <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => openModal(d)}>
                  <td className="px-4 py-3 font-mono-data text-xs">{d.nomor}</td>
                  <td>{fmtDate(d.created_at)}</td>
                  <td>{d.nama_pegawai || d.nama_peminta || "-"}</td>
                  <td>{d.unit_kerja || d.fungsi || "-"}</td>
                  <td className="text-right">{d.lines?.length || 0}</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${getStatusColor(d.status)}`}>
                      {getStatusLabel(d.status)}
                    </span>
                  </td>
                  <td className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); openModal(d); }}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                  <td className="text-right pr-4">
                    <Link to={`/surat/spb/${d.id}`} className="inline-flex items-center gap-1 text-[#1E3A8A] hover:underline"><FileText className="w-4 h-4" /> SPB</Link>
                    {d.status === "APPROVED" && d.sbbk_nomor && (
                      <Link to={`/surat/sbbk/${d.id}`} className="ml-3 inline-flex items-center gap-1 text-[#1E3A8A] hover:underline"><FileText className="w-4 h-4" /> SBBK</Link>
                    )}
                  </td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-slate-400">Belum ada permintaan.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail SPB */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detail Permintaan: {selected?.nomor}</DialogTitle>
            <DialogDescription>
              Informasi lengkap pengajuan dan status approval.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {/* Informasi Peminta */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Pegawai:</span>
                  <span className="font-medium ml-2">{selected.nama_pegawai || selected.nama_peminta || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-500">NIP:</span>
                  <span className="font-medium ml-2">{selected.nip_pegawai || selected.nip_peminta || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-500">Fungsi:</span>
                  <span className="font-medium ml-2">{selected.unit_kerja || selected.fungsi || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-500">Jabatan:</span>
                  <span className="font-medium ml-2">{selected.jabatan_peminta || "-"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500">Keperluan:</span>
                  <span className="font-medium ml-2">{selected.keperluan || "-"}</span>
                </div>
              </div>

              {/* Daftar Barang */}
              <div>
                <h4 className="font-semibold text-sm">Daftar Barang</h4>
                <table className="w-full text-sm mt-2 border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1">Nama Barang</th>
                      <th className="text-right py-1">Jumlah</th>
                      <th className="text-right py-1">Disetujui</th>
                      <th className="text-left py-1">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.lines?.map((line, idx) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="py-1">{line.nama || line.item_id}</td>
                        <td className="text-right py-1">{line.jumlah}</td>
                        <td className="text-right py-1">{line.disetujui || "-"}</td>
                        <td className="py-1">{line.keterangan || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Riwayat Approval */}
              <div>
                <h4 className="font-semibold text-sm">Riwayat Approval</h4>
                <div className="space-y-2 mt-2 text-sm">
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded">
                    <div>
                      <span className="text-slate-500">Status:</span>
                      <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(selected.status)}`}>
                        {getStatusLabel(selected.status)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Tanggal:</span>
                      <span className="font-medium ml-2">{selected.approved_at ? fmtDate(selected.approved_at) : "-"}</span>
                    </div>
                  </div>

                  {/* Kepala Fungsi */}
                  {selected.kf_approver_name && (
                    <div className="border-l-4 border-blue-500 pl-3 py-1 bg-blue-50 rounded-r">
                      <div className="font-medium">Disetujui oleh Kepala Fungsi</div>
                      <div className="text-xs text-slate-600">
                        {selected.kf_approver_name} • NIP: {selected.kf_approver_nip || "-"} • Paraf: {selected.kf_approver_paraf || "-"}
                      </div>
                    </div>
                  )}

                  {/* Approver Final */}
                  {selected.approver_name && (
                    <div className="border-l-4 border-emerald-500 pl-3 py-1 bg-emerald-50 rounded-r">
                      <div className="font-medium">Disetujui oleh Approver</div>
                      <div className="text-xs text-slate-600">
                        {selected.approver_name} • NIP: {selected.approver_nip || "-"} • Paraf: {selected.approver_paraf || "-"}
                      </div>
                    </div>
                  )}

                  {/* Alasan Tolak */}
                  {selected.alasan_tolak && (
                    <div className="border-l-4 border-red-500 pl-3 py-1 bg-red-50 rounded-r">
                      <div className="font-medium text-red-700">Ditolak</div>
                      <div className="text-xs text-slate-600">
                        Alasan: {selected.alasan_tolak}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
