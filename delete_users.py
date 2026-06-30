import os
from pymongo import MongoClient

# ========== KONFIGURASI ==========
# Ganti dengan URL MongoDB dan nama database kamu
MONGO_URL = "mongodb+srv://diniindriani459_db_user:YgMKrksbgYPkipaV@cluster0.fu8dak7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0&tlsAllowInvalidCertificates=true"
DB_NAME = "dinindriani459_db_user"

# ========== DAFTAR USERNAME YANG AKAN DIHAPUS ==========
usernames_to_delete = [
    "benyy.prabowo",
    "puji.lestari",
    "yusita.harminingsih",
    "diana.pristawiti",
    "wildansyah.azami",
    "ika.helwandi",
    "mia.riswani",
    "tiara.hapsari",
    "yodi.setiadi",
    "ayu.safitri",
    "shintya.pratiwi",
    "daniel.prasetiawan",
    "yonanda.christiadi",
    "ida.f",
    "rini.setyaningsih",
    "prisca.akvila",
    "qithfirul.bahrowi",
    "diah.wahyuni",
    "rianita.pambukowati",
    "anggie.afrida",
    "baiq.nurubay",
    "yulia.anggraini",
    "rizky.anggraeni",
    "nindya.widyanti",
    "tasya.tamara",
    "hanami.asri",
    "fii.qauly",
    "hesyandi",
    "addevia.illahi"
]

# ========== PROSES ==========
def delete_users():
    # Koneksi ke MongoDB
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    users_collection = db["users"]

    # Cek jumlah user yang akan dihapus
    count_before = users_collection.count_documents({"username": {"$in": usernames_to_delete}})
    print(f"🔍 Ditemukan {count_before} user yang akan dihapus.")

    if count_before == 0:
        print("⚠️ Tidak ada user dengan username tersebut. Periksa daftar username.")
        client.close()
        return

    # Konfirmasi
    confirm = input(f"❓ Yakin ingin menghapus {count_before} user? (ketik 'yes' untuk lanjut): ")
    if confirm.lower() != "yes":
        print("❌ Dibatalkan.")
        client.close()
        return

    # Eksekusi delete
    result = users_collection.delete_many({"username": {"$in": usernames_to_delete}})
    print(f"✅ {result.deleted_count} user berhasil dihapus.")

    # Tampilkan sisa user
    remaining = users_collection.find({}, {"username": 1, "_id": 0}).to_list()
    print("📋 User yang tersisa:")
    for u in remaining:
        print(f"   - {u['username']}")

    client.close()

if __name__ == "__main__":
    delete_users()
