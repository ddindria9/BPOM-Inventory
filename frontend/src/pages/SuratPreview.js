import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { api, fmtDate, NAMA_BULAN_ID, BULAN_ROMAWI } from "../lib/api";
import { Button } from "../components/ui/button";
import { Printer, ArrowLeft, RotateCcw } from "lucide-react";

// Simple inline editable text — looks like plain text, becomes a transparent input on focus
function Editable({ value, onChange, className = "", placeholder = "", testid }) {
  return (
    <input
      data-testid={testid}
      value={value || ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-transparent outline-none border-b border-dashed border-transparent hover:border-slate-300 focus:border-[#1E3A8A] focus:bg-amber-50 px-0.5 py-0 print:border-0 print:bg-transparent ${className}`}
      style={{ minWidth: "1ch" }}
    />
  );
}

// Editable contained inside a table cell
function EditableCell({ value, onChange, className = "", align = "left", testid }) {
  return (
    <input
      data-testid={testid}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full bg-transparent outline-none border-0 px-1 py-1 focus:bg-amber-50 print:bg-transparent text-${align} ${className}`}
    />
  );
}

const today = new Date();
const tglIndoFull = (d = today) => `${d.getDate()} ${NAMA_BULAN_ID[d.getMonth()]} ${d.getFullYear()}`;

export default function SuratPreview() {
  const { type, id } = useParams();
  const [spb, setSpb] = useState(null);
  const [items, setItems] = useState([]);
  const [templateUrl, setTemplateUrl] = useState(localStorage.getItem("surat_template_url") || "");
  const isSBBK = type === "sbbk";
  const storageKey = `surat_edit_${type}_${id}`;

  // Editable doc model (persisted to localStorage)
  const [doc, setDoc] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await api.get(`/spb/${id}`);
      setSpb(data);
      const it = await api.get("/items").catch(() => ({ data: [] }));
      setItems(it.data);
      // Initialize editable model
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try { setDoc(JSON.parse(saved)); return; } catch {}
      }
      const monthRoman = BULAN_ROMAWI[today.getMonth() + 1];
      const nomor = isSBBK
        ? (data.sbbk_nomor || `0001/SBBK/${monthRoman}/${today.getFullYear()}`)
        : data.nomor;
      setDoc({
        nomor,
        unit_kerja: data.unit_kerja || "Balai POM di Jember",
        tanggal_spb: fmtDate(data.created_at),
        tanggal_keluar: tglIndoFull(),
        nama_peminta: data.nama_peminta || "",
        nip_peminta: "",
        nama_pengelola: "",
        nip_pengelola: "",
        nama_pejabat: data.approver_name || "",
        nip_pejabat: "",
        nama_penerima: data.nama_peminta || "",
        nip_penerima: "",
        keperluan_default: data.keperluan || "",
        rows: data.lines.map((l) => ({
          item_id: l.item_id,
          jumlah: l.jumlah,
          satuan: it.data.find((x) => x.id === l.item_id)?.satuan || "",
          nama: it.data.find((x) => x.id === l.item_id)?.nama || l.item_id,
          keperluan: l.keperluan || "",
          permintaan: l.jumlah,
          disetujui: l.jumlah,
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
  const updateRow = (idx, patch) => setDoc((d) => ({ ...d, rows: d.rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)) }));
  const reset = () => { localStorage.removeItem(storageKey); window.location.reload(); };

  if (!doc || !spb) return <div className="min-h-screen grid place-items-center text-slate-500">Memuat...</div>;

  return (
    <div className="min-h-screen bg-slate-100 py-6">
      <div className="max-w-4xl mx-auto px-4">
        {/* Toolbar */}
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
            <Button data-testid="surat-reset" variant="outline" onClick={reset} title="Reset suntingan"><RotateCcw className="w-4 h-4 mr-1" />Reset</Button>
            <Button data-testid="surat-print" onClick={() => window.print()} className="bg-[#1E3A8A] hover:bg-[#1E2A6B]"><Printer className="w-4 h-4 mr-1" />Cetak PDF</Button>
          </div>
        </div>

        <div className="no-print text-xs text-slate-500 mb-2">
          ✏️ Klik teks di bawah untuk mengedit (nomor, unit, tanggal, nama, NIP, baris tabel). Perubahan tersimpan otomatis di browser.
        </div>

        {/* === LETTER === */}
        <div className="print-area bg-white shadow-sm border border-slate-200 p-10 sm:p-14 text-black">
          {/* Kop Surat with logo */}
          <div className="kop-surat flex items-center gap-5">
            <img src="/logo-bpom.png" alt="Logo BPOM" className="w-24 h-24 object-contain" />
            <div className="flex-1 text-center">
              <div className="text-sm font-semibold">BADAN PENGAWAS OBAT DAN MAKANAN</div>
              <div className="text-base font-bold">BALAI POM DI JEMBER</div>
              <div className="text-[11px] mt-1">Jl. Letjend Sutoyo No. 50 Jember Telp. (0331) 422988</div>
              <div className="text-[11px]">e-mail: balaipom_jember@pom.go.id, Website: www.pom.go.id</div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mt-6">
            <div className="font-bold text-lg underline">
              {isSBBK ? "Surat Bukti Barang Keluar (SBBK)" : "Surat Permintaan Barang (SPB)"}
            </div>
          </div>

          {/* Header info */}
          <div className="mt-5 text-sm">
            <table>
              <tbody>
                <tr>
                  <td className="pr-3 align-top w-40">Nomor</td>
                  <td className="pr-2 align-top">:</td>
                  <td><Editable testid="surat-nomor" value={doc.nomor} onChange={(v) => update({ nomor: v })} className="font-mono-data" /></td>
                </tr>
                <tr>
                  <td className="pr-3 align-top">Unit Kerja</td>
                  <td className="pr-2 align-top">:</td>
                  <td><Editable testid="surat-unit" value={doc.unit_kerja} onChange={(v) => update({ unit_kerja: v })} /></td>
                </tr>
                {isSBBK ? (
                  <tr>
                    <td className="pr-3 align-top">No. dan Tgl. SPB</td>
                    <td className="pr-2 align-top">:</td>
                    <td><Editable testid="surat-tgl-spb" value={doc.tanggal_spb} onChange={(v) => update({ tanggal_spb: v })} /></td>
                  </tr>
                ) : (
                  <tr>
                    <td className="pr-3 align-top">Tanggal Permintaan</td>
                    <td className="pr-2 align-top">:</td>
                    <td><Editable value={doc.tanggal_spb} onChange={(v) => update({ tanggal_spb: v })} /></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table */}
          <table className="w-full mt-5 text-sm border-collapse border border-black">
            <thead>
              <tr>
                <th className="border border-black px-2 py-1 w-10 text-center">No.</th>
                <th className="border border-black px-2 py-1 text-left">Nama Barang</th>
                <th className="border border-black px-2 py-1 w-20 text-center">Satuan</th>
                <th className="border border-black px-2 py-1 w-20 text-center">{isSBBK ? "Jumlah" : "Jumlah"}</th>
                {isSBBK ? (
                  <th className="border border-black px-2 py-1 text-left">Keterangan</th>
                ) : (
                  <>
                    <th className="border border-black px-2 py-1 text-left">Keperluan</th>
                    <th className="border border-black px-2 py-1 w-20 text-center">Permintaan</th>
                    <th className="border border-black px-2 py-1 w-20 text-center">Disetujui</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {doc.rows.map((r, i) => (
                <tr key={i}>
                  <td className="border border-black text-center">{i + 1}</td>
                  <td className="border border-black"><EditableCell value={r.nama} onChange={(v) => updateRow(i, { nama: v })} /></td>
                  <td className="border border-black"><EditableCell value={r.satuan} onChange={(v) => updateRow(i, { satuan: v })} align="center" /></td>
                  <td className="border border-black"><EditableCell value={r.jumlah} onChange={(v) => updateRow(i, { jumlah: v })} align="center" /></td>
                  {isSBBK ? (
                    <td className="border border-black"><EditableCell value={r.keterangan} onChange={(v) => updateRow(i, { keterangan: v })} /></td>
                  ) : (
                    <>
                      <td className="border border-black"><EditableCell value={r.keperluan} onChange={(v) => updateRow(i, { keperluan: v })} /></td>
                      <td className="border border-black"><EditableCell value={r.permintaan} onChange={(v) => updateRow(i, { permintaan: v })} align="center" /></td>
                      <td className="border border-black"><EditableCell value={r.disetujui} onChange={(v) => updateRow(i, { disetujui: v })} align="center" /></td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Date right */}
          <div className="mt-6 text-sm text-right">
            Jember, <Editable value={doc.tanggal_keluar} onChange={(v) => update({ tanggal_keluar: v })} />
          </div>

          {/* Signature blocks */}
          {isSBBK ? (
            <div className="grid grid-cols-2 gap-12 mt-2 text-sm">
              <div>
                <div>Pengelola Gudang</div>
                <div className="h-20"></div>
                <div className="border-t border-black pt-1">
                  <Editable testid="surat-nama-pengelola" value={doc.nama_pengelola} onChange={(v) => update({ nama_pengelola: v })} placeholder="Nama Pengelola Gudang" className="font-semibold w-full" />
                </div>
                <div>NIP. <Editable value={doc.nip_pengelola} onChange={(v) => update({ nip_pengelola: v })} placeholder="________________" /></div>
              </div>
              <div className="text-right">
                <div>Yang Menerima</div>
                <div className="h-20"></div>
                <div className="border-t border-black pt-1">
                  <Editable testid="surat-nama-penerima" value={doc.nama_penerima} onChange={(v) => update({ nama_penerima: v })} placeholder="Nama Penerima" className="font-semibold w-full text-right" />
                </div>
                <div>NIP. <Editable value={doc.nip_penerima} onChange={(v) => update({ nip_penerima: v })} placeholder="________________" /></div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-6 mt-2 text-sm">
              <div>
                <div>Yang meminta</div>
                <div className="h-20"></div>
                <div className="border-t border-black pt-1">
                  <Editable value={doc.nama_peminta} onChange={(v) => update({ nama_peminta: v })} className="font-semibold w-full" />
                </div>
                <div>NIP. <Editable value={doc.nip_peminta} onChange={(v) => update({ nip_peminta: v })} placeholder="____________" /></div>
              </div>
              <div className="text-center">
                <div>Pengelola Gudang</div>
                <div className="h-20"></div>
                <div className="border-t border-black pt-1">
                  <Editable value={doc.nama_pengelola} onChange={(v) => update({ nama_pengelola: v })} placeholder="Nama" className="font-semibold w-full text-center" />
                </div>
                <div>NIP. <Editable value={doc.nip_pengelola} onChange={(v) => update({ nip_pengelola: v })} placeholder="____________" /></div>
              </div>
              <div className="text-right">
                <div>Pejabat Struktural</div>
                <div className="h-20 flex items-end justify-end">
                  {spb.approver_paraf && <div className="italic text-lg text-[#1E3A8A] mb-1">{spb.approver_paraf}</div>}
                </div>
                <div className="border-t border-black pt-1">
                  <Editable value={doc.nama_pejabat} onChange={(v) => update({ nama_pejabat: v })} placeholder="Nama Pejabat" className="font-semibold w-full text-right" />
                </div>
                <div>NIP. <Editable value={doc.nip_pejabat} onChange={(v) => update({ nip_pejabat: v })} placeholder="____________" /></div>
              </div>
            </div>
          )}

          <div className="text-[10px] text-slate-500 mt-12 text-right print:text-black">POM-14.01/CFM.01/SOP.01/IK.143.01/F.01</div>
        </div>
      </div>
    </div>
  );
}
