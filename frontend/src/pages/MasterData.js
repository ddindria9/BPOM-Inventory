import React, { useEffect, useState } from "react";
import { api, fmtIDR } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../components/ui/dialog";
import { Switch } from "../components/ui/switch";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

const emptyItem = { kode: "", nama: "", kategori: "", satuan: "pcs", harga: 0, stok_min: 0, is_reagen: false, expiry_date: "" };

export default function MasterData() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyItem);
  const [editId, setEditId] = useState(null);

  const load = async () => {
    const { data } = await api.get("/items");
    setItems(data);
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    try {
      const payload = { ...form, harga: Number(form.harga), stok_min: Number(form.stok_min) };
      if (editId) await api.patch(`/items/${editId}`, payload);
      else await api.post("/items", payload);
      toast.success(editId ? "Item diperbarui" : "Item ditambahkan");
      setOpen(false); setForm(emptyItem); setEditId(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Gagal menyimpan"); }
  };

  const startEdit = (it) => { setForm({ ...emptyItem, ...it }); setEditId(it.id); setOpen(true); };
  const remove = async (it) => {
    if (!window.confirm(`Hapus ${it.nama}?`)) return;
    await api.delete(`/items/${it.id}`); toast.success("Dihapus"); load();
  };

  const filtered = items.filter(i => (i.kode + i.nama + i.kategori).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Modul 2</div>
          <h1 className="font-display text-3xl text-slate-900 mt-1">Data Master Barang</h1>
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input data-testid="master-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari kode / nama..." className="pl-9 w-64" />
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(emptyItem); setEditId(null); } }}>
            <DialogTrigger asChild>
              <Button data-testid="master-add-button" className="bg-[#1E3A8A] hover:bg-[#1E2A6B]"><Plus className="w-4 h-4 mr-1" /> Tambah Barang</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editId ? "Edit" : "Tambah"} Barang</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-1"><Label>Kode</Label><Input data-testid="form-kode" value={form.kode} onChange={(e) => setForm({ ...form, kode: e.target.value })} /></div>
                <div className="col-span-1"><Label>Satuan</Label><Input value={form.satuan} onChange={(e) => setForm({ ...form, satuan: e.target.value })} /></div>
                <div className="col-span-2"><Label>Nama Barang</Label><Input data-testid="form-nama" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} /></div>
                <div className="col-span-2"><Label>Kategori</Label><Input value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} /></div>
                <div><Label>Harga Satuan</Label><Input type="number" value={form.harga} onChange={(e) => setForm({ ...form, harga: e.target.value })} /></div>
                <div><Label>Stok Minimum</Label><Input type="number" value={form.stok_min} onChange={(e) => setForm({ ...form, stok_min: e.target.value })} /></div>
                <div className="col-span-2 flex items-center gap-3 pt-2">
                  <Switch checked={form.is_reagen} onCheckedChange={(v) => setForm({ ...form, is_reagen: v })} />
                  <Label>Barang Reagen (punya kadaluarsa)</Label>
                </div>
                {form.is_reagen && (
                  <div className="col-span-2"><Label>Tanggal Kadaluarsa</Label><Input type="date" value={form.expiry_date || ""} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></div>
                )}
              </div>
              <DialogFooter><Button data-testid="form-submit" onClick={submit} className="bg-[#1E3A8A] hover:bg-[#1E2A6B]">Simpan</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-600">
              <tr>
                <th className="text-left px-4 py-3">Kode</th>
                <th className="text-left">Nama</th>
                <th className="text-left">Kategori</th>
                <th className="text-left">Satuan</th>
                <th className="text-right">Harga</th>
                <th className="text-right">Stok</th>
                <th className="text-right">Min</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => (
                <tr key={it.id} data-testid={`item-row-${it.kode}`} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono-data text-xs">{it.kode}</td>
                  <td>{it.nama}{it.is_reagen && <span className="ml-2 px-2 py-0.5 text-[10px] uppercase tracking-wider rounded bg-red-50 text-red-600">Reagen</span>}</td>
                  <td className="text-slate-500">{it.kategori}</td>
                  <td>{it.satuan}</td>
                  <td className="text-right">{fmtIDR(it.harga)}</td>
                  <td className={`text-right font-semibold ${it.stok <= it.stok_min ? "text-red-600" : ""}`}>{it.stok}</td>
                  <td className="text-right text-slate-500">{it.stok_min}</td>
                  <td className="text-right pr-4">
                    <button data-testid={`item-edit-${it.kode}`} onClick={() => startEdit(it)} className="p-1.5 hover:bg-slate-100 rounded"><Pencil className="w-4 h-4 text-slate-600" /></button>
                    <button onClick={() => remove(it)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4 text-red-600" /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">Belum ada data. Klik "Tambah Barang".</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
