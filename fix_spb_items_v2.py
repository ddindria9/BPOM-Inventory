from pymongo import MongoClient
import re

MONGO_URL = "mongodb+srv://diniindriani459_db_user:YgMKrksbgYPkipaV@cluster0.fu8dak7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0&tlsAllowInvalidCertificates=true"
DB_NAME = "diniindriani459_db_user"

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

spbs = db.spb.find({})
updated_count = 0

for spb in spbs:
    updated = False
    for idx, line in enumerate(spb.get("lines", [])):
        item_id = line.get("item_id")
        # Cek apakah item_id bukan ID yang valid (panjang 16 karakter, dimulai "item_")
        if not item_id or not item_id.startswith("item_"):
            # Coba cari barang berdasarkan nama (extract dari teks)
            # Format teks biasanya: "KODE · NAMA (SATUAN) - Stok: X"
            # atau "NAMA 0 - Stok: X" (jika kode tidak ada)
            # Kita ambil nama: split dengan " - Stok: " lalu ambil bagian pertama
            if " - Stok: " in item_id:
                name_part = item_id.split(" - Stok: ")[0]
                # Coba ambil nama setelah "· " jika ada
                if "· " in name_part:
                    name = name_part.split("· ")[1].strip()
                else:
                    name = name_part.strip()
                # Cari item dengan nama yang sama (case insensitive)
                item = db.items.find_one({"nama": {"$regex": f"^{re.escape(name)}$", "$options": "i"}})
                if item:
                    correct_id = item["id"]
                    db.spb.update_one(
                        {"_id": spb["_id"]},
                        {"$set": {f"lines.{idx}.item_id": correct_id}}
                    )
                    print(f"✅ SPB {spb['nomor']}: line {idx} {item_id} → {correct_id}")
                    updated = True
                else:
                    print(f"⚠️ SPB {spb['nomor']}: tidak ditemukan barang dengan nama '{name}'")
            else:
                # Jika format tidak sesuai, coba cari barang dengan id atau kode yang sama
                item = db.items.find_one({"id": item_id}) or db.items.find_one({"kode": item_id})
                if item:
                    correct_id = item["id"]
                    db.spb.update_one(
                        {"_id": spb["_id"]},
                        {"$set": {f"lines.{idx}.item_id": correct_id}}
                    )
                    print(f"✅ SPB {spb['nomor']}: line {idx} {item_id} → {correct_id}")
                    updated = True
    if updated:
        updated_count += 1

print(f"\n✅ Selesai! Total SPB yang diperbaiki: {updated_count}")
client.close()
