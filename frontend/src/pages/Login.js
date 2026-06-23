import React, { useState } from "react";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { BACKEND_URL } from "../lib/api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      alert("Username dan password wajib diisi");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (response.status === 307) {
        // Redirect ke frontend dengan token di URL
        const redirectUrl = response.headers.get("location");
        window.location.href = redirectUrl;
      } else {
        const error = await response.json();
        alert(error.detail || "Login gagal. Periksa username dan password.");
      }
    } catch (err) {
      alert("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left: brand panel */}
      <div className="bg-[#1E3A8A] text-white p-12 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8" />
            <span className="text-xl font-bold">BPOM Jember</span>
          </div>
          <h1 className="text-4xl font-bold mt-12">Inventory & Aset Management</h1>
          <p className="text-blue-200 mt-4">
            Pencatatan persediaan, permintaan barang digital, dan manajemen aset BMN
            dengan dukungan QR Code dan tanda tangan digital.
          </p>
        </div>
        <div className="text-sm text-blue-300">
          © {new Date().getFullYear()} Badan POM Jember · SPIP / PIPK Compliant
        </div>
      </div>

      {/* Right: login form */}
      <div className="flex items-center justify-center p-12">
        <div className="w-full max-w-md">
          <div className="text-sm text-gray-500 mb-2">Akses Terbatas</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Masuk ke sistem</h2>
          <p className="text-gray-500 mb-8">
            Masukkan username dan password Anda.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className="w-full"
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full"
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-[#1E3A8A] hover:bg-[#1E2A6B] text-white py-6 text-base flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? "Memproses..." : "Masuk"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <p className="text-xs text-gray-400 mt-6 text-center">
            Pegawai yang hanya ingin meminta barang dapat menggunakan{' '}
            <a href="/spb-public" className="text-[#1E3A8A] hover:underline">Formulir Permintaan Publik</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
