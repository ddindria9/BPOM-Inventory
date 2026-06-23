import React, { useState } from "react";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { BACKEND_URL } from "../lib/api";

export default function Login() {
  const [loginMethod, setLoginMethod] = useState("manual"); // "google" atau "manual"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = () => {
    window.location.href = `${BACKEND_URL}/api/login/google`;
  };

  const handleManualLogin = async (e) => {
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

          {/* Tab pilihan */}
          <div className="flex rounded-lg overflow-hidden border border-slate-200 mb-6">
            <button
              onClick={() => setLoginMethod("manual")}
              className={`flex-1 py-2 text-sm font-medium transition ${
                loginMethod === "manual"
                  ? "bg-[#1E3A8A] text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Username & Password
            </button>
            <button
              onClick={() => setLoginMethod("google")}
              className={`flex-1 py-2 text-sm font-medium transition ${
                loginMethod === "google"
                  ? "bg-[#1E3A8A] text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Google
            </button>
          </div>

          {/* Form Manual */}
          {loginMethod === "manual" && (
            <form onSubmit={handleManualLogin} className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
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
                  disabled={loading}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-[#1E3A8A] hover:bg-[#1E2A6B] text-white py-6 text-base"
                disabled={loading}
              >
                {loading ? "Memproses..." : "Masuk"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          )}

          {/* Google Login (tetap ada) */}
          {loginMethod === "google" && (
            <Button
              onClick={handleGoogleLogin}
              className="w-full bg-[#1E3A8A] hover:bg-[#1E2A6B] text-white py-6 text-base flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Lanjutkan dengan Google
            </Button>
          )}

          <p className="text-xs text-gray-400 mt-6 text-center">
            Pegawai dapat menggunakan{' '}
            <a href="/spb-public" className="text-[#1E3A8A] hover:underline">Formulir Permintaan Publik</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
