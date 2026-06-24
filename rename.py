from pymongo import MongoClient
import re

MONGO_URL = "mongodb+srv://diniindriani459_db_user:YgMKrksbgYPkipaV@cluster0.fu8dak7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0&tlsAllowInvalidCertificates=true"
DB_NAME = "diniindriani459_db_user"

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

db.users.updateMany({ role: "peminta" }, { $set: { role: "pegawai" } })
