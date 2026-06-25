from pymongo import MongoClient

try:
    client = MongoClient("mongodb+srv://diniindriani459_db_user:YgMKrksbgYPkipaV@cluster0.fu8dak7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0&tlsAllowInvalidCertificates=true")

    db = client["diniindriani459_db_user"]
    print("Website berhasil terhubung ke MongoDB!")
    
    # PERBAIKAN: Bungkus key dengan tanda kutip
    result = db.users.update_many({ "role": "peminta" }, { "$set": { "role": "pegawai" } })
    
    # Opsional: Menampilkan berapa banyak data yang berhasil diubah
    print(f"Berhasil mengubah {result.modified_count} data.")

except Exception as e:
    print("Gagal terhubung atau mengeksekusi perintah:", e)
