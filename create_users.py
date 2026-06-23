import bcrypt
from pymongo import MongoClient
import os
import uuid
from datetime import datetime

# ============ KONFIGURASI ============
MONGO_URL = "mongodb+srv://dinindriani459_db_user:YgMKrksbgYPkipaV@cluster0.fu8dak7.mongodb.net/?retryWrites=true&w=majority"
DB_NAME = "dinindriani459_db_user"  

# ============ DAFTAR USER ============
users_data = [
    # Format: (username, password, name, role, unit_kerja)
    ("user1", "password123", "User Satu", "peminta", "Unit A"),
    ("user2", "password123", "User Dua", "peminta", "Unit A"),
    ("user3", "password123", "User Tiga", "peminta", "Unit B"),
    ("user4", "password123", "User Empat", "peminta", "Unit B"),
    ("user5", "password123", "User Lima", "peminta", "Unit C"),
    ("user6", "password123", "User Enam", "admin_gudang", "Unit A"),
    ("user7", "password123", "User Tujuh", "approver", "Unit A"),
    ("user8", "password123", "User Delapan", "peminta", "Unit D"),
    ("user9", "password123", "User Sembilan", "peminta", "Unit D"),
    ("user10", "password123", "User Sepuluh", "peminta", "Unit E"),
    ("user11", "password123", "User Sebelas", "peminta", "Unit E"),
    ("user12", "password123", "User Dua Belas", "pengelola_aset", "Unit F"),
    ("user13", "password123", "User Tiga Belas", "peminta", "Unit F"),
    ("user14", "password123", "User Empat Belas", "peminta", "Unit G"),
    ("user15", "password123", "User Lima Belas", "peminta", "Unit G"),
    ("user16", "password123", "User Enam Belas", "peminta", "Unit H"),
    ("user17", "password123", "User Tujuh Belas", "peminta", "Unit H"),
    ("user18", "password123", "User Delapan Belas", "approver", "Unit I"),
    ("user19", "password123", "User Sembilan Belas", "peminta", "Unit I"),
    ("user20", "password123", "User Dua Puluh", "peminta", "Unit J"),
    ("user21", "password123", "User Dua Puluh Satu", "peminta", "Unit J"),
    ("user22", "password123", "User Dua Puluh Dua", "peminta", "Unit K"),
    ("user23", "password123", "User Dua Puluh Tiga", "admin_gudang", "Unit K"),
    ("user24", "password123", "User Dua Puluh Empat", "peminta", "Unit L"),
    ("user25", "password123", "User Dua Puluh Lima", "peminta", "Unit L"),
    ("user26", "password123", "User Dua Puluh Enam", "peminta", "Unit M"),
    ("user27", "password123", "User Dua Puluh Tujuh", "approver", "Unit M"),
    ("user28", "password123", "User Dua Puluh Delapan", "peminta", "Unit N"),
    ("user29", "password123", "User Dua Puluh Sembilan", "peminta", "Unit N"),
]

# ============ SCRIPT ============
def create_users():
    # Koneksi ke MongoDB
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    collection = db["users"]
    
    created = 0
    skipped = 0
    now = datetime.now().isoformat()
    
    print("=" * 50)
    print(" Memulai batch create users...")
    print("=" * 50)
    
    for username, password, name, role, unit_kerja in users_data:
        # Cek apakah username sudah ada
        existing = collection.find_one({"username": username})
        if existing:
            print(f" Username '{username}' sudah ada, dilewati.")
            skipped += 1
            continue
        
        # Hash password
        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        
        # Buat dokumen user
        user_doc = {
            "user_id": f"user_{uuid.uuid4().hex[:8]}",
            "username": username,
            "password": hashed,
            "name": name,
            "role": role,
            "unit_kerja": unit_kerja,
            "email": "",
            "picture": "",
            "created_at": now
        }
        
        collection.insert_one(user_doc)
        print(f" User '{username}' (role: {role}) berhasil dibuat.")
        created += 1
    
    print("=" * 50)
    print(f" BERHASIL: {created} user dibuat")
    print(f" DILEWATI: {skipped} user (sudah ada)")
    print("=" * 50)
    client.close()

if __name__ == "__main__":
    create_users()
