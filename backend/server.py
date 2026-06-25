from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, UploadFile, File, Response, Query, Request
from fastapi.responses import RedirectResponse, StreamingResponse, FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, io, uuid, logging, re, shutil, aiofiles
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import qrcode
import jwt
# import httpx
import bcrypt  # <-- TAMBAHKAN INI
import requests
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
# GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
# GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
# GOOGLE_REDIRECT_URI = os.environ.get('GOOGLE_REDIRECT_URI')
SECRET_KEY = os.environ.get('SECRET_KEY', 'ganti_dengan_random_string')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
APP_NAME = os.environ.get("APP_NAME", "bpom-jember-inventory")

# Folder untuk upload file lokal
UPLOAD_DIR = ROOT_DIR / 'uploads'
UPLOAD_DIR.mkdir(exist_ok=True)

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="BPOM Jember Inventory")
api = APIRouter(prefix="/api")

@api.options("/auth/login")
async def options_login():
    return Response(
        headers={
            "Access-Control-Allow-Origin": "https://bpom-jember-frontend.onrender.com",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, Origin, X-Requested-With",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "3600",
        }
    )

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(name)s - %(message)s')
log = logging.getLogger("inventory")

# -------------------- Helpers --------------------
def now_utc():
    return datetime.now(timezone.utc)

def iso(dt: datetime) -> str:
    return dt.isoformat() if dt else None

def clean(doc: dict) -> dict:
    if doc:
        doc.pop("_id", None)
    return doc

# -------------------- JWT Auth --------------------
def create_jwt(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": now_utc() + timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def decode_jwt(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")

# -------------------- GET CURRENT USER (Prioritas Header) --------------------
async def get_current_user(request: Request, authorization: Optional[str] = Header(None)):
    token = None
    # 1. Cek header Authorization dulu
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    # 2. Jika tidak ada, coba cookie (untuk backward compatibility)
    if not token:
        token = request.cookies.get("session_token")
    if not token:
        raise HTTPException(401, "Not authenticated")
    
    try:
        payload = decode_jwt(token)
    except jwt.PyJWTError:
        # Fallback ke database session
        session = await db.user_sessions.find_one({"session_token": token})
        if not session:
            raise HTTPException(401, "Invalid session")
        user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(401, "User not found")
        return user
    
    user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user

def require_role(*roles):
    async def dep(user=Depends(get_current_user)):
        if user.get("role") not in roles and user.get("role") != "admin":
            raise HTTPException(403, f"Need role: {roles}")
        return user
    return dep

# ==========================================================
# ==================== AUTH MANUAL (USERNAME/PASSWORD) =====
# ==========================================================

class RegisterIn(BaseModel):
    username: str
    password: str
    name: str
    nip: str = ""             
    role: str = "pegawai"
    unit_kerja: str = ""
    jabatan: str = "staff"  # baru

@api.post("/auth/register")
async def register(body: RegisterIn): #, user=Depends(require_role("admin"))):
    """Hanya admin yang bisa membuat akun baru."""
    existing = await db.users.find_one({"username": body.username})
    if existing:
        raise HTTPException(400, "Username sudah digunakan")
    
    hashed = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt())
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    
    await db.users.insert_one({
        "user_id": user_id,
        "username": body.username,
        "password": hashed.decode(),
        "name": body.name,
        "nip": body.nip,            
        "role": body.role,
        "unit_kerja": body.unit_kerja,
        "jabatan": body.jabatan,  # tambahkan
        "email": None,
        "picture": "",
        "created_at": iso(now_utc())
    })
    return {"ok": True, "user_id": user_id}

class LoginIn(BaseModel):
    username: str
    password: str

def public_user(user: dict) -> dict:
    user = clean(dict(user))
    user.pop("password", None)
    return user

@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    """Login manual dengan username dan password."""
    user = await db.users.find_one({"username": body.username})
    if not user:
        raise HTTPException(401, "Username atau password salah")
    
    if not bcrypt.checkpw(body.password.encode(), user["password"].encode()):
        raise HTTPException(401, "Username atau password salah")
    
    token = create_jwt(user["user_id"])
    
    return {
        "token": token,
        "user": public_user(user)
    }

@api.get("/auth/me")
async def auth_me(user=Depends(get_current_user)):
    return user

@api.post("/auth/logout")
async def logout():
    return {"ok": True}

# ==========================================================
# ==================== PUBLIC ITEMS ========================
# ==========================================================

@api.get("/public/items")
async def public_items():
    """Public endpoint untuk daftar barang yang tersedia (tanpa login)."""
    items = await db.items.find(
        {}, 
        {"_id": 0, "id": 1, "kode": 1, "nama": 1, "satuan": 1, "stok": 1}
    ).to_list(5000)
    items = sorted(items, key=lambda x: x.get("nama", ""))
    return items

@api.get("/fungsi")
async def list_fungsi():
    """Daftar fungsi yang tersedia."""
    # Nilai tetap sesuai permintaan
    return ["Pemeriksaan", "Penindakan", "Infokom", "Tata Usaha", "Pengujian"]

# -------------------- Users --------------------
ROLES = ["admin_gudang", "pegawai", "approver", "pengelola_aset", "admin"]

class UserUpdate(BaseModel):
    role: Optional[str] = None
    unit_kerja: Optional[str] = None
    name: Optional[str] = None
    nip: Optional[str] = None   
    jabatan: Optional[str] = None  # tambahkan

@api.get("/users")
async def list_users(user=Depends(require_role("admin"))):
    users = await db.users.find({}, {"_id": 0}).to_list(500)
    return users

@api.patch("/users/{user_id}")
async def update_user(user_id: str, body: UserUpdate, user=Depends(require_role("admin"))):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if "role" in upd and upd["role"] not in ROLES:
        raise HTTPException(400, "Invalid role")
    await db.users.update_one({"user_id": user_id}, {"$set": upd})
    return await db.users.find_one({"user_id": user_id}, {"_id": 0})

@api.delete("/users/{user_id}")
async def delete_user(user_id: str, user=Depends(require_role("admin"))):
    if user_id == user["user_id"]:
        raise HTTPException(400, "Cannot delete self")
    await db.users.delete_one({"user_id": user_id})
    return {"ok": True}

# -------------------- Items (Master Data) --------------------
class ItemIn(BaseModel):
    kode: str
    nama: str
    kategori: str = ""
    satuan: str = "pcs"
    harga: float = 0
    stok_min: int = 0
    is_reagen: bool = False
    expiry_date: Optional[str] = None

@api.get("/items")
async def list_items(user=Depends(get_current_user)):
    items = await db.items.find({}, {"_id": 0}).sort("kode", 1).to_list(2000)
    return items

@api.post("/items")
async def create_item(body: ItemIn, user=Depends(require_role("admin_gudang", "admin"))):
    exists = await db.items.find_one({"kode": body.kode}, {"_id": 0})
    if exists:
        raise HTTPException(400, "Kode barang sudah ada")
    doc = body.model_dump()
    doc["id"] = f"item_{uuid.uuid4().hex[:10]}"
    doc["stok"] = 0
    doc["created_at"] = iso(now_utc())
    await db.items.insert_one(doc)
    return clean(doc)

@api.patch("/items/{item_id}")
async def update_item(item_id: str, body: ItemIn, user=Depends(require_role("admin_gudang", "admin"))):
    await db.items.update_one({"id": item_id}, {"$set": body.model_dump()})
    return await db.items.find_one({"id": item_id}, {"_id": 0})

@api.delete("/items/{item_id}")
async def delete_item(item_id: str, user=Depends(require_role("admin_gudang", "admin"))):
    await db.items.delete_one({"id": item_id})
    return {"ok": True}

@api.get("/items/{item_id}/stock-card")
async def stock_card(item_id: str, user=Depends(get_current_user)):
    item = await db.items.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, "Item not found")
    movements = await db.movements.find({"item_id": item_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    return {"item": item, "movements": movements}

# Bulk import master barang from CSV / Excel
COLUMN_ALIASES = {
    "kode": ["kode", "kode_barang", "kode barang", "code"],
    "nama": ["nama", "nama_barang", "nama barang", "name"],
    "kategori": ["kategori", "category"],
    "satuan": ["satuan", "unit", "uom"],
    "harga": ["harga", "harga_jual", "harga_satuan", "harga jual", "harga satuan", "price"],
    "stok_min": ["stok_min", "stok minimum", "minimum_stock", "min_stock", "min"],
    "stok": ["stok", "tersedia", "stock", "saldo"],
    "is_reagen": ["is_reagen", "reagen"],
    "expiry_date": ["expiry_date", "kadaluarsa", "exp", "tanggal_kadaluarsa"],
}

def _map_row(row: dict) -> dict:
    lower = {str(k).strip().lower(): v for k, v in row.items() if k is not None}
    out = {}
    for field, aliases in COLUMN_ALIASES.items():
        for a in aliases:
            if a in lower and lower[a] not in (None, ""):
                out[field] = lower[a]
                break
    return out

@api.post("/items/bulk-import")
async def bulk_import_items(file: UploadFile = File(...), user=Depends(require_role("admin_gudang", "admin"))):
    import pandas as pd
    raw = await file.read()
    fname = (file.filename or "").lower()
    try:
        if fname.endswith(".xlsx") or fname.endswith(".xls"):
            df = pd.read_excel(io.BytesIO(raw), dtype=str, engine="openpyxl")
        else:
            try:
                text = raw.decode("utf-8")
            except UnicodeDecodeError:
                text = raw.decode("latin-1")
            df = pd.read_csv(io.StringIO(text), dtype=str, sep=None, engine="python")
    except Exception as e:
        raise HTTPException(400, f"Gagal membaca file: {e}")

    created, updated, errors = [], [], []
    existing_codes = {x["kode"]: x for x in await db.items.find({}, {"_id": 0}).to_list(5000)}

    for idx, raw_row in enumerate(df.fillna("").to_dict(orient="records")):
        mapped = _map_row(raw_row)
        kode = str(mapped.get("kode", "")).strip()
        nama = str(mapped.get("nama", "")).strip()
        if not kode or not nama:
            errors.append({"row": idx + 2, "error": "Kode atau Nama kosong"})
            continue
        def _to_num(v, default=0):
            try:
                if v is None or v == "":
                    return default
                s = str(v).replace(",", "").replace(".", "") if isinstance(v, str) and v.count(",") > 0 and v.count(".") == 0 else str(v).replace(",", "")
                return float(s)
            except Exception:
                return default
        def _to_int(v, default=0):
            try:
                return int(float(_to_num(v, default)))
            except Exception:
                return default
        doc = {
            "kode": kode,
            "nama": nama,
            "kategori": str(mapped.get("kategori", "")).strip(),
            "satuan": str(mapped.get("satuan", "pcs")).strip() or "pcs",
            "harga": _to_num(mapped.get("harga", 0)),
            "stok_min": _to_int(mapped.get("stok_min", 0)),
            "is_reagen": str(mapped.get("is_reagen", "")).strip().lower() in ("1", "true", "ya", "yes", "y"),
            "expiry_date": str(mapped.get("expiry_date", "")).strip() or None,
        }
        if kode in existing_codes:
            await db.items.update_one({"kode": kode}, {"$set": doc})
            updated.append(kode)
        else:
            doc["id"] = f"item_{uuid.uuid4().hex[:10]}"
            doc["stok"] = _to_int(mapped.get("stok", 0))
            doc["created_at"] = iso(now_utc())
            await db.items.insert_one(doc)
            created.append(kode)
    return {
        "created": len(created),
        "updated": len(updated),
        "errors": errors,
        "created_codes": created[:50],
        "updated_codes": updated[:50],
    }

@api.get("/items/template.csv")
async def items_template():
    csv = "kode,nama,kategori,satuan,harga,stok_min,is_reagen,expiry_date\n"
    csv += "ATK003,Pulpen Standard,ATK,pcs,2500,20,false,\n"
    csv += "RGN004,Asam Sulfat 98%,REAGEN,ltr,420000,2,true,2026-12-31\n"
    return Response(
        content=csv,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="template_items.csv"'},
    )

# -------------------- Incoming (Pembelian) --------------------
class IncomingLine(BaseModel):
    item_id: str
    jumlah: int
    harga_beli: float

class IncomingIn(BaseModel):
    tanggal: str
    no_faktur: str
    supplier: str = ""
    lines: List[IncomingLine]
    catatan: str = ""

@api.post("/incoming")
async def create_incoming(body: IncomingIn, user=Depends(require_role("admin_gudang", "admin"))):
    if not body.lines:
        raise HTTPException(400, "Daftar barang tidak boleh kosong")
    if not body.no_faktur:
        raise HTTPException(400, "Nomor faktur wajib diisi")
    ids = [l.item_id for l in body.lines]
    existing = await db.items.find({"id": {"$in": ids}}, {"_id": 0, "id": 1, "nama": 1}).to_list(2000)
    found = {x["id"] for x in existing}
    missing = [i for i in ids if i not in found]
    if missing:
        raise HTTPException(400, f"Barang tidak ditemukan: {', '.join(missing)}")
    for l in body.lines:
        if l.jumlah <= 0:
            raise HTTPException(400, "Jumlah harus lebih dari 0")
        if l.harga_beli < 0:
            raise HTTPException(400, "Harga beli tidak boleh negatif")

    doc_id = f"in_{uuid.uuid4().hex[:10]}"
    total = sum(l.jumlah * l.harga_beli for l in body.lines)
    doc = {
        "id": doc_id,
        "tanggal": body.tanggal,
        "no_faktur": body.no_faktur,
        "supplier": body.supplier,
        "catatan": body.catatan,
        "lines": [l.model_dump() for l in body.lines],
        "total_nilai": total,
        "created_by": user["user_id"],
        "created_at": iso(now_utc()),
    }
    await db.incoming.insert_one(doc)
    applied_items = []
    inserted_movements = []
    try:
        for l in body.lines:
            await db.items.update_one({"id": l.item_id}, {"$inc": {"stok": l.jumlah}})
            applied_items.append((l.item_id, l.jumlah))
            mv_id = f"mv_{uuid.uuid4().hex[:10]}"
            await db.movements.insert_one({
                "id": mv_id,
                "item_id": l.item_id,
                "tipe": "MASUK",
                "ref": body.no_faktur,
                "jumlah": l.jumlah,
                "harga": l.harga_beli,
                "tanggal": body.tanggal,
                "created_at": iso(now_utc()),
            })
            inserted_movements.append(mv_id)
    except Exception as e:
        for iid, delta in applied_items:
            await db.items.update_one({"id": iid}, {"$inc": {"stok": -delta}})
        if inserted_movements:
            await db.movements.delete_many({"id": {"$in": inserted_movements}})
        await db.incoming.delete_one({"id": doc_id})
        log.error(f"Incoming rollback: {e}")
        raise HTTPException(500, f"Transaksi gagal, dibatalkan: {e}")
    return clean(doc)

@api.get("/incoming")
async def list_incoming(user=Depends(get_current_user)):
    docs = await db.incoming.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs

# -------------------- SPB Requests --------------------
class SPBLine(BaseModel):
    item_id: str
    jumlah: int          # ini adalah permintaan
    disetujui: Optional[int] = None   # jumlah yang disetujui (diisi saat approval)
    keterangan: Optional[str] = None  # keterangan dari approval
    keperluan: str = ""

class ApprovalLine(BaseModel):
    item_id: str
    disetujui: int
    keterangan: str = ""

class ApprovalAction(BaseModel):
    action: str
    paraf: str = ""
    alasan: str = ""
    lines: List[ApprovalLine] = []   # daftar penyesuaian per barang

class SPBIn(BaseModel):
    nama_pegawai: str
    nip_pegawai: str = "" 
    unit_kerja: str
    jabatan_peminta: str = ""  # tambahkan
    keperluan: str = ""
    lines: List[SPBLine]

def gen_nomor_surat(prefix: str, seq: int):
    bulan_romawi = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]
    now = now_utc()
    return f"{seq:04d}/{prefix}/{bulan_romawi[now.month]}/{now.year}"

@api.post("/spb")
async def create_spb(body: SPBIn):
    count = await db.spb.count_documents({})
    nomor = gen_nomor_surat("PSD", count + 1)
    doc = {
        "id": f"spb_{uuid.uuid4().hex[:10]}",
        "nomor": nomor,
        "nama_pegawai": body.nama_pegawai,
        "nip_pegawai": body.nip_pegawai,
        "unit_kerja": body.unit_kerja,
        "jabatan_peminta": body.jabatan_peminta,  # tambahkan
        "keperluan": body.keperluan,
        "lines": [l.model_dump() for l in body.lines],
        "status": "PENDING",
        "approver_id": None,
        "approver_name": None,
        "approver_nip": None,  # tambahkan untuk menyimpan NIP Kepala Fungsi
        "approver_paraf": None,
        "approved_at": None,
        "alasan_tolak": None,
        "created_at": iso(now_utc()),
    }
    await db.spb.insert_one(doc)
    return clean(doc)

@api.get("/spb")
async def list_spb(status: Optional[str] = None, user=Depends(get_current_user)):
    q = {}
    if status:
        q["status"] = status
    docs = await db.spb.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs

@api.get("/spb/{spb_id}")
async def get_spb(spb_id: str):
    doc = await db.spb.find_one({"id": spb_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "SPB not found")
    return doc

class ApprovalAction(BaseModel):
    action: str
    paraf: str = ""
    alasan: str = ""
@api.post("/spb/{spb_id}/action")
async def spb_action(spb_id: str, body: ApprovalAction, user=Depends(require_role("approver", "admin"))):
    spb = await db.spb.find_one({"id": spb_id}, {"_id": 0})
    if not spb:
        raise HTTPException(404, "SPB not found")
    if spb["status"] != "PENDING":
        raise HTTPException(400, "SPB already processed")
    if body.action == "APPROVE":
        # Validasi jabatan
        if user.get("jabatan") != "kepala_fungsi":
            raise HTTPException(403, "Hanya Kepala Fungsi yang dapat menyetujui")
        # Generate QR Code dari NIP Kepala Fungsi
        qr_data = f"{FRONTEND_URL}/approval/{spb_id}?nip={user.get('nip')}"
        qr_img = qrcode.make(qr_data)
        qr_buffer = io.BytesIO()
        qr_img.save(qr_buffer, format="PNG")
        qr_base64 = base64.b64encode(qr_buffer.getvalue()).decode()
        
        # Simpan QR ke SPB
        await db.spb.update_one(
            {"id": spb_id},
            {"$set": {"approver_qr": qr_base64}}
        )
        # Update setiap line dengan disetujui dan keterangan
        for line_update in body.lines:
            for idx, line in enumerate(spb["lines"]):
                if line["item_id"] == line_update.item_id:
                    # Set disetujui dan keterangan
                    spb["lines"][idx]["disetujui"] = line_update.disetujui
                    spb["lines"][idx]["keterangan"] = line_update.keterangan
                    break
        
        # Simpan perubahan ke database (sebelum melanjutkan)
        await db.spb.update_one(
            {"id": spb_id},
            {"$set": {"lines": spb["lines"]}}
        sbbk_count = await db.sbbk.count_documents({})
        sbbk_nomor = gen_nomor_surat("SBBK", sbbk_count + 1)
        applied_items = []
        inserted_movements = []
        sbbk_id = f"sbbk_{uuid.uuid4().hex[:10]}"
        try:
            for l in spb["lines"]:
                await db.items.update_one({"id": l["item_id"]}, {"$inc": {"stok": -l["jumlah"]}})
                applied_items.append((l["item_id"], l["jumlah"]))
                mv_id = f"mv_{uuid.uuid4().hex[:10]}"
                await db.movements.insert_one({
                    "id": mv_id,
                    "item_id": l["item_id"],
                    "tipe": "KELUAR",
                    "ref": sbbk_nomor,
                    "jumlah": l["jumlah"],
                    "harga": 0,
                    "tanggal": now_utc().strftime("%Y-%m-%d"),
                    "created_at": iso(now_utc()),
                })
                inserted_movements.append(mv_id)
            sbbk = {
                "id": sbbk_id,
                "nomor": sbbk_nomor,
                "spb_id": spb_id,
                "spb_nomor": spb["nomor"],
                "nama_penerima": spb["nama_pegawai"],
                "unit_kerja": spb["unit_kerja"],
                "lines": spb["lines"],
                "created_at": iso(now_utc()),
            }
            await db.sbbk.insert_one(sbbk)
            await db.spb.update_one({"id": spb_id}, {"$set": {
                "status": "APPROVED",
                "approver_id": user["user_id"],
                "approver_name": user["name"],
                "approver_paraf": body.paraf,
                "approved_at": iso(now_utc()),
                "sbbk_nomor": sbbk_nomor,
            }})
        except Exception as e:
            for iid, qty in applied_items:
                await db.items.update_one({"id": iid}, {"$inc": {"stok": qty}})
            if inserted_movements:
                await db.movements.delete_many({"id": {"$in": inserted_movements}})
            await db.sbbk.delete_one({"id": sbbk_id})
            log.error(f"Approval rollback for SPB {spb_id}: {e}")
            raise HTTPException(500, f"Approval gagal, perubahan dibatalkan: {e}")
    else:
        await db.spb.update_one({"id": spb_id}, {"$set": {
            "status": "REJECTED",
            "approver_id": user["user_id"],
            "approver_name": user["name"],
            "approved_at": iso(now_utc()),
            "alasan_tolak": body.alasan,
        }})
    return await db.spb.find_one({"id": spb_id}, {"_id": 0})

@api.get("/sbbk/{sbbk_id}")
async def get_sbbk(sbbk_id: str, user=Depends(get_current_user)):
    doc = await db.sbbk.find_one({"id": sbbk_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "SBBK not found")
    return doc

@api.get("/sbbk")
async def list_sbbk(user=Depends(get_current_user)):
    docs = await db.sbbk.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs

# -------------------- Assets --------------------
class AssetIn(BaseModel):
    nup: str
    nama: str
    kategori: str = ""
    lokasi: str = ""
    tahun_perolehan: Optional[int] = None
    harga: float = 0
    kondisi: str = "BAIK"
    bast: str = ""
    foto_path: Optional[str] = None

@api.get("/assets")
async def list_assets(user=Depends(get_current_user)):
    docs = await db.assets.find({}, {"_id": 0}).sort("nup", 1).to_list(2000)
    return docs

@api.get("/assets/{asset_id}")
async def get_asset(asset_id: str):
    doc = await db.assets.find_one({"id": asset_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Asset not found")
    return doc

@api.post("/assets")
async def create_asset(body: AssetIn, user=Depends(require_role("pengelola_aset", "admin"))):
    doc = body.model_dump()
    doc["id"] = f"ast_{uuid.uuid4().hex[:10]}"
    doc["created_at"] = iso(now_utc())
    await db.assets.insert_one(doc)
    return clean(doc)

@api.patch("/assets/{asset_id}")
async def update_asset(asset_id: str, body: AssetIn, user=Depends(require_role("pengelola_aset", "admin"))):
    await db.assets.update_one({"id": asset_id}, {"$set": body.model_dump()})
    return await db.assets.find_one({"id": asset_id}, {"_id": 0})

class KondisiUpdate(BaseModel):
    kondisi: str
    catatan: str = ""

@api.post("/assets/{asset_id}/kondisi")
async def update_kondisi(asset_id: str, body: KondisiUpdate, user=Depends(get_current_user)):
    if body.kondisi not in ["BAIK", "RUSAK_RINGAN", "RUSAK_BERAT"]:
        raise HTTPException(400, "Invalid kondisi")
    await db.assets.update_one({"id": asset_id}, {"$set": {"kondisi": body.kondisi, "catatan_kondisi": body.catatan}})
    await db.asset_inspections.insert_one({
        "id": f"insp_{uuid.uuid4().hex[:10]}",
        "asset_id": asset_id,
        "kondisi": body.kondisi,
        "catatan": body.catatan,
        "by_user_id": user["user_id"],
        "by_user_name": user["name"],
        "created_at": iso(now_utc()),
    })
    return await db.assets.find_one({"id": asset_id}, {"_id": 0})

@api.delete("/assets/{asset_id}")
async def delete_asset(asset_id: str, user=Depends(require_role("pengelola_aset", "admin"))):
    await db.assets.delete_one({"id": asset_id})
    return {"ok": True}

@api.get("/assets/{asset_id}/qr.png")
async def asset_qr(asset_id: str, frontend_url: str = Query(...)):
    url = f"{frontend_url}/asset-inspect/{asset_id}"
    img = qrcode.make(url, box_size=10, border=2)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return Response(content=buf.read(), media_type="image/png")

# -------------------- Upload (Local Storage) --------------------
@api.post("/upload")
async def upload_file(file: UploadFile = File(...), user=Depends(get_current_user)):
    # Simpan file lokal
    ext = (file.filename.split(".")[-1] if "." in file.filename else "bin").lower()
    safe_filename = f"{uuid.uuid4()}.{ext}"
    user_dir = UPLOAD_DIR / user['user_id']
    user_dir.mkdir(exist_ok=True)
    file_path = user_dir / safe_filename
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    rec_id = str(uuid.uuid4())
    await db.files.insert_one({
        "id": rec_id,
        "path": str(file_path.relative_to(ROOT_DIR)),
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": len(content),
        "is_deleted": False,
        "uploaded_by": user["user_id"],
        "created_at": iso(now_utc())
    })
    return {"id": rec_id, "path": str(file_path.relative_to(ROOT_DIR)), "url": f"/api/files/{file_path.relative_to(ROOT_DIR)}"}

@api.get("/files/{path:path}")
async def serve_file(path: str):
    file_path = ROOT_DIR / path
    if not file_path.exists():
        raise HTTPException(404, "File not found")
    return FileResponse(file_path)

# -------------------- Dashboard --------------------
@api.get("/dashboard/stats")
async def dashboard_stats(user=Depends(get_current_user)):
    items = await db.items.find({}, {"_id": 0}).to_list(2000)
    assets = await db.assets.find({}, {"_id": 0}).to_list(2000)
    low_stock = [i for i in items if i.get("stok", 0) <= i.get("stok_min", 0)]
    total_nilai = sum(i.get("stok", 0) * i.get("harga", 0) for i in items)
    expiring = []
    today = now_utc().date()
    for it in items:
        if it.get("is_reagen") and it.get("expiry_date"):
            try:
                ed = datetime.strptime(it["expiry_date"], "%Y-%m-%d").date()
                days_left = (ed - today).days
                if days_left <= 90:
                    expiring.append({**it, "days_left": days_left})
            except Exception:
                pass
    kondisi_counts = {"BAIK": 0, "RUSAK_RINGAN": 0, "RUSAK_BERAT": 0}
    for a in assets:
        k = a.get("kondisi", "BAIK")
        kondisi_counts[k] = kondisi_counts.get(k, 0) + 1
    pending_spb = await db.spb.count_documents({"status": "PENDING"})
    return {
        "total_items": len(items),
        "total_assets": len(assets),
        "low_stock_count": len(low_stock),
        "low_stock_items": low_stock[:10],
        "total_nilai": total_nilai,
        "expiring": expiring,
        "kondisi_counts": kondisi_counts,
        "pending_spb": pending_spb,
    }

# -------------------- Settings (Surat Template URLs) --------------------
SETTINGS_KEY = "app_settings"

@api.get("/settings")
async def get_settings(user=Depends(get_current_user)):
    s = await db.settings.find_one({"key": SETTINGS_KEY}, {"_id": 0}) or {}
    return {
        "spb_template_doc_id": s.get("spb_template_doc_id", ""),
        "sbbk_template_doc_id": s.get("sbbk_template_doc_id", ""),
    }

class SettingsIn(BaseModel):
    spb_template_doc_id: Optional[str] = None
    sbbk_template_doc_id: Optional[str] = None

def _extract_doc_id(s: str) -> str:
    if not s:
        return ""
    s = s.strip()
    m = re.search(r"/document/d/([a-zA-Z0-9_\-]+)", s)
    if m:
        return m.group(1)
    return s

@api.put("/settings")
async def update_settings(body: SettingsIn, user=Depends(require_role("admin", "admin_gudang"))):
    upd = {}
    if body.spb_template_doc_id is not None:
        upd["spb_template_doc_id"] = _extract_doc_id(body.spb_template_doc_id)
    if body.sbbk_template_doc_id is not None:
        upd["sbbk_template_doc_id"] = _extract_doc_id(body.sbbk_template_doc_id)
    await db.settings.update_one({"key": SETTINGS_KEY}, {"$set": {"key": SETTINGS_KEY, **upd}}, upsert=True)
    return await get_settings(user)

# -------------------- Surat (Google Docs template render) --------------------
def _fetch_gdoc_html(doc_id: str) -> str:
    url = f"https://docs.google.com/document/d/{doc_id}/export?format=html"
    r = requests.get(url, timeout=30, allow_redirects=True)
    if r.status_code != 200 or "<body" not in r.text:
        raise HTTPException(400, "Gagal memuat Google Doc. Pastikan dibagikan 'Anyone with the link can view'.")
    return r.text

NAMA_BULAN_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"]

def _fmt_tanggal(dt_str: str) -> str:
    if not dt_str:
        return ""
    try:
        d = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        return f"{d.day} {NAMA_BULAN_ID[d.month-1]} {d.year}"
    except Exception:
        return dt_str

def _render_template(html_text: str, ctx: dict, rows: list) -> str:
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html_text, "lxml")
    raw = str(soup)
    has_explicit_placeholder = "{{" in raw
    if has_explicit_placeholder:
        row_keys = set(re.findall(r"\{\{\s*row\.([a-zA-Z0-9_]+)\s*\}\}", raw))
        if row_keys:
            for tr in list(soup.find_all("tr")):
                tr_str = str(tr)
                if "{{row." not in tr_str and "{{ row." not in tr_str:
                    continue
                for r in rows:
                    new_html = tr_str
                    for k in row_keys:
                        val = "" if r.get(k) is None else str(r.get(k))
                        new_html = re.sub(r"\{\{\s*row\." + re.escape(k) + r"\s*\}\}", val, new_html)
                    new_tr = BeautifulSoup(new_html, "lxml").find("tr")
                    if new_tr:
                        tr.insert_before(new_tr)
                tr.extract()
        result = str(soup)
        for k, v in ctx.items():
            result = re.sub(r"\{\{\s*" + re.escape(k) + r"\s*\}\}", "" if v is None else str(v), result)
        return result

    # Auto-fill mode
    def _txt(el):
        return el.get_text(separator=" ", strip=True) if el else ""

    for tag in soup.find_all(["p", "span", "div", "td"]):
        t = _txt(tag)
        if re.match(r"^\s*Nomor\s*:\s*$", t):
            tag.append(" " + str(ctx.get("nomor", "")))
            break
        if t.startswith("Nomor :") and len(t) < 15:
            for child in list(tag.children):
                child.extract()
            tag.append(f"Nomor : {ctx.get('nomor', '')}")
            break

    LABEL_MAP = {
        "unit kerja": "unit_kerja",
        "no. dan tgl. spb": "tanggal_spb",
        "tanggal permintaan": "tanggal_permintaan",
        "nama pegawai": "nama_pegawai",
        "keperluan": "keperluan",
    }
    for tr in soup.find_all("tr"):
        tds = tr.find_all(["td", "th"])
        if len(tds) < 2:
            continue
        label = _txt(tds[0]).lower().strip().rstrip(":").strip()
        if label in LABEL_MAP:
            target_cell = tds[-1]
            if not _txt(target_cell):
                key = LABEL_MAP[label]
                val = ctx.get(key, "")
                if val:
                    new_p = soup.new_tag("p")
                    new_p.string = str(val)
                    target_cell.append(new_p)

    target_table = None
    for tbl in soup.find_all("table"):
        first_tr = tbl.find("tr")
        if not first_tr:
            continue
        headers_text = _txt(first_tr).lower()
        if "nama barang" in headers_text:
            target_table = tbl
            break

    if target_table and rows:
        all_trs = target_table.find_all("tr")
        header_count = 1
        if len(all_trs) >= 2:
            r1_text = _txt(all_trs[1]).lower()
            if "permintaan" in r1_text or "disetujui" in r1_text:
                header_count = 2
        header_rows = all_trs[:header_count]
        data_rows = all_trs[header_count:]

        col_keys = []
        if header_count == 2:
            top_cells = header_rows[0].find_all(["td", "th"])
            sub_cells = header_rows[1].find_all(["td", "th"])
            top_flat = []
            for c in top_cells:
                cs = int(c.get("colspan", 1))
                for _ in range(cs):
                    top_flat.append(_txt(c).lower())
            sub_iter = iter(sub_cells)
            for i, t in enumerate(top_flat):
                if "jumlah" in t and i < len(top_flat) - 1 and top_flat[i] == top_flat[i + 1]:
                    sub = _txt(next(sub_iter, soup.new_tag("td"))).lower()
                    col_keys.append("permintaan" if "perminta" in sub else "disetujui")
                else:
                    col_keys.append(t)
        else:
            col_keys = [_txt(c).lower() for c in header_rows[0].find_all(["td", "th"])]

        def header_to_key(h):
            h = h.strip()
            if "no" == h or h.startswith("no."):
                return "no"
            if "nama" in h:
                return "nama"
            if "satuan" in h:
                return "satuan"
            if "jumlah" in h:
                return "jumlah"
            if "perminta" in h:
                return "permintaan"
            if "disetuj" in h:
                return "disetujui"
            if "keperluan" in h:
                return "keperluan"
            if "keterangan" in h:
                return "keterangan"
            return None

        data_keys = [header_to_key(h) for h in col_keys]
        template_row = data_rows[0] if data_rows else None
        if template_row:
            for r in data_rows:
                r.extract()
            for r in rows:
                new_tr = BeautifulSoup(str(template_row), "lxml").find("tr")
                cells = new_tr.find_all(["td", "th"])
                for ci, cell in enumerate(cells):
                    if ci >= len(data_keys):
                        break
                    key = data_keys[ci]
                    val = r.get(key, "") if key else ""
                    for ch in list(cell.children):
                        ch.extract()
                    if val != "":
                        new_p = soup.new_tag("p")
                        new_p.string = str(val)
                        cell.append(new_p)
                target_table.append(new_tr)

    for tbl in soup.find_all("table"):
        trs = tbl.find_all("tr")
        if len(trs) < 2:
            continue
        last_tr = trs[-1]
        cells = last_tr.find_all(["td", "th"])
        if not (len(cells) >= 2 and all("NIP" in _txt(c) for c in cells if _txt(c))):
            continue
        first_cells = trs[0].find_all(["td", "th"])
        if len(first_cells) < 2:
            continue
        labels = [_txt(c).lower() for c in first_cells]
        name_row = trs[-2] if len(trs) >= 2 else None
        if name_row:
            name_cells = name_row.find_all(["td", "th"])
            for i, cell in enumerate(name_cells):
                if i >= len(labels):
                    break
                lab = labels[i] if i < len(labels) else ""
                val = ""
                if "yang menerima" in lab or "penerima" in lab:
                    val = ctx.get("nama_penerima", "")
                elif "pengelola" in lab:
                    val = ctx.get("nama_pengelola", "")
                elif "pejabat" in lab or "menyetujui" in lab:
                    val = ctx.get("nama_pejabat", "") or ctx.get("approver_name", "")
                elif "meminta" in lab:
                    val = ctx.get("nama_pegawai", "")
                if val and not _txt(cell):
                    new_p = soup.new_tag("p")
                    new_p.string = str(val)
                    cell.append(new_p)

    return str(soup)

def _build_ctx_rows(spb: dict, items_by_id: dict, type_: str):
    rows = []
    for i, l in enumerate(spb.get("lines", [])):
        it = items_by_id.get(l["item_id"], {})
        rows.append({
            "no": i + 1,
            "kode": it.get("kode", ""),
            "nama": it.get("nama", l["item_id"]),
            "satuan": it.get("satuan", ""),
            "permintaan": l["jumlah"],                     # jumlah yang diminta
            "disetujui": l.get("disetujui", l["jumlah"]),  # jumlah yang disetujui (default = permintaan)
            "keterangan": l.get("keterangan", ""),         # keterangan dari approval
            "keperluan": l.get("keperluan", "") or spb.get("keperluan", ""),
            "harga": it.get("harga", 0),
        })
    today = now_utc()
    place_date = f"Jember, {today.day} {NAMA_BULAN_ID[today.month-1]} {today.year}"
    nomor_current = (spb.get("sbbk_nomor") if type_ == "sbbk" else spb.get("nomor")) or ""
    ctx = {
        "nomor": nomor_current,
        "no_surat": nomor_current,
        "nomor_spb": spb.get("nomor", ""),
        "nomor_sbbk": spb.get("sbbk_nomor", ""),
        "unit_kerja": spb.get("unit_kerja", ""),
        "nama_pegawai": spb.get("nama_pegawai", ""),
        "nip_pegawai": spb.get("nip_pegawai", ""),
        "nama_penerima": spb.get("nama_pegawai", ""),
        "tanggal_permintaan": _fmt_tanggal(spb.get("created_at", "")),
        "tanggal": _fmt_tanggal(spb.get("created_at", "")),
        "tanggal_spb": _fmt_tanggal(spb.get("created_at", "")),
        "tanggal_keluar": _fmt_tanggal(spb.get("approved_at", "")) or place_date.split(", ", 1)[1],
        "place_date": place_date,
        "tempat_tanggal": place_date,
        "keperluan": spb.get("keperluan", ""),
        "status": spb.get("status", ""),
        "approver_name": spb.get("approver_name", ""),
        "nama_pejabat": spb.get("approver_name", ""),
        "approver_paraf": spb.get("approver_paraf", ""),
        "nama_pengelola": "",
        "nip_pengelola": "",
        "nip_pegawai": "",
        "nip_pejabat": "",
        "nip_penerima": "",
        "nama_kepala_fungsi": spb.get("approver_name", ""),
        "nip_kepala_fungsi": spb.get("approver_nip", ""),
        "approver_qr": spb.get("approver_qr", ""),  # QR code dalam base64
    }
    return ctx, rows

@api.get("/surat/render/{type}/{spb_id}")
async def render_surat(type: str, spb_id: str, user=Depends(get_current_user)):
    if type not in ("spb", "sbbk"):
        raise HTTPException(400, "Type harus 'spb' atau 'sbbk'")
    spb = await db.spb.find_one({"id": spb_id}, {"_id": 0})
    if not spb:
        raise HTTPException(404, "SPB tidak ditemukan")
    settings = await db.settings.find_one({"key": SETTINGS_KEY}, {"_id": 0}) or {}
    doc_id = settings.get(f"{type}_template_doc_id", "")
    if not doc_id:
        raise HTTPException(400, f"Template Google Doc untuk {type.upper()} belum diatur. Buka menu Pengaturan.")
    items_by_id = {x["id"]: x for x in await db.items.find({}, {"_id": 0}).to_list(5000)}
    ctx, rows = _build_ctx_rows(spb, items_by_id, type)
    html_text = _fetch_gdoc_html(doc_id)
    rendered = _render_template(html_text, ctx, rows)
    return Response(content=rendered, media_type="text/html; charset=utf-8")

@api.get("/surat/data/{type}/{spb_id}")
async def render_surat_data(type: str, spb_id: str, user=Depends(get_current_user)):
    if type not in ("spb", "sbbk"):
        raise HTTPException(400, "Type harus 'spb' atau 'sbbk'")
    spb = await db.spb.find_one({"id": spb_id}, {"_id": 0})
    if not spb:
        raise HTTPException(404, "SPB tidak ditemukan")
    items_by_id = {x["id"]: x for x in await db.items.find({}, {"_id": 0}).to_list(5000)}
    ctx, rows = _build_ctx_rows(spb, items_by_id, type)
    return {"context": ctx, "rows": rows}

# -------------------- Reports --------------------
@api.get("/reports/stock-opname")
async def report_stock_opname(user=Depends(get_current_user)):
    items = await db.items.find({}, {"_id": 0}).sort("kode", 1).to_list(5000)
    return items

# -------------------- Seed --------------------
@api.post("/admin/seed")
async def seed_data(user=Depends(get_current_user)):
    count = await db.items.count_documents({})
    if count > 0 and user.get("role") != "admin":
        raise HTTPException(400, "Data already exists")
    samples = [
        {"kode": "100004", "nama": "AJWA GALON", "kategori": "AIR MINUM", "satuan": "gal", "harga": 19000, "stok_min": 5, "stok": 20, "is_reagen": False},
        {"kode": "8886008101336", "nama": "AQUA BOTOL 330ML", "kategori": "AIR MINUM", "satuan": "btl", "harga": 3000, "stok_min": 24, "stok": 0, "is_reagen": False},
        {"kode": "8886008101138", "nama": "AQUA GALON", "kategori": "AIR MINUM", "satuan": "gal", "harga": 18500, "stok_min": 5, "stok": 15, "is_reagen": False},
        {"kode": "ATK001", "nama": "Kertas A4 80gr", "kategori": "ATK", "satuan": "rim", "harga": 55000, "stok_min": 10, "stok": 25, "is_reagen": False},
        {"kode": "ATK002", "nama": "Tinta Printer Hitam", "kategori": "ATK", "satuan": "btl", "harga": 85000, "stok_min": 5, "stok": 3, "is_reagen": False},
        {"kode": "RGN001", "nama": "Methanol HPLC Grade", "kategori": "REAGEN", "satuan": "ltr", "harga": 450000, "stok_min": 2, "stok": 5, "is_reagen": True, "expiry_date": (now_utc().date() + timedelta(days=45)).isoformat()},
        {"kode": "RGN002", "nama": "Acetonitrile", "kategori": "REAGEN", "satuan": "ltr", "harga": 520000, "stok_min": 2, "stok": 8, "is_reagen": True, "expiry_date": (now_utc().date() + timedelta(days=180)).isoformat()},
        {"kode": "RGN003", "nama": "Buffer pH 7", "kategori": "REAGEN", "satuan": "btl", "harga": 75000, "stok_min": 3, "stok": 2, "is_reagen": True, "expiry_date": (now_utc().date() + timedelta(days=20)).isoformat()},
    ]
    for s in samples:
        s["id"] = f"item_{uuid.uuid4().hex[:10]}"
        s["created_at"] = iso(now_utc())
        await db.items.insert_one(s)
    asset_samples = [
        {"nup": "BMN-001", "nama": "PC Desktop Dell OptiPlex", "kategori": "PERANGKAT IT", "lokasi": "Lab Mikrobiologi", "tahun_perolehan": 2023, "harga": 12000000, "kondisi": "BAIK", "bast": "BAST/2023/001"},
        {"nup": "BMN-002", "nama": "Kursi Kantor Ergonomis", "kategori": "MEUBELAIR", "lokasi": "R. Kepala", "tahun_perolehan": 2022, "harga": 2500000, "kondisi": "BAIK", "bast": "BAST/2022/045"},
        {"nup": "BMN-003", "nama": "Lemari Arsip Besi", "kategori": "MEUBELAIR", "lokasi": "R. Arsip", "tahun_perolehan": 2021, "harga": 3500000, "kondisi": "RUSAK_RINGAN", "bast": "BAST/2021/012"},
        {"nup": "BMN-004", "nama": "Printer Laserjet HP", "kategori": "PERANGKAT IT", "lokasi": "Sekretariat", "tahun_perolehan": 2023, "harga": 4500000, "kondisi": "BAIK", "bast": "BAST/2023/007"},
        {"nup": "BMN-005", "nama": "AC Split 1 PK", "kategori": "ELEKTRONIK", "lokasi": "Lab Kimia", "tahun_perolehan": 2020, "harga": 4200000, "kondisi": "RUSAK_BERAT", "bast": "BAST/2020/033"},
    ]
    for a in asset_samples:
        a["id"] = f"ast_{uuid.uuid4().hex[:10]}"
        a["created_at"] = iso(now_utc())
        await db.assets.insert_one(a)
    return {"ok": True, "items": len(samples), "assets": len(asset_samples)}

# -------------------- Root --------------------
@api.get("/")
async def root():
    return {"app": "BPOM Jember Inventory", "status": "ok"}

# -------------------- Startup --------------------
@app.on_event("startup")
async def startup():
    log.info("Starting up...")
    await db.items.create_index("kode", unique=False)
    await db.movements.create_index("item_id")
    await db.users.create_index("username", unique=True)
    try:
        await db.users.drop_index("email_1")
    except Exception:
        pass

    await db.users.create_index(
        "email",
        unique=True,
        partialFilterExpression={"email": {"$type": "string"}}
    )
    await db.user_sessions.create_index("session_token", unique=True)

@app.on_event("shutdown")
async def shutdown():
    client.close()

@app.options("/{path:path}")
async def options_handler(path: str):
    return Response(
        headers={
            "Access-Control-Allow-Origin": "https://bpom-jember-frontend.onrender.com",
            "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, Origin, X-Requested-With",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "3600",
        }
    )

app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://bpom-jember-frontend.onrender.com",
        "https://DOMAIN-VERCEL-KAMU.vercel.app",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
    expose_headers=["Content-Type", "Authorization"],
    max_age=3600,
)
