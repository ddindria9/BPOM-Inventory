import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Toaster } from "sonner";

import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import MasterData from "./pages/MasterData";
import IncomingGoods from "./pages/IncomingGoods";
import SPBPublic from "./pages/SPBPublic";
import Approval from "./pages/Approval";
import SuratPreview from "./pages/SuratPreview";
import StockCard from "./pages/StockCard";
import Assets from "./pages/Assets";
import AssetInspect from "./pages/AssetInspect";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import SPBList from "./pages/SPBList";
import Layout from "./components/Layout";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Memuat...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function AppRouter() {
  const location = useLocation();
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* Public routes */}
      <Route path="/spb-public" element={<SPBPublic />} />
      <Route path="/asset-inspect/:id" element={<AssetInspect />} />
      <Route path="/surat/:type/:id" element={<SuratPreview />} />
      {/* Protected app */}
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/master" element={<Protected><MasterData /></Protected>} />
      <Route path="/incoming" element={<Protected><IncomingGoods /></Protected>} />
      <Route path="/spb" element={<Protected><SPBList /></Protected>} />
      <Route path="/approval" element={<Protected><Approval /></Protected>} />
      <Route path="/stock-card" element={<Protected><StockCard /></Protected>} />
      <Route path="/assets" element={<Protected><Assets /></Protected>} />
      <Route path="/reports" element={<Protected><Reports /></Protected>} />
      <Route path="/users" element={<Protected><Users /></Protected>} />
    </Routes>
  );
}

export default function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}
