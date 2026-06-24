from pymongo import MongoClient

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
        # Cari barang berdasarkan id
        item = db.items.find_one({"id": item_id})
        if not item:
            # Jika tidak ditemukan, coba cari berdasarkan kode
            item = db.items.find_one({"kode": item_id})
        if not item:
            # Jika masih tidak ditemukan, coba cari berdasarkan nama (case insensitive)
            item = db.items.find_one({"nama": {"$regex": f"^{item_id}$", "$options": "i"}})
        if item and item.get("id") != item_id:
            # Update item_id di lines
            db.spb.update_one(
                {"_id": spb["_id"]},
                {"$set": {f"lines.{idx}.item_id": item["id"]}}
            )
            print(f"✅ SPB {spb['nomor']}: line {idx} {item_id} → {item['id']}")
            updated = True
    if updated:
        updated_count += 1

print(f"\n✅ Selesai! Total SPB yang diperbaiki: {updated_count}")
client.close()
