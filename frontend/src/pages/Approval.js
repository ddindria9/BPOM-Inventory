import React, { useEffect, useState } from "react";
import { api, fmtDate } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function Approval() {
  const [items, setItems] = useState([]);
  const [pending, setPending] = useState([]);
  const [selected, setSelected] = useState(null);
  const [alasan, setAlasan] = useState("");
  const [checkedApprove, setCheckedApprove] = useState(false);
  const [lineAdjustments, setLineAdjustments] = useState({});

  const load = async () => {
    try {
      // Ambil semua SPB, tanpa filter status
      const [s, i] = await Promise.all([
        api.get("/spb"), // tidak ada params status
        api.get("/items")
      ]);
      // Filter: tampilkan yang status PENDING atau APPROVED_KF
      const pendingList = s.data.filter(
        item => item.status === "PENDING" || item.status === "APPROVED_KF"
      );
      setPending(pendingList);
      setItems(i.data);
    } catch (e) {
      toast.error("Gagal memuat data approval");
    }
  };
  useEffect(() => { load(); }, []);

  const nameOf = (id) => items.find(x => x.id === id)?.nama || id;

  const handleSelect = (spb) => {
    setSelected(spb);
    const adjustments = {};
    spb.lines.forEach((l, idx) => {
      adjustments[idx] = {
        item_id: l.item_id,
        disetujui: l.jumlah,
        keterangan: l.keterangan || ""
      };
    });
    setLineAdjustments(adjustments);
    setCheckedApprove(false);
    setAlasan("");
  };

  const handleAdjustmentChange = (idx, field, value) => {
    setLineAdjustments(prev => ({
      ...prev,
      [idx]: { ...prev[idx], [field]: value }
    }));
  };

  const act = async (action) => {
    if (!selected) return;
    if (action === "APPROVE") {
      if (!checkedApprove) return toast.error("Harap centang 'Saya menyetujui'");
    }
    if (action === "REJECT" && !alasan) return toast.error("Isi alasan penolakan");

    try {
      const linesData = Object.values(lineAdjustments).map(l => ({
        item_id: l.item_id,
        disetujui: Number(l.disetujui),
        keterangan: l.keterangan || ""
      }));

      await api.post(`/spb/${selected.id}/action`, {
        action,
        alasan: action === "REJECT" ? alasan : "",
        paraf: "",
        lines: linesData
      });

      toast.success(action === "APPROVE" ? "Disetujui & SBBK dibuat" : "Permintaan ditolak");
      setSelected(null);
      setAlasan("");
      setCheckedApprove(false);
      setLineAdjustments({});
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Gagal");
    }
  };

  // Tampilan status badge
  const statusBadge = (status) => {
    const map = {
      PENDING: { label: "Menunggu KF", className: "bg-amber-50 text-amber-700" },
      APPROVED_KF: { label: "Disetujui KF", className: "bg-blue-50 text-blue-700" },
    };
    const s = map[status] || { label: status, className: "bg-gray-50 text-gray-700" };
    return <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${s.className}`}>{s.label}</span>;
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Modul 5</div>
        <h1 className="font-display text-3xl mt-1">Approval / Verifikasi</h1>
        <div className="text-sm text-slate-500 mt-1">{pending.length} permintaan menunggu persetujuan</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {pending.map((s) => (
          <div key={s.id} data-testid={`approval-card-${s.nomor}`} className="bg-white border border-slate-200 rounded-lg p-5 hover:-translate-y-0.5 transition-transform">
            <div className="flex items-center justify-between">
              <div className="font-mono-data text-sm">{s.nomor}</div>
              <span className="text-xs text-slate-500">{fmtDate(s.created_at)}</span>
            </div>
            <div className="mt-3">
              <div className="font-display text-lg">{s.nama_pegawai}</div>
              <div className="text-sm text-slate-500">{s.unit_kerja}</div>
              {s.keperluan && <div className="text-sm mt-2 text-slate-700">Keperluan: {s.keperluan}</div>}
            </div>
            <div className="mt-2 flex items-center gap-2">
              {statusBadge(s.status)}
              {s.status === "APPROVED_KF" && (
                <span className="text-xs text-blue-600">(menunggu approval final)</span>
              )}
            </div>
            <div className="mt-3 border-t border-slate-100 pt-3 space-y-1">
              {s.lines.map((l, i) => (
                <div key={i} className="text-sm flex justify-between">
                  <span>{nameOf(l.item_id)}</span>
                  <span className="font-semibold">{l.jumlah}</span>
                </div>
              ))}
            </div>
            <Button onClick={() => handleSelect(s)} className="w-full mt-4 bg-[#1E3A8A] hover:bg-[#1E2A6B]">Tinjau</Button>
          </div>
        ))}
        {pending.length === 0 && <div className="lg:col-span-2 text-center text-slate-400 py-12 bg-white border border-slate-200 rounded-lg">Tidak ada permintaan menunggu.</div>}
      </div>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Verifikasi {selected?.nomor}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="text-sm">
                <span className="text-slate-500">Pegawai:</span> {selected.nama_pegawai} · {selected.unit_kerja}
                <span className="ml-4 text-xs text-blue-600">
                  ({selected.status === "APPROVED_KF" ? "Sudah disetujui KF" : "Menunggu KF"})
                </span>
              </div>

              <div className="bg-slate-50 rounded p-3">
                <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  <div className="col-span-4">Nama Barang</div>
                  <div className="col-span-2 text-right">Diminta</div>
                  <div className="col-span-2 text-right">Disetujui</div>
                  <div className="col-span-4">Keterangan</div>
                </div>
                {selected.lines.map((l, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center mb-2">
                    <div className="col-span-4 text-sm">{nameOf(l.item_id)}</div>
                    <div className="col-span-2 text-right text-sm font-semibold">{l.jumlah}</div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="0"
                        value={lineAdjustments[idx]?.disetujui ?? l.jumlah}
                        onChange={(e) => handleAdjustmentChange(idx, 'disetujui', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="col-span-4">
                      <Input
                        type="text"
                        placeholder="Keterangan (opsional)"
                        value={lineAdjustments[idx]?.keterangan || ""}
                        onChange={(e) => handleAdjustmentChange(idx, 'keterangan', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="approve-check"
                  checked={checkedApprove}
                  onChange={(e) => setCheckedApprove(e.target.checked)}
                  className="w-4 h-4 text-[#1E3A8A]"
                />
                <Label htmlFor="approve-check" className="text-sm font-normal">Saya menyetujui permintaan ini</Label>
              </div>

              <div>
                <Label>Alasan (jika menolak)</Label>
                <Textarea
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                  rows={2}
                  placeholder="Isi alasan penolakan jika menolak"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => act("REJECT")} className="border-red-300 text-red-700">
              <XCircle className="w-4 h-4 mr-1" />Tolak
            </Button>
            <Button onClick={() => act("APPROVE")} className="bg-[#1E3A8A] hover:bg-[#1E2A6B]">
              <CheckCircle2 className="w-4 h-4 mr-1" />Setujui
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
