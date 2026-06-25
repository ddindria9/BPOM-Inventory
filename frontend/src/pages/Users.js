import React, { useEffect, useState } from "react";
import { api, fmtDate } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { toast } from "sonner";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fungsiList, setFungsiList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    name: "",
    nip: "",
    role: "pegawai",
    unit_kerja: "",
    jabatan: "staff", // <-- tambahkan ini
  });

  // Load data
  const loadUsers = async () => {
    try {
      const { data } = await api.get("/users");
      setUsers(data);
    } catch (e) {
      toast.error("Gagal memuat daftar pengguna");
    } finally {
      setLoading(false);
    }
  };

  const loadFungsi = async () => {
    try {
      const { data } = await api.get("/fungsi");
      setFungsiList(data);
    } catch (e) {
      setFungsiList(["Pemeriksaan", "Penindakan", "Infokom", "Tata Usaha", "Pengujian"]);
    }
  };

  useEffect(() => {
    loadUsers();
    loadFungsi();
  }, []);

  // Tambah user
  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.name) {
      toast.error("Username, password, dan nama wajib diisi");
      return;
    }
    try {
      await api.post("/auth/register", newUser);
      toast.success("User berhasil ditambahkan");
      setShowModal(false);
      setNewUser({
        username: "",
        password: "",
        name: "",
        nip: "",
        role: "pegawai",
        unit_kerja: "",
        jabatan: "staff",
      });
      loadUsers();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Gagal menambahkan user");
    }
  };

  // Hapus user
  const handleDelete = async (userId) => {
    if (!window.confirm("Yakin ingin menghapus user ini?")) return;
    try {
      await api.delete(`/users/${userId}`);
      toast.success("User dihapus");
      loadUsers();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Gagal menghapus user");
    }
  };

  if (loading) {
    return <div className="text-slate-500">Memuat...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Modul 8</div>
          <h1 className="font-display text-3xl mt-1">Manajemen Pengguna</h1>
          <div className="text-sm text-slate-500 mt-1">
            Atur hak akses sesuai pemisahan tugas SPIP / PIPK.
          </div>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-[#1E3A8A] hover:bg-[#1E2A6B]"
        >
          + Tambah User
        </Button>
      </div>

      {/* Tabel User */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500 bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3">Nama</th>
                <th className="text-left">Username</th>
                <th className="text-left">Fungsi</th>
                <th className="text-left">Jabatan</th> {/* <-- tambahkan */}
                <th className="text-left">Peran</th>
                <th className="text-left">Sejak</th>
                <th className="text-right pr-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium">{u.name}</td>
                  <td className="font-mono-data text-xs">{u.username}</td>
                  <td>{u.unit_kerja || "-"}</td>
                  <td>{u.jabatan || "staff"}</td> {/* <-- tampilkan */}
                  <td>
                    <span className="capitalize">{u.role}</span>
                  </td>
                  <td>{fmtDate(u.created_at)}</td>
                  <td className="text-right pr-4">
                    <button
                      onClick={() => handleDelete(u.user_id)}
                      className="text-red-600 hover:underline text-xs"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    Belum ada pengguna.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah User */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
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
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Password"
              />
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
              <Label>Jabatan</Label> {/* <-- tambahkan */}
              <select
                value={newUser.jabatan}
                onChange={(e) => setNewUser({ ...newUser, jabatan: e.target.value })}
                className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white"
              >
                <option value="staff">Staff</option>
                <option value="kepala_fungsi">Kepala Fungsi</option>
              </select>
            </div>
            <div>
              <Label>Peran</Label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white"
              >
                <option value="pegawai">Pegawai</option>
                <option value="admin_gudang">Admin Gudang</option>
                <option value="approver">Approver</option>
                <option value="pengelola_aset">Pengelola Aset</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Batal
            </Button>
            <Button onClick={handleAddUser} className="bg-[#1E3A8A]">
              Tambah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
