import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api, BACKEND_URL } from "../lib/api";
import { Button } from "../components/ui/button";
import { Printer, ArrowLeft, Settings as SettingsIcon, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function SuratPreview() {
  const { type, id } = useParams();
  const [status, setStatus] = useState("loading"); // loading | ready | no-template | error
  const [errorMsg, setErrorMsg] = useState("");
  const [html, setHtml] = useState("");
  const iframeRef = useRef(null);

  const load = async () => {
    setStatus("loading");
    try {
      // Use the rendering endpoint - returns full HTML from Google Doc with placeholders replaced
      const resp = await api.get(`/surat/render/${type}/${id}`, { responseType: "text" });
      setHtml(resp.data);
      setStatus("ready");
    } catch (e) {
      const detail = e?.response?.data?.detail || e?.response?.data || e?.message || "Gagal memuat template";
      setErrorMsg(typeof detail === "string" ? detail : JSON.stringify(detail));
      setStatus(detail.toString().toLowerCase().includes("template") ? "no-template" : "error");
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [type, id]);

  // Inject HTML into iframe whenever it changes
  useEffect(() => {
    if (status !== "ready") return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    const ensureWritable = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write(html);
        doc.close();
      } catch (e) { /* ignore */ }
    };
    // Some browsers need the iframe to be fully attached
    setTimeout(ensureWritable, 30);
  }, [html, status]);

  const printIframe = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) { toast.error("Gagal cetak"); }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6">
      <div className="max-w-5xl mx-auto px-4">
        <div className="no-print flex items-center justify-between mb-4 gap-3 flex-wrap">
          <button onClick={() => window.history.back()} className="flex items-center gap-1 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" /> Kembali
          </button>
          <div className="flex gap-2 items-center">
            <Link to="/settings" className="text-sm text-[#1E3A8A] flex items-center gap-1 hover:underline">
              <SettingsIcon className="w-4 h-4" /> Atur Template
            </Link>
            <Button variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-1" />Muat Ulang</Button>
            <Button
              data-testid="surat-print"
              onClick={printIframe}
              disabled={status !== "ready"}
              className="bg-[#1E3A8A] hover:bg-[#1E2A6B]"
            >
              <Printer className="w-4 h-4 mr-1" />Cetak PDF
            </Button>
          </div>
        </div>

        {status === "loading" && (
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-500">
            Memuat template dari Google Docs...
          </div>
        )}

        {status === "no-template" && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-8">
            <h3 className="font-display text-xl text-amber-900">Template Google Docs belum diatur</h3>
            <p className="text-amber-900/80 mt-2 text-sm">{errorMsg}</p>
            <Link to="/settings" className="inline-block mt-4">
              <Button className="bg-[#1E3A8A] hover:bg-[#1E2A6B]"><SettingsIcon className="w-4 h-4 mr-1" />Buka Pengaturan Template</Button>
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-8">
            <h3 className="font-display text-xl text-red-900">Gagal memuat surat</h3>
            <p className="text-red-900/80 mt-2 text-sm">{errorMsg}</p>
            <p className="text-xs text-red-900/70 mt-3">
              Pastikan Google Doc sudah di-share publik ("Anyone with the link can view") dan placeholder ditulis dengan benar.
            </p>
          </div>
        )}

        {status === "ready" && (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <iframe
              ref={iframeRef}
              title="Surat Preview"
              style={{ width: "100%", height: "1200px", border: 0, background: "white" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
