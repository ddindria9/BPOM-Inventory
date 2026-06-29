import React, { useEffect, useState } from "react";
import { api, fmtDate } from "../lib/api";
import { toast } from "sonner";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    loadUsers();
  }, []);

  if (loading) return <div>Memuat...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Manajemen Pengguna</h1>
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
    </div>
  );
}
