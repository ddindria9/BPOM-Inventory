import React, { useEffect, useState } from "react";
import { api, fmtDate, fmtIDR } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { AlertTriangle, Box, Wallet, Clock, Inbox, FileText, CheckCircle, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

const COLORS = { BAIK: "#1E3A8A", RUSAK_RINGAN: "#F59E0B", RUSAK_BERAT: "#DC2626" };

function Stat({ icon: Icon, label, value, accent, testid }) {
  const displayValue = (value === undefined || value === null) ? 0 : value;
  return (
    <div data-testid={testid} className="rise-in bg-white border border-slate-200 rounded-lg p-5 hover:-translate-y-0.5 transition-transform">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
        <Icon className={`w-4 h-4 ${accent || "text-slate-400"}`} />
      </div>
      <div className="mt-2 font-display text-3xl text-slate-900">{displayValue}</div>
    </div>
  );
}

class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return <div className="text-sm text-red-500 p-4">Gagal menampilkan chart.</div>;
    }
    return this.props.children;
  }
}

// ========== STAFF DASHBOARD ==========
function StaffDashboard({ user }) {
  const [spbList, setSpbList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/spb");
        // Filter SPB milik user berdasarkan nama_pegawai atau nama_peminta
        const mySpb = data.filter(
          (spb) => spb.nama_pegawai === user?.name || spb.nama_peminta === user?.name
        );
        setSpbList(mySpb);
      } catch (e) {
        toast.error("Gagal memuat data SPB");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading) return <div className="text-slate-500">Memuat...</div>;
  if (!user) return <div className="text-slate-500">User tidak ditemukan.</div>;

  const pending = spbList.filter(s => s.status === "PENDING" || s.status === "APPROVED_KF");
  const approved = spbList.filter(s => s.status === "APPROVED");
  const rejected = spbList.filter(s => s.status === "REJECTED");

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Dashboard</div>
        <h1 className="font-display text-3xl sm:text-4xl text-slate-900 mt-1">Selamat datang, {user?.name || "Pengguna"}</h1>
        <div className="text-sm text-slate-500 mt-1">Berikut adalah status permintaan barang Anda.</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat icon={Inbox} label="Menunggu Persetujuan" value={pending.length} accent="text-amber-500" />
        <Stat icon={CheckCircle} label="Disetujui" value={approved.length} accent="text-emerald-600" />
        <Stat icon={XCircle} label="Ditolak" value={rejected.length} accent="text-red-600" />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-display text-lg">Riwayat Permintaan Anda</h3>
          <Link to="/spb" className="text-xs text-[#1E3A8A] hover:underline">Lihat semua →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500 bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3">Nomor</th>
                <th className="text-left">Tanggal</th>
                <th className="text-left">Status</th>
                <th className="text-right pr-4">Surat</th>
              </tr>
            </thead>
            <tbody>
              {spbList.length === 0 ? (
                <tr><td colSpan={4} className="p-6 text-center text-slate-400">Belum ada permintaan.</td></tr>
              ) : (
                spbList.slice(0, 10).map((d) => (
                  <tr key={d.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-mono-data text-xs">{d.nomor}</td>
                    <td>{fmtDate(d.created_at)}</td>
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
                    <td className="text-right pr-4">
                      <Link to={`/surat/spb/${d.id}`} className="text-[#1E3A8A] hover:underline text-xs">
                        <FileText className="w-4 h-4 inline" /> SPB
                      </Link>
                      {d.status === "APPROVED" && d.sbbk_nomor && (
                        <Link to={`/surat/sbbk/${d.id}`} className="ml-2 text-[#1E3A8A] hover:underline text-xs">
                          <FileText className="w-4 h-4 inline" /> SBBK
                        </Link>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-slate-400 text-center">
        Untuk membuat permintaan baru, buka menu <strong>Permintaan (SPB)</strong>.
      </div>
    </div>
  );
}

// ========== FULL DASHBOARD ==========
function FullDashboard() {
  const [stats, setStats] = useState(null);

  const load = async () => {
    try {
      const { data } = await api.get("/dashboard/stats");
      setStats({
        total_items: data.total_items ?? 0,
        low_stock_count: data.low_stock_count ?? 0,
        pending_spb: data.pending_spb ?? 0,
        total_nilai: data.total_nilai ?? 0,
        total_assets: data.total_assets ?? 0,
        kondisi_counts: data.kondisi_counts && typeof data.kondisi_counts === 'object' ? data.kondisi_counts : {},
        low_stock_items: Array.isArray(data.low_stock_items) ? data.low_stock_items : [],
        expiring: Array.isArray(data.expiring) ? data.expiring : [],
      });
    } catch (e) {
      toast.error("Gagal memuat dashboard");
      setStats({
        total_items: 0,
        low_stock_count: 0,
        pending_spb: 0,
        total_nilai: 0,
        total_assets: 0,
        kondisi_counts: {},
        low_stock_items: [],
        expiring: [],
      });
    }
  };

  useEffect(() => { load(); }, []);

  const seed = async () => {
    try { await api.post("/admin/seed"); toast.success("Data contoh berhasil dibuat"); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Gagal seed"); }
  };

  if (!stats) return <div className="text-slate-500">Memuat...</div>;

  const kondisiData = Object.entries(stats.kondisi_counts).map(([k, v]) => ({
    name: k.replace("_", " "),
    value: typeof v === 'number' ? v : 0,
    key: k
  }));
  const totalAssets = kondisiData.reduce((s, x) => s + x.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Ringkasan Operasional</div>
          <h1 className="font-display text-3xl sm:text-4xl text-slate-900 mt-1">Dashboard Inventory</h1>
        </div>
        {stats.total_items === 0 && (
          <Button data-testid="dashboard-seed-button" onClick={seed} className="bg-[#1E3A8A] hover:bg-[#1E2A6B]">
            Isi Data Contoh
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat testid="stat-low-stock" icon={AlertTriangle} accent="text-red-600" label="Stok Menipis" value={stats.low_stock_count} />
        <Stat testid="stat-pending-spb" icon={Inbox} accent="text-amber-500" label="Permintaan Menunggu" value={stats.pending_spb} />
        <Stat testid="stat-total-value" icon={Wallet} accent="text-emerald-600" label="Nilai Persediaan" value={fmtIDR(stats.total_nilai)} />
        <Stat testid="stat-total-assets" icon={Box} accent="text-[#1E3A8A]" label="Total Aset BMN" value={stats.total_assets} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg">Stok di bawah minimum</h3>
            <Link to="/master" className="text-xs text-[#1E3A8A] hover:underline">Lihat semua →</Link>
          </div>
          {stats.low_stock_items.length === 0 ? (
            <div className="text-sm text-slate-500 mt-6">Tidak ada barang dengan stok menipis. 🟢</div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr><th className="text-left py-2">Kode</th><th className="text-left">Nama</th><th className="text-right">Stok</th><th className="text-right">Min</th></tr>
                </thead>
                <tbody>
                  {stats.low_stock_items.map((it) => (
                    <tr key={it.id} className="border-b border-slate-100">
                      <td className="py-2 font-mono-data text-xs">{it.kode}</td>
                      <td>{it.nama}</td>
                      <td className="text-right font-semibold text-red-600">{it.stok}</td>
                      <td className="text-right text-slate-500">{it.stok_min}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="font-display text-lg">Kondisi Aset</h3>
          <div className="text-xs text-slate-500">Total {totalAssets} aset</div>
          <div style={{ width: '100%', height: 250, minHeight: 200 }} className="mt-4">
            {totalAssets === 0 ? (
              <div className="h-full grid place-items-center text-sm text-slate-400">Belum ada data aset</div>
            ) : (
              <ChartErrorBoundary>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={kondisiData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                      {kondisiData.map((e, i) => <Cell key={i} fill={COLORS[e.key] || '#999'} />)}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </ChartErrorBoundary>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-red-600" /><h3 className="font-display text-lg">Reagen Mendekati Kadaluarsa</h3></div>
        {stats.expiring.length === 0 ? (
          <div className="text-sm text-slate-500 mt-4">Tidak ada reagen yang akan kadaluarsa dalam 90 hari.</div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr><th className="text-left py-2">Kode</th><th className="text-left">Nama Reagen</th><th className="text-left">Kadaluarsa</th><th className="text-right">Sisa Hari</th></tr>
              </thead>
              <tbody>
                {stats.expiring.map((it) => (
                  <tr key={it.id} className="border-b border-slate-100">
                    <td className="py-2 font-mono-data text-xs">{it.kode}</td>
                    <td>{it.nama}</td>
                    <td>{it.expiry_date}</td>
                    <td className={`text-right font-semibold ${it.days_left < 30 ? "text-red-600" : "text-amber-500"}`}>{it.days_left} hari</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ========== MAIN DASHBOARD ==========
export default function Dashboard() {
  const { user, loading } = useAuth();

  // Jika masih loading auth, tampilkan loading
  if (loading) {
    return <div className="text-slate-500">Memuat...</div>;
  }

  // Jika user null (belum login), tidak mungkin terjadi karena Protected di App.js, tapi tetap guard
  if (!user) {
    return <div className="text-slate-500">Silakan login terlebih dahulu.</div>;
  }

  // Staff hanya lihat dashboard miliknya (pastikan user tidak null sebelum akses properti)
  if (user.role === "pegawai" && user.jabatan === "staff") {
    return <StaffDashboard user={user} />;
  }

  // Admin, approver, kepala fungsi, admin_gudang, pengelola_aset lihat full dashboard
  return <FullDashboard />;
}
