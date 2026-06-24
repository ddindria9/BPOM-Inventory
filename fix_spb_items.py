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
        if not item_id or not item_id.startswith("item_"):
            # Ekstrak nama dari format "· NAMA () - Stok: X"
            match = re.search(r"· (.+?) \(\)", item_id)
            if match:
                nama = match.group(1).strip()
                item = db.items.find_one({"nama": {"$regex": f"^{re.escape(nama)}$", "$options": "i"}})
                if item:
                    correct_id = item["id"]
                    db.spb.update_one(
                        {"_id": spb["_id"]},
                        {"$set": {f"lines.{idx}.item_id": correct_id}}
                    )
                    print(f"✅ SPB {spb['nomor']}: {item_id} → {correct_id}")
                    updated = True
                else:
                    print(f"⚠️ SPB {spb['nomor']}: barang '{nama}' tidak ditemukan")
            else:
                # Fallback: cari berdasarkan nama parsial
                item = db.items.find_one({"nama": {"$regex": item_id, "$options": "i"}})
                if item:
                    correct_id = item["id"]
                    db.spb.update_one(
                        {"_id": spb["_id"]},
                        {"$set": {f"lines.{idx}.item_id": correct_id}}
                    )
                    print(f"✅ SPB {spb['nomor']}: {item_id} → {correct_id}")
                    updated = True
    if updated:
        updated_count += 1

print(f"\n✅ Selesai! Total SPB diperbaiki: {updated_count}")
client.close()
