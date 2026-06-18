import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, fmtDate, NAMA_BULAN_ID, BULAN_ROMAWI } from "../lib/api";
import { Button } from "../components/ui/button";
import { Printer, ArrowLeft, RotateCcw } from "lucide-react";

// Editable text input that visually appears as plain text. Becomes highlighted on focus.
function Editable({ value, onChange, className = "", placeholder = "", align = "left", testid }) {
  return (
    <input
      data-testid={testid}
      value={value || ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-transparent outline-none border-b border-dashed border-transparent hover:border-slate-300 focus:border-[#1E3A8A] focus:bg-amber-50 px-0.5 py-0 print:border-0 print:bg-transparent text-${align} ${className}`}
      style={{ minWidth: "1ch" }}
    />
  );
}

function CellEdit({ value, onChange, align = "left", testid }) {
  return (
    <input
      data-testid={testid}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full bg-transparent outline-none border-0 px-1 py-0.5 focus:bg-amber-50 print:bg-transparent text-${align}`}
    />
  );
}

const tglIndoFull = (d = new Date()) => `${d.getDate()} ${NAMA_BULAN_ID[d.getMonth()]} ${d.getFullYear()}`;

export default function SuratPreview() {
  const { type, id } = useParams();
  const [spb, setSpb] = useState(null);
  const [items, setItems] = useState([]);
  const [templateUrl, setTemplateUrl] = useState(localStorage.getItem("surat_template_url") || "");
  const isSBBK = type === "sbbk";
  const storageKey = `surat_edit_${type}_${id}`;
  const [doc, setDoc] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await api.get(`/spb/${id}`);
      setSpb(data);
      const it = await api.get("/items").catch(() => ({ data: [] }));
      setItems(it.data);
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try { setDoc(JSON.parse(saved)); return; } catch {}
      }
      const monthRoman = BULAN_ROMAWI[new Date().getMonth() + 1];
      const nomor = isSBBK
        ? (data.sbbk_nomor || `0001/PSD/${monthRoman}/${new Date().getFullYear()}`)
        : data.nomor;
      setDoc({
        nomor,
        unit_kerja: data.unit_kerja || "Balai POM di Jember",
        tanggal_spb: fmtDate(data.created_at),
        tanggal_keluar: tglIndoFull(),
        nama_pengelola: "",
        nip_pengelola: "",
        nama_pejabat: data.approver_name || "",
        nip_pejabat: "",
        nama_penerima: data.nama_peminta || "",
        nip_penerima: "",
        rows: data.lines.map((l) => ({
          item_id: l.item_id,
          nama: it.data.find((x) => x.id === l.item_id)?.nama || l.item_id,
          satuan: it.data.find((x) => x.id === l.item_id)?.satuan || "",
          jumlah: String(l.jumlah),
          permintaan: String(l.jumlah),
          disetujui: String(l.jumlah),
          keperluan: l.keperluan || "",
          keterangan: "",
        })),
      });
    })();
    // eslint-disable-next-line
  }, [id, type]);

  useEffect(() => {
    if (doc) localStorage.setItem(storageKey, JSON.stringify(doc));
  }, [doc, storageKey]);

  const update = (patch) => setDoc((d) => ({ ...d, ...patch }));
  const updateRow = (i, patch) => setDoc((d) => ({ ...d, rows: d.rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) }));
  const reset = () => { localStorage.removeItem(storageKey); window.location.reload(); };

  if (!doc || !spb) return <div className="min-h-screen grid place-items-center text-slate-500">Memuat...</div>;

  return (
    <div className="min-h-screen bg-slate-100 py-6">
      <div className="max-w-4xl mx-auto px-4">
        <div className="no-print flex items-center justify-between mb-4 gap-3 flex-wrap">
          <button onClick={() => window.history.back()} className="flex items-center gap-1 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" /> Kembali
          </button>
          <div className="flex gap-2 items-center flex-wrap">
            <input
              type="url"
              placeholder="URL Template GDoc (opsional)..."
              value={templateUrl}
              onChange={(e) => { setTemplateUrl(e.target.value); localStorage.setItem("surat_template_url", e.target.value); }}
              className="h-9 px-3 border border-slate-200 rounded text-sm w-64"
            />
            {templateUrl && <a href={templateUrl} target="_blank" rel="noreferrer" className="text-sm text-[#1E3A8A] underline">Buka Template</a>}
            <Button data-testid="surat-reset" variant="outline" onClick={reset}><RotateCcw className="w-4 h-4 mr-1" />Reset</Button>
            <Button data-testid="surat-print" onClick={() => window.print()} className="bg-[#1E3A8A] hover:bg-[#1E2A6B]"><Printer className="w-4 h-4 mr-1" />Cetak PDF</Button>
          </div>
        </div>
        <div className="no-print text-xs text-slate-500 mb-2">
          ✏️ Klik field manapun untuk mengedit. Perubahan tersimpan otomatis di browser.
        </div>

        {/* === LETTER (A4 Letter actually - matches docx pgSz 12240x15840 = 8.5"x11") === */}
        <div className="print-area mx-auto bg-white shadow-sm border border-slate-200 text-black" style={{ width: "8.5in", minHeight: "11in", padding: "1in", fontFamily: "'Times New Roman', Times, serif", fontSize: "12pt", lineHeight: 1.3 }}>

          {/* Kop Surat */}
          <div className="flex items-center" style={{ borderBottom: "3px double black", paddingBottom: "6px" }}>
            <img src="/logo-bpom.png" alt="BPOM" style={{ width: "85px", height: "85px", objectFit: "contain" }} />
            <div className="flex-1 text-center" style={{ marginLeft: "8px" }}>
              <div style={{ fontWeight: 700, fontSize: "13pt" }}>BADAN PENGAWAS OBAT DAN MAKANAN</div>
              <div style={{ fontWeight: 700, fontSize: "16pt" }}>BALAI POM DI JEMBER</div>
              <div style={{ fontSize: "10pt" }}>Jl. Letjend Sutoyo No. 50 Jember Telp. (0331) 422988</div>
              <div style={{ fontSize: "10pt" }}>e-mail: balaipom_jember@pom.go.id, Website: www.pom.go.id</div>
            </div>
          </div>

          {/* Title - centered */}
          <div className="text-center" style={{ marginTop: "16pt", fontWeight: 700, fontSize: "12pt", textDecoration: "underline" }}>
            {isSBBK ? "Surat Bukti Barang Keluar (SBBK)" : "Surat Permintaan Barang (SPB)"}
          </div>

          {/* Nomor - centered */}
          <div className="text-center" style={{ fontSize: "12pt", marginTop: "2pt" }}>
            Nomor :&nbsp;<Editable testid="surat-nomor" value={doc.nomor} onChange={(v) => update({ nomor: v })} className="font-mono-data" />
          </div>

          {/* Info table */}
          <table style={{ marginTop: "12pt", fontSize: "12pt", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ width: isSBBK ? "1.26in" : "1.45in", verticalAlign: "top" }}>Unit Kerja</td>
                <td style={{ width: "0.2in", verticalAlign: "top" }}>:</td>
                <td style={{ verticalAlign: "top" }}>
                  <Editable testid="surat-unit" value={doc.unit_kerja} onChange={(v) => update({ unit_kerja: v })} />
                </td>
              </tr>
              <tr>
                <td style={{ verticalAlign: "top" }}>{isSBBK ? "No. dan Tgl. SPB" : "Tanggal Permintaan"}</td>
                <td style={{ verticalAlign: "top" }}>:</td>
                <td style={{ verticalAlign: "top" }}>
                  <Editable testid="surat-tgl" value={doc.tanggal_spb} onChange={(v) => update({ tanggal_spb: v })} />
                </td>
              </tr>
            </tbody>
          </table>

          {/* Data table */}
          {isSBBK ? (
            <table style={{ width: "100%", marginTop: "10pt", borderCollapse: "collapse", fontSize: "11pt" }}>
              <colgroup>
                <col style={{ width: "5.6%" }} />
                <col style={{ width: "48.7%" }} />
                <col style={{ width: "10.4%" }} />
                <col style={{ width: "10.3%" }} />
                <col style={{ width: "25.0%" }} />
              </colgroup>
              <thead>
                <tr>
                  {["No.", "Nama Barang", "Satuan", "Jumlah", "Keterangan"].map((h, i) => (
                    <th key={i} style={{ border: "1px solid black", padding: "4px", textAlign: "center", fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {doc.rows.map((r, i) => (
                  <tr key={i}>
                    <td style={{ border: "1px solid black", textAlign: "center" }}>{i + 1}</td>
                    <td style={{ border: "1px solid black" }}><CellEdit value={r.nama} onChange={(v) => updateRow(i, { nama: v })} /></td>
                    <td style={{ border: "1px solid black" }}><CellEdit value={r.satuan} onChange={(v) => updateRow(i, { satuan: v })} align="center" /></td>
                    <td style={{ border: "1px solid black" }}><CellEdit value={r.jumlah} onChange={(v) => updateRow(i, { jumlah: v })} align="center" /></td>
                    <td style={{ border: "1px solid black" }}><CellEdit value={r.keterangan} onChange={(v) => updateRow(i, { keterangan: v })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table style={{ width: "100%", marginTop: "10pt", borderCollapse: "collapse", fontSize: "11pt" }}>
              <colgroup>
                <col style={{ width: "5.6%" }} />
                <col style={{ width: "33.9%" }} />
                <col style={{ width: "9.2%" }} />
                <col style={{ width: "13.6%" }} />
                <col style={{ width: "11.1%" }} />
                <col style={{ width: "26.6%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th rowSpan={2} style={{ border: "1px solid black", padding: "4px", textAlign: "center", fontWeight: 700 }}>No.</th>
                  <th rowSpan={2} style={{ border: "1px solid black", padding: "4px", textAlign: "center", fontWeight: 700 }}>Nama Barang</th>
                  <th rowSpan={2} style={{ border: "1px solid black", padding: "4px", textAlign: "center", fontWeight: 700 }}>Satuan</th>
                  <th colSpan={2} style={{ border: "1px solid black", padding: "4px", textAlign: "center", fontWeight: 700 }}>Jumlah</th>
                  <th rowSpan={2} style={{ border: "1px solid black", padding: "4px", textAlign: "center", fontWeight: 700 }}>Keperluan</th>
                </tr>
                <tr>
                  <th style={{ border: "1px solid black", padding: "4px", textAlign: "center", fontWeight: 700 }}>Permintaan</th>
                  <th style={{ border: "1px solid black", padding: "4px", textAlign: "center", fontWeight: 700 }}>Disetujui</th>
                </tr>
              </thead>
              <tbody>
                {doc.rows.map((r, i) => (
                  <tr key={i}>
                    <td style={{ border: "1px solid black", textAlign: "center" }}>{i + 1}</td>
                    <td style={{ border: "1px solid black" }}><CellEdit value={r.nama} onChange={(v) => updateRow(i, { nama: v })} /></td>
                    <td style={{ border: "1px solid black" }}><CellEdit value={r.satuan} onChange={(v) => updateRow(i, { satuan: v })} align="center" /></td>
                    <td style={{ border: "1px solid black" }}><CellEdit value={r.permintaan} onChange={(v) => updateRow(i, { permintaan: v })} align="center" /></td>
                    <td style={{ border: "1px solid black" }}><CellEdit value={r.disetujui} onChange={(v) => updateRow(i, { disetujui: v })} align="center" /></td>
                    <td style={{ border: "1px solid black" }}><CellEdit value={r.keperluan} onChange={(v) => updateRow(i, { keperluan: v })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Date / place line above signature - right aligned per template */}
          {isSBBK ? (
            <div style={{ marginTop: "14pt", fontSize: "12pt", textAlign: "right", paddingRight: "1.5in" }}>
              Jember, <Editable value={doc.tanggal_keluar} onChange={(v) => update({ tanggal_keluar: v })} />
            </div>
          ) : (
            <div style={{ marginTop: "14pt", fontSize: "12pt", textAlign: "right", paddingRight: "1.5in" }}>
              Yang meminta
            </div>
          )}

          {/* Signature table - 3 equal columns; middle empty for spacing */}
          <table style={{ width: "100%", marginTop: "6pt", fontSize: "12pt", borderCollapse: "collapse" }}>
            <colgroup>
              <col style={{ width: "33.33%" }} />
              <col style={{ width: "33.33%" }} />
              <col style={{ width: "33.33%" }} />
            </colgroup>
            <tbody>
              <tr>
                <td style={{ verticalAlign: "top", textAlign: "center" }}>
                  {isSBBK ? "Yang Menerima" : "Pengelola Gudang"}
                </td>
                <td></td>
                <td style={{ verticalAlign: "top", textAlign: "center" }}>
                  {isSBBK ? "Pengelola Gudang" : "Pejabat Struktural"}
                </td>
              </tr>
              <tr>
                <td style={{ height: "80px", textAlign: "center", verticalAlign: "bottom" }}>
                  {!isSBBK && spb.approver_paraf ? null : null}
                </td>
                <td></td>
                <td style={{ height: "80px", textAlign: "center", verticalAlign: "bottom" }}>
                  {!isSBBK && spb.approver_paraf && (
                    <div style={{ fontStyle: "italic", color: "#1E3A8A", fontSize: "14pt" }}>{spb.approver_paraf}</div>
                  )}
                </td>
              </tr>
              <tr>
                <td style={{ textAlign: "center" }}>
                  <Editable
                    value={isSBBK ? doc.nama_penerima : doc.nama_pengelola}
                    onChange={(v) => update(isSBBK ? { nama_penerima: v } : { nama_pengelola: v })}
                    placeholder="(Nama)"
                    align="center"
                    className="font-semibold"
                  />
                </td>
                <td></td>
                <td style={{ textAlign: "center" }}>
                  <Editable
                    value={isSBBK ? doc.nama_pengelola : doc.nama_pejabat}
                    onChange={(v) => update(isSBBK ? { nama_pengelola: v } : { nama_pejabat: v })}
                    placeholder="(Nama)"
                    align="center"
                    className="font-semibold"
                  />
                </td>
              </tr>
              <tr>
                <td style={{ textAlign: "center" }}>
                  NIP.&nbsp;
                  <Editable
                    value={isSBBK ? doc.nip_penerima : doc.nip_pengelola}
                    onChange={(v) => update(isSBBK ? { nip_penerima: v } : { nip_pengelola: v })}
                    placeholder="________________"
                  />
                </td>
                <td></td>
                <td style={{ textAlign: "center" }}>
                  NIP.&nbsp;
                  <Editable
                    value={isSBBK ? doc.nip_pengelola : doc.nip_pejabat}
                    onChange={(v) => update(isSBBK ? { nip_pengelola: v } : { nip_pejabat: v })}
                    placeholder="________________"
                  />
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: "40pt", fontSize: "8pt", textAlign: "right", color: "#555" }}>POM-14.01/CFM.01/SOP.01/IK.143.01/F.01</div>
        </div>
      </div>
    </div>
  );
}
