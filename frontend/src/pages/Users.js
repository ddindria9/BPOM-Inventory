import React, { useEffect, useState } from "react";
import { api, fmtDate } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Eye, EyeOff, Plus } from "lucide-react";
import { toast } from "sonner";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fungsiList, setFungsiList] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    name: "",
    nip: "",
    role: "pegawai",
    unit_kerja: "",
    jabatan: "staff",
  });
  const [showPassword, setShowPassword] = useState(false);

  // Load data
  const loadUsers = async () => {
    try {
      const { data } = await api.get("/users");
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error("Gagal memuat daftar pengguna");
    } finally {
      setLoading(false);
    }
  };

  const loadFungsi = async () => {
    try {
      const { data } = await api.get("/fungsi");
      setFungsiList(Array.isArray(data) ? data : []);
    } catch {
      setFungsiList(["Pemeriksaan", "Penindakan", "Infokom", "Tata Usaha", "Pengujian"]);
    }
  };

  useEffect(() => {
    (async () => {
      await loadUsers();
      await loadFungsi();
    })();
  }, []);

  // Tambah user
  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.name) {
      toast.error("Username, password, dan nama wajib diisi");
      return;
    }
    try {
      const response = await api.post("/auth/register", {
        username: newUser.username,
        password: newUser.password,
        name: newUser.name,
        nip: newUser.nip || "",
        role: newUser.role,
        unit_kerja: newUser.unit_kerja || "",
        jabatan: newUser.jabatan || "staff",
      });
      // Jika response berhasil (status 2xx)
      toast.success("User berhasil ditambahkan");
      setShowAddModal(false);
      setNewUser({
        username: "",
        password: "",
        name: "",
        nip: "",
        role: "pegawai",
        unit_kerja: "",
        jabatan: "staff",
      });
      await loadUsers();
    } catch (e) {
      // Tangkap error dengan aman
      let msg = "Gagal menambahkan user";
      if (e?.response?.data?.detail) {
        msg = e.response.data.detail;
      } else if (e?.response?.data?.message) {
        msg = e.response.data.message;
      } else if (e?.message) {
        msg = e.message;
      }
      toast.error(msg);
    }
  };

  const handleModalClose = (open) => {
    if (!open) {
      setShowAddModal(false);
      setNewUser({
        username: "",
        password: "",
        name: "",
        nip: "",
        role: "pegawai",
        unit_kerja: "",
        jabatan: "staff",
      });
    }
  };

  if (loading) return <div className="text-slate-500">Memuat...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Manajemen Pengguna</h1>
        <Button onClick={() => setShowAddModal(true)} className="bg-[#1E3A8A] hover:bg-[#1E2A6B]">
          <Plus className="w-4 h-4 mr-1" /> Tambah User
        </Button>
      </div>

      {/* Tabel User */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-3">Nama</th>
              <th className="text-left">Username</th>
              <th className="text-left">Fungsi</th>
              <th className="text-left">Jabatan</th>
              <th className="text-left">Peran</th>
              <th className="text-left">Sejak</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.user_id} className="border-t">
                <td className="px-4 py-2">{u.name || "-"}</td>
                <td>{u.username || "-"}</td>
                <td>{u.unit_kerja || "-"}</td>
                <td>{u.jabatan || "staff"}</td>
                <td className="capitalize">{u.role || "-"}</td>
                <td>{u.created_at ? fmtDate(u.created_at) : "-"}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-slate-400">Belum ada pengguna.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ======== MODAL TAMBAH USER ======== */}
      <Dialog open={showAddModal} onOpenChange={handleModalClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Pengguna Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div>
              <Label>Username *</Label>
              <Input
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                placeholder="Username"
              />
            </div>
            <div>
              <Label>Password *</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label>Nama Lengkap *</Label>
              <Input
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="Nama lengkap"
              />
            </div>
            <div>
              <Label>NIP</Label>
              <Input
                value={newUser.nip}
                onChange={(e) => setNewUser({ ...newUser, nip: e.target.value })}
                placeholder="NIP (opsional)"
              />
            </div>
            <div>
              <Label>Fungsi</Label>
              <select
                value={newUser.unit_kerja}
                onChange={(e) => setNewUser({ ...newUser, unit_kerja: e.target.value })}
                className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white"
              >
                <option value="">-- Pilih Fungsi --</option>
                {fungsiList.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Peran</Label>
              <select
                value={newUser.role}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewUser({
                    ...newUser,
                    role: val,
                    jabatan: val !== "pegawai" ? "staff" : newUser.jabatan,
                  });
                }}
                className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white"
              >
                <option value="pegawai">Pegawai</option>
                <option value="admin_gudang">Admin Gudang</option>
                <option value="approver">Approver</option>
                <option value="pengelola_aset">Pengelola Aset</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <Label>Jabatan</Label>
              <select
                value={newUser.jabatan}
                onChange={(e) => setNewUser({ ...newUser, jabatan: e.target.value })}
                className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white"
                disabled={newUser.role !== "pegawai"}
              >
                <option value="staff">Staff</option>
                <option value="kepala_fungsi">Kepala Fungsi</option>
              </select>
              {newUser.role !== "pegawai" && (
                <p className="text-xs text-slate-400 mt-1">* Jabatan hanya untuk role Pegawai</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Batal</Button>
            <Button onClick={handleAddUser} className="bg-[#1E3A8A] hover:bg-[#1E2A6B]">Tambah</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
