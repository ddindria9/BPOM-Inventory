from pymongo import MongoClient

MONGO_URL = "paste-url-disini"

try:
    client = MongoClient(MONGO_URL)
    db = client.get_database()  # coba akses
    print(" Koneksi berhasil!")
    print("Daftar database:", client.list_database_names())
except Exception as e:
    print(" Gagal konek:", e)
