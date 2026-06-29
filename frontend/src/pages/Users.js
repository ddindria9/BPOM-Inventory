import React, { useEffect, useState } from "react";
import { api, fmtDate } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Eye, EyeOff, Pencil, User } from "lucide-react";
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

  const [showViewModal, setShowViewModal] = useState(false);
  const [viewUser, setViewUser] = useState(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState(null);

  const loadUsers = async () => {
    try {
      const { data } = await api.get("/users");
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      const errorMsg = typeof e === "object" ? e?.response?.data?.detail || e?.message || "Gagal memuat daftar pengguna" : "Gagal memuat daftar pengguna";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const loadFungsi = async () => {
    try {
      const { data } = await api.get("/fungsi");
      setFungsiList(Array.isArray(data) ? data : []);
    } catch (e) {
      setFungsiList(["Pemeriksaan", "Penindakan", "Infokom", "Tata Usaha", "Pengujian"]);
    }
  };

  useEffect(() => {
    loadUsers();
    loadFungsi();
  }, []);

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.name) {
      toast.error("Username, password, dan nama wajib diisi");
      return;
    }
    try {
      const payload = {
        username: newUser.username,
        password: newUser.password,
        name: newUser.name,
        nip: newUser.nip || "",
        role: newUser.role,
        unit_kerja: newUser.unit_kerja || "",
        jabatan: newUser.jabatan || "staff",
      };
      await api.post("/auth/register", payload);
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
      loadUsers();
    } catch (e) {
      const errorMsg = typeof e === "object" ? e?.response?.data?.detail || e?.message || "Gagal menambahkan user" : "Gagal menambahkan user";
      toast.error(errorMsg);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Yakin ingin menghapus user ini?")) return;
    try {
      await api.delete(`/users/${userId}`);
      toast.success("User dihapus");
      loadUsers();
    } catch (e) {
      const errorMsg = typeof e === "object" ? e?.response?.data?.detail || e?.message || "Gagal menghapus user" : "Gagal menghapus user";
      toast.error(errorMsg);
    }
  };

  const handleRoleChange = (value, setter, state) => {
    if (value !== "pegawai") {
      setter({ ...state, role: value, jabatan: "staff" });
    } else {
      setter({ ...state, role: value });
    }
  };

  const handleView = (user) => {
    setViewUser(user);
    setShowViewModal(true);
  };

  const handleEdit = (user) => {
    setEditUser({ ...user });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editUser) return;
    try {
      const payload = {
        name: editUser.name,
        nip: editUser.nip || "",
        unit_kerja: editUser.unit_kerja || "",
        role: editUser.role,
        jabatan: editUser.jabatan || "staff",
      };
      await api.patch(`/users/${editUser.user_id}`, payload);
      toast.success("Data pengguna diperbarui");
      setShowEditModal(false);
      loadUsers();
    } catch (e) {
      const errorMsg = typeof e === "object" ? e?.response?.data?.detail || e?.message || "Gagal memperbarui user" : "Gagal memperbarui user";
      toast.error(errorMsg);
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
          onClick={() => setShowAddModal(true)}
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
                <th className="text-left">Jabatan</th>
                <th className="text-left">Peran</th>
                <th className="text-left">Sejak</th>
                <th className="text-right pr-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(users) && users.map((u) => (
                <tr key={u.user_id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium">{u.name || "-"}</td>
                  <td className="font-mono-data text-xs">{u.username || "-"}</td>
                  <td>{u.unit_kerja || "-"}</td>
                  <td>{u.jabatan || "staff"}</td>
                  <td>
                    <span className="capitalize">{u.role || "-"}</span>
                  </td>
                  <td>{u.created_at ? fmtDate(u.created_at) : "-"}</td>
                  <td className="text-right pr-4 space-x-2">
                    <button
                      onClick={() => handleView(u)}
                      className="text-blue-600 hover:underline text-xs"
                      title="Lihat detail"
                    >
                      <User className="w-4 h-4 inline" /> Lihat
                    </button>
                    <button
                      onClick={() => handleEdit(u)}
                      className="text-amber-600 hover:underline text-xs"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4 inline" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(u.user_id)}
                      className="text-red-600 hover:underline text-xs"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
              {(!Array.isArray(users) || users.length === 0) && (
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

      {/* ======== MODAL TAMBAH USER ======== */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
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
                {Array.isArray(fungsiList) && fungsiList.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Peran</Label>
              <select
                value={newUser.role}
                onChange={(e) => handleRoleChange(e.target.value, setNewUser, newUser)}
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
                <p className="text-xs text-slate-400 mt-1">
                  * Jabatan hanya dapat diisi untuk role Pegawai
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Batal
            </Button>
            <Button onClick={handleAddUser} className="bg-[#1E3A8A]">
              Tambah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======== MODAL LIHAT USER ======== */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Pengguna</DialogTitle>
          </DialogHeader>
          {viewUser && (
            <div className="space-y-3 py-3">
              <div><Label>Username</Label><div className="font-medium">{viewUser.username || "-"}</div></div>
              <div><Label>Nama Lengkap</Label><div className="font-medium">{viewUser.name || "-"}</div></div>
              <div><Label>NIP</Label><div className="font-medium">{viewUser.nip || "-"}</div></div>
              <div><Label>Fungsi</Label><div className="font-medium">{viewUser.unit_kerja || "-"}</div></div>
              <div><Label>Jabatan</Label><div className="font-medium">{viewUser.jabatan || "staff"}</div></div>
              <div><Label>Peran</Label><div className="font-medium capitalize">{viewUser.role || "-"}</div></div>
              <div><Label>Terdaftar Sejak</Label><div className="font-medium">{viewUser.created_at ? fmtDate(viewUser.created_at) : "-"}</div></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewModal(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======== MODAL EDIT USER ======== */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pengguna</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-3 py-3">
              <div>
                <Label>Username (tidak dapat diubah)</Label>
                <div className="font-medium text-slate-600">{editUser.username || "-"}</div>
              </div>
              <div>
                <Label>Nama Lengkap *</Label>
                <Input
                  value={editUser.name || ""}
                  onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                  placeholder="Nama lengkap"
                />
              </div>
              <div>
                <Label>NIP</Label>
                <Input
                  value={editUser.nip || ""}
                  onChange={(e) => setEditUser({ ...editUser, nip: e.target.value })}
                  placeholder="NIP (opsional)"
                />
              </div>
              <div>
                <Label>Fungsi</Label>
                <select
                  value={editUser.unit_kerja || ""}
                  onChange={(e) => setEditUser({ ...editUser, unit_kerja: e.target.value })}
                  className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white"
                >
                  <option value="">-- Pilih Fungsi --</option>
                  {Array.isArray(fungsiList) && fungsiList.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Peran</Label>
                <select
                  value={editUser.role || "pegawai"}
                  onChange={(e) => handleRoleChange(e.target.value, setEditUser, editUser)}
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
                  value={editUser.jabatan || "staff"}
                  onChange={(e) => setEditUser({ ...editUser, jabatan: e.target.value })}
                  className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white"
                  disabled={editUser.role !== "pegawai"}
                >
                  <option value="staff">Staff</option>
                  <option value="kepala_fungsi">Kepala Fungsi</option>
                </select>
                {editUser.role !== "pegawai" && (
                  <p className="text-xs text-slate-400 mt-1">
                    * Jabatan hanya dapat diisi untuk role Pegawai
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Batal
            </Button>
            <Button onClick={handleUpdate} className="bg-[#1E3A8A]">
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
