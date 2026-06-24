from pymongo import MongoClient

MONGO_URL = "mongodb+srv://diniindriani459_db_user:YgMKrksbgYPkipaV@cluster0.fu8dak7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0&tlsAllowInvalidCertificates=true"
DB_NAME = "diniindriani459_db_user"

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

# Tambahkan NIP default untuk SPB yang belum punya
db.spb.update_many(
    {"nip_peminta": {"$exists": False}},
    {"$set": {"nip_peminta": "197001012010011001"}}
)

print("✅ NIP ditambahkan ke semua SPB")
client.close()
