import React, { useState } from "react";
import { ShieldCheck, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { BACKEND_URL } from "../lib/api";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!identifier || !password) {
      alert("Username/Email dan password wajib diisi");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.token) {
        localStorage.setItem("token", data.token);
        window.location.href = "/dashboard";
      } else {
        alert(data.detail || "Login gagal. Periksa username/email dan password.");
      }
    } catch (err) {
      alert("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left panel */}
      <div className="bg-[#1E3A8A] text-white p-12 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8" />
            <span className="text-xl font-bold">BPOM Jember</span>
          </div>
          <h1 className="text-4xl font-bold mt-12">Inventory & Aset Management</h1>
          <p className="text-blue-200 mt-4">
            Pencatatan persediaan, permintaan barang digital, dan manajemen aset BMN.
          </p>
        </div>
        <div className="text-sm text-blue-300">
          © {new Date().getFullYear()} Badan POM Jember
        </div>
      </div>

      {/* Right panel */}
      <div className="flex items-center justify-center p-12">
        <div className="w-full max-w-md">
          <div className="text-sm text-gray-500 mb-2">Akses Terbatas</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Masuk ke sistem</h2>
          <p className="text-gray-500 mb-6">
            Masukkan Username atau Email dan Password Anda.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Field Identifier (Username atau Email) */}
            <div>
              <Label htmlFor="identifier" className="text-sm font-medium text-gray-700">
                Username / Email
              </Label>
              <Input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Masukkan username atau email"
                disabled={loading}
                className="w-full mt-1"
              />
            </div>

            {/* Field Password dengan Icon Mata */}
            <div>
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Tombol Login */}
            <Button
              type="submit"
              className="w-full bg-[#1E3A8A] hover:bg-[#1E2A6B] text-white py-6 text-base"
              disabled={loading}
            >
              {loading ? "Memproses..." : "Masuk"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <p className="text-xs text-gray-400 mt-6 text-center">
            Pegawai dapat menggunakan{' '}
            <a href="/spb-public" className="text-[#1E3A8A] hover:underline">
              Formulir Permintaan Publik
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
}
