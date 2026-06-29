import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = import.meta.env.VITE_API_URL || "https://bpom-inventory.onrender.com";

export default function SPBPublic() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [lines, setLines] = useState([{ item_id: "", jumlah: 1, keperluan: "" }]);
  const [submitted, setSubmitted] = useState(null);
  const [loading, setLoading] = useState(false);
  const [keperluan, setKeperluan] = useState("");

  // Redirect ke login jika belum login
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [authLoading, user, navigate]);

  // Pastikan items selalu array
  useEffect(() => {
    setItems([]); // reset ke array kosong
  }, []);
  
  // Ambil daftar barang (hanya jika user sudah login)
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    axios.get(`${BACKEND_URL}/api/public/items`)
      .then(res => {
        setItems(res.data);
        setLoading(false);
      })
      .catch(() => {
        setItems([]);
        setLoading(false);
      });
  }, [user]);

  const submit = async () => {
    if (lines.some(l => !l.item_id || !l.jumlah)) {
      return toast.error("Lengkapi daftar barang");
    }
    try {
      const { data } = await axios.post(`${BACKEND_URL}/api/spb`, {
        nama_peminta: user.name,
        nip_peminta: user.nip || "",
        unit_kerja: user.unit_kerja || "",
        keperluan: keperluan,
        lines: lines.map(l => ({
          item_id: l.item_id,
          jumlah: Number(l.jumlah),
          keperluan: l.keperluan
        })),
      });
      setSubmitted(data);
      toast.success("Permintaan terkirim");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Gagal mengirim permintaan");
    }
  };

  if (authLoading) {
    return <div className="min-h-screen bg-slate-50 grid place-items-center">Memuat...</div>;
  }

  if (!user) {
    return <div className="min-h-screen bg-slate-50 grid place-items-center">Redirecting...</div>;
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 grid place-items-center p-6">
        <div className="bg-white border border-slate-200 rounded-lg p-8 max-w-lg w-full text-center">
          <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-600" />
          <h2 className="font-display text-2xl mt-4">Permintaan Terkirim</h2>
          <p className="text-slate-500 mt-2">Nomor SPB Anda:</p>
          <div className="font-mono-data text-xl my-3 px-4 py-3 bg-slate-50 rounded inline-block">{submitted.nomor}</div>
          <p className="text-sm text-slate-500 mt-4">Permintaan akan diproses oleh pejabat verifikator. Mohon tunggu konfirmasi.</p>
          <Button 
            data-testid="spb-public-new" 
            onClick={() => { 
              setSubmitted(null); 
              setLines([{ item_id: "", jumlah: 1, keperluan: "" }]);
              setKeperluan("");
            }} 
            className="mt-6 bg-[#1E3A8A]"
          >
            Buat Permintaan Baru
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <img src="/logo-bpom.png" alt="BPOM" className="w-10 h-10 object-contain" />
          <div>
            <div className="font-display font-bold text-slate-900">BALAI POM DI JEMBER</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">Formulir Permintaan Barang (SPB)</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8">
          {/* Informasi Peminta (auto-fill) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 p-3 bg-slate-50 rounded">
            <div>
              <Label className="text-xs text-slate-500">Nama Pegawai</Label>
              <div className="font-medium">{user.name}</div>
            </div>
            <div>
              <Label className="text-xs text-slate-500">NIP</Label>
              <div className="font-medium">{user.nip || '-'}</div>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Fungsi</Label>
              <div className="font-medium">{user.unit_kerja || '-'}</div>
            </div>
          </div>

          <div className="mt-3">
            <Label>Keperluan Umum</Label>
            <textarea 
              value={keperluan} 
              onChange={(e) => setKeperluan(e.target.value)} 
              rows={2} 
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div className="mt-5">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">Daftar Barang yang Diminta</div>
            
            {loading && (
              <div className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded p-3 mb-3">
                ⏳ Memuat daftar barang...
              </div>
            )}
            
            {!loading && items.length === 0 && (
              <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-3 mb-3">
                ⚠️ Belum ada data barang. Hubungi admin gudang untuk mengisi master barang terlebih dahulu.
              </div>
            )}
            
            <div className="space-y-2">
              {lines.map((l, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2">
                  <select 
                    value={l.item_id} 
                    onChange={(e) => { 
                      const c = [...lines]; 
                      c[idx].item_id = e.target.value; 
                      setLines(c); 
                    }} 
                    className="col-span-12 sm:col-span-6 h-10 px-3 border border-slate-200 rounded-md text-sm bg-white"
                  >
                    <option value="">-- Pilih barang --</option>
                    {Array.isArray(items) && items.map(it => (
                      <option key={it.id} value={it.id}>
                        {it.kode} · {it.nama} ({it.satuan}) - Stok: {it.stok}
                      </option>
                    ))}
                  </select>
                  <Input 
                    type="number" 
                    min="1" 
                    placeholder="Jumlah" 
                    className="col-span-4 sm:col-span-2" 
                    value={l.jumlah} 
                    onChange={(e) => { 
                      const c = [...lines]; 
                      c[idx].jumlah = e.target.value; 
                      setLines(c); 
                    }} 
                  />
                  <Input 
                    placeholder="Keperluan baris" 
                    className="col-span-7 sm:col-span-3" 
                    value={l.keperluan} 
                    onChange={(e) => { 
                      const c = [...lines]; 
                      c[idx].keperluan = e.target.value; 
                      setLines(c); 
                    }} 
                  />
                  <button 
                    onClick={() => setLines(lines.filter((_, i) => i !== idx))} 
                    className="col-span-1 grid place-items-center text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button 
              onClick={() => setLines([...lines, { item_id: "", jumlah: 1, keperluan: "" }])} 
              className="mt-3 text-sm text-[#1E3A8A] flex items-center gap-1 hover:underline"
            >
              <Plus className="w-4 h-4" /> Tambah Barang
            </button>
          </div>

          <Button 
            data-testid="spb-public-submit" 
            onClick={submit} 
            className="w-full mt-6 h-12 bg-[#1E3A8A] hover:bg-[#1E2A6B]"
          >
            Kirim Permintaan
          </Button>
        </div>
        <div className="text-center mt-4 text-xs text-slate-500">© Badan POM Jember</div>
      </div>
    </div>
  );
}
