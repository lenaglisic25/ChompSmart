import sys
import os
import argparse

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from passlib.context import CryptContext
from app.database import SessionLocal
from app.models.provider import Provider

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def add_provider(email, password):
    db = SessionLocal()
    try:
        existing = db.query(Provider).filter(Provider.email == email).first()
        if existing:
            print(f"Error: Provider '{email}' already exists.")
            return
        new_p = Provider(email=email, password=pwd_context.hash(password))
        db.add(new_p)
        db.commit()
        print(f"Success: Added provider '{email}'")
    finally:
        db.close()

def remove_provider(email):
    db = SessionLocal()
    try:
        provider = db.query(Provider).filter(Provider.email == email).first()
        if not provider:
            print(f"Error: Provider '{email}' not found.")
            return
        db.delete(provider)
        db.commit()
        print(f"Success: Provider '{email}' has been removed.")
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["add", "remove"], help="Action to perform")
    parser.add_argument("--email", required=True, help="Provider email")
    parser.add_argument("--password", help="Password (only required for 'add')")
    
    args = parser.parse_args()
    
    if args.action == "add":
        if not args.password:
            print("Error: --password is required to add a provider.")
        else:
            add_provider(args.email, args.password)
    elif args.action == "remove":
        remove_provider(args.email)