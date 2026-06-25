import React, { useState } from "react";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleManualLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      alert("email dan password wajib diisi");
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", {
        email,
        password,
      });

      localStorage.setItem("token", data.token);
      api.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;

      setUser(data.user);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("Login error:", err);
      alert(err.response?.data?.detail || "Login gagal. Periksa email dan password.");
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
            Masukkan email dan password Anda.
          </p>

          <form onSubmit={handleManualLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">email</Label>
              <Input
                id="email"
                type="text"
                value={email}
                onChange={(e) => (e.target.value)}
                placeholder="Masukkan email"
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

        </div>
      </div>
    </div>
  );
}
