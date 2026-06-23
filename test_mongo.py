from pymongo import MongoClient

MONGO_URL = "mongodb+srv://diniindriani459_db_user:YgMKrksbgYPkipaV@cluster0.fu8dak7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0&tlsAllowInvalidCertificates=true"
DB_NAME = "dinindriani459_db_user" 

try:
    client = MongoClient(MONGO_URL)
    db = client.get_database()  # coba akses
    print(" Koneksi berhasil!")
    print("Daftar database:", client.list_database_names())
except Exception as e:
    print(" Gagal konek:", e)
