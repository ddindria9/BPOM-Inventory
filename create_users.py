import bcrypt
from pymongo import MongoClient
from datetime import datetime, timezone
import uuid
import random
import string
import csv

# Konfigurasi MongoDB
MONGO_URL = "mongodb+srv://diniindriani459_db_user:YgMKrksbgYPkipaV@cluster0.fu8dak7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0&tlsAllowInvalidCertificates=true"
DB_NAME = "diniindriani459_db_user"

client = MongoClient(MONGO_URL)
db = client[DB_NAME]
users_collection = db["users"]

# Mapping role
ROLE_MAP = {
    "Administrator": "admin",
    "Approval": "approver",
    "Pegawai - Staff": "pegawai",
    "Admin Gudang": "admin_gudang",
}

def generate_password(length=8):
    chars = string.ascii_letters + string.digits
    return ''.join(random.choice(chars) for _ in range(length))

# Data user
data_users = [
    {"no": 1, "nama": "Benny Hendrawan Prabowo, S.Farm, Apt.", "nip": "19840401 200712 1 001", "jabatan": "Kepala Balai POM di Jember", "penugasan": "Kepala Balai POM di Jember", "email": "benyy.prabowo@pom.go.id", "role": "Administrator"},
    {"no": 2, "nama": "Puji Lestari, SE", "nip": "19881017 201402 2 002", "jabatan": "Kepala Sub Bagian Tata Usaha pada Balai POM di Jember", "penugasan": "Kepala Sub Bagian Tata Usaha pada Balai POM di Jember", "email": "puji.lestari@pom.go.id", "role": "Approval"},
    {"no": 3, "nama": "Yusita Harminingsih, S.Farm., Apt", "nip": "19810531 200604 2 005", "jabatan": "Pengawas Farmasi dan Makanan Ahli Muda", "penugasan": "Pemeriksaan", "email": "yusita.harminingsih@pom.go.id", "role": "Pegawai - Staff"},
    {"no": 4, "nama": "Diana Pristawiti Novira, STP, M.Si", "nip": "19791109 200501 2 001", "jabatan": "Pengawas Farmasi dan Makanan Ahli Muda", "penugasan": "Informasi dan Komunikasi dan Pemeriksaan", "email": "diana.pristawiti@pom.go.id", "role": "Pegawai - Staff"},
    {"no": 5, "nama": "Wildansyah Azami, S.Farm, Apt", "nip": "19900717 201801 1 001", "jabatan": "Pengawas Farmasi dan Makanan Ahli Muda", "penugasan": "Pemeriksaan", "email": "wildansyah.azami@pom.go.id", "role": "Pegawai - Staff"},
    {"no": 6, "nama": "Ika Rizki Helwandi, S.Farm., Apt.", "nip": "19940104 201903 2 004", "jabatan": "Pengawas Farmasi dan Makanan Ahli Muda", "penugasan": "Pemeriksaan", "email": "ika.helwandi@pom.go.id", "role": "Pegawai - Staff"},
    {"no": 7, "nama": "Mia Riswani, S.Farm., Apt.", "nip": "19940726 201903 2 007", "jabatan": "Pengawas Farmasi dan Makanan Ahli Muda", "penugasan": "Pemeriksaan", "email": "mia.riswani@pom.go.id", "role": "Pegawai - Staff"},
    {"no": 8, "nama": "Tiara Dimas Hapsari, S.Farm., Apt.", "nip": "19951003 201903 2 003", "jabatan": "Pengawas Farmasi dan Makanan Ahli Pertama", "penugasan": "Pemeriksaan dan Pengujian", "email": "tiara.hapsari@pom.go.id", "role": "Pegawai - Staff"},
    {"no": 9, "nama": "Yodi Setiadi, S.Farm., Apt.", "nip": "19940430 201903 1 001", "jabatan": "Pengawas Farmasi dan Makanan Ahli Pertama", "penugasan": "Pemeriksaan", "email": "yodi.setiadi@pom.go.id", "role": "Pegawai - Staff"},
    {"no": 10, "nama": "Ayu Safitri, S.TP", "nip": "19930613 201903 2 004", "jabatan": "Pengawas Farmasi dan Makanan Ahli Pertama", "penugasan": "Pemeriksaan", "email": "ayu.safitri@pom.go.id", "role": "Pegawai - Staff"},
    {"no": 11, "nama": "Putu Shintya Ari Pratiwi, S.TP.", "nip": "19940118 201903 2 005", "jabatan": "Pengawas Farmasi dan Makanan Ahli Pertama", "penugasan": "Pemeriksaan", "email": "shintya.pratiwi@pom.go.id", "role": "Pegawai - Staff"},
    {"no": 12, "nama": "Daniel Prasetiawan, S.H.", "nip": "19960619 201903 1 002", "jabatan": "Pengawas Farmasi dan Makanan Ahli Pertama", "penugasan": "Penindakan", "email": "daniel.prasetiawan@pom.go.id", "role": "Pegawai - Staff"},
    {"no": 13, "nama": "Yonanda Christiadi, S.H.", "nip": "19951024 201903 1 001", "jabatan": "Pengawas Farmasi dan Makanan Ahli Pertama", "penugasan": "Penindakan", "email": "yonanda.christiadi@pom.go.id", "role": "Pegawai - Staff"},
    {"no": 14, "nama": "Ida Farida, S.Si", "nip": "19950715 201903 2 007", "jabatan": "Pengawas Farmasi dan Makanan Ahli Pertama", "penugasan": "Pengujian", "email": "ida.f@pom.go.id", "role": "Pegawai - Staff"},
    {"no": 15, "nama": "Rini Indah Setyaningsih, SKM", "nip": "19960123 201903 2 007", "jabatan": "Pengawas Farmasi dan Makanan Ahli Pertama", "penugasan": "Informasi dan Komunikasi", "email": "rini.setyaningsih@pom.go.id", "role": "Pegawai - Staff"},
    {"no": 16, "nama": "Prisca Akvila, S.E", "nip": "19930514 201903 2 004", "jabatan": "Analis Pengelolaan Keuangan APBN Ahli Pertama", "penugasan": "Tata Usaha", "email": "prisca.akvila@pom.go.id", "role": "Pegawai - Staff"},
    {"no": 17, "nama": "Qithfirul Bahrowi, A.Md.", "nip": "19970226 201903 1 001", "jabatan": "Pranata Komputer Terampil", "penugasan": "Tata Usaha", "email": "qithfirul.bahrowi@pom.go.id", "role": "Administrator"},
    {"no": 18, "nama": "Diah Wahyuni, A.Md. Akun", "nip": "19960602 202203 2 004", "jabatan": "Pranata Keuangan APBN Terampil", "penugasan": "Tata Usaha", "email": "diah.wahyuni@pom.go.id", "role": "Pegawai - Staff"},
    {"no": 19, "nama": "Rianita Pambukowati, S.Si", "nip": "199805172024212012", "jabatan": "Pengawas Farmasi dan Makanan Ahli Pertama", "penugasan": "Informasi dan Komunikasi", "email": "Rianita.pambukowati@pom.go.id", "role": "Pegawai - Staff"},
    {"no": 20, "nama": "Anggie Afrida, S.Ak", "nip": "199704182025212035", "jabatan": "Penata Layanan Operasional", "penugasan": "Tata Usaha", "email": "anggie.afrida@pom.go.id", "role": "Pegawai - Staff"},
    {"no": 21, "nama": "Baiq Nisrina Nurubay, S.T.P.", "nip": "199810202025062010", "jabatan": "Pengawas Farmasi dan Makanan Ahli Pertama", "penugasan": "", "email": "baiq.nurubay@pom.go.id", "role": "Pegawai - Staff"},
    {"no": 22, "nama": "Yulia Kartika Nur Anggraini, A.Md. A.B.", "nip": "200107192025062005", "jabatan": "Penata Laksana Barang Terampil", "penugasan": "", "email": "yulia.anggraini@pom.go.id", "role": "Admin Gudang"},
    {"no": 23, "nama": "Rizky Andina Anggraeni, S.M.", "nip": "199911132025062007", "jabatan": "Perencana Ahli Pertama", "penugasan": "", "email": "rizky.anggraeni@pom.go.id", "role": "Pegawai - Staff"},
    {"no": 24, "nama": "Nindya Widyanti, S.Si.", "nip": "200006052025062012", "jabatan": "Pengawas Farmasi dan Makanan Ahli Pertama", "penugasan": "", "email": "nindya.widyanti@pom.go.id", "role": "Pegawai - Staff"},
    {"no": 25, "nama": "Tasya Zulanda Tamara, A.Md. A.Pkt", "nip": "200010172025062010", "jabatan": "Arsiparis Terampil", "penugasan": "", "email": "tasya.tamara@pom.go.id", "role": "Pegawai - Staff"},
    {"no": 26, "nama": "Made Hanami Asri Giri, S. Gz", "nip": "199709112025062011", "jabatan": "Pengawas Farmasi dan Makanan Ahli Pertama", "penugasan": "", "email": "hanami.asri@pom.go.id", "role": "Pegawai - Staff"},
    {"no": 27, "nama": "Fii Ahsan Qauly, A.Md.Kom", "nip": "200002162025061003", "jabatan": "Pranata SDM Aparatur Terampil", "penugasan": "", "email": "fii.qauly@pom.go.id", "role": "Pegawai - Staff"},
    {"no": 28, "nama": "Hesyandi, S.T.P.", "nip": "199510282025061004", "jabatan": "Pengawas Farmasi dan Makanan Ahli Pertama", "penugasan": "", "email": "hesyandi@pom.go.id", "role": "Pegawai - Staff"},
    {"no": 29, "nama": "Addevia Illahi, S.Farm.", "nip": "200101172025062006", "jabatan": "Penata Kelola Obat dan Makanan", "penugasan": "", "email": "addevia.illahi@pom.go.id", "role": "Pegawai - Staff"},
]

def create_users():
    created_accounts = []  # untuk export
    created = 0
    skipped = 0

    for data in data_users:
        username = data["email"].split("@")[0].lower()
        if users_collection.find_one({"username": username}):
            print(f"⚠️ Username '{username}' sudah ada, dilewati.")
            skipped += 1
            continue

        raw_password = generate_password()
        hashed = bcrypt.hashpw(raw_password.encode(), bcrypt.gensalt()).decode()

        role_key = data["role"]
        role_db = ROLE_MAP.get(role_key, "pegawai")

        user_doc = {
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "username": username,
            "password": hashed,
            "name": data["nama"],
            "nip": data["nip"],
            "role": role_db,
            "unit_kerja": data["penugasan"] or "",
            "jabatan": "staff",  # default untuk approval
            "jabatan_label": data["jabatan"],
            "email": data["email"],
            "picture": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        users_collection.insert_one(user_doc)
        print(f"✅ {data['nama']} ({username}) berhasil dibuat.")
        created_accounts.append({
            "no": data["no"],
            "nama": data["nama"],
            "username": username,
            "password": raw_password,
            "role": role_db
        })
        created += 1

    print(f"\nSelesai: {created} user dibuat, {skipped} dilewati (duplikat).")
    return created_accounts

def export_to_csv(accounts, filename="daftar_akun.csv"):
    if not accounts:
        print("Tidak ada akun untuk diexport.")
        return
    with open(filename, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(["No", "Nama", "Username", "Password", "Role"])
        for acc in accounts:
            writer.writerow([acc["no"], acc["nama"], acc["username"], acc["password"], acc["role"]])
    print(f"✅ Daftar akun berhasil disimpan ke {filename}")

if __name__ == "__main__":
    accounts = create_users()
    export_to_csv(accounts)
