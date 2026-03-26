import sys
from pathlib import Path
import argparse

backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

from passlib.context import CryptContext
from app.database import SessionLocal
from app.models.provider import Provider
from app.models.user import UserModel

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def add_provider(email: str, password: str, name: str):
    db = SessionLocal()
    try:
        existing = db.query(Provider).filter(Provider.email == email).first()
        if existing:
            print(f"Provider {email} already exists.")
            return
            
        hashed_password = pwd_context.hash(password)
        
        new_provider = Provider(
            email=email, 
            password=hashed_password,
            name=name,
            is_first_login=True
        )
        
        db.add(new_provider)
        db.commit()
        print(f"Added provider: {email} ({name})")
        
    except Exception as e:
        db.rollback()
        print(f"Error adding provider: {e}")
    finally:
        db.close()

def remove_provider(email: str):
    db = SessionLocal()
    try:
        provider = db.query(Provider).filter(Provider.email == email).first()
        if not provider:
            print(f"Provider not found: {email}")
            return
            
        db.delete(provider)
        db.commit()
        print(f"Deleted provider: {email}")
    except Exception as e:
        db.rollback()
        print(f"Error deleting provider: {e}")
    finally:
        db.close()

def remove_patient(email: str):
    db = SessionLocal()
    try:
        patient = db.query(UserModel).filter(UserModel.email == email).first()
        if not patient:
            print(f"Patient not found: {email}")
            return
            
        db.delete(patient)
        db.commit()
        print(f"Deleted patient: {email}")
    except Exception as e:
        db.rollback()
        print(f"Error deleting patient: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Admin CLI Tools")
    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # Add Provider
    add_parser = subparsers.add_parser("add", help="Add a new provider")
    add_parser.add_argument("--email", required=True, help="Provider email")
    add_parser.add_argument("--password", required=True, help="Provider password")
    add_parser.add_argument("--name", required=True, help="Full name of the provider")

    # Remove Provider
    rm_prov_parser = subparsers.add_parser("remove-provider", help="Remove a provider")
    rm_prov_parser.add_argument("email", help="Provider email to remove")

    # Remove Patient
    rm_user_parser = subparsers.add_parser("remove-user", help="Remove a patient")
    rm_user_parser.add_argument("email", help="Patient email to remove")

    args = parser.parse_args()

    if args.command == "add":
        add_provider(args.email, args.password, args.name)
    elif args.command == "remove-provider":
        remove_provider(args.email)
    elif args.command == "remove-user":
        remove_patient(args.email)
    else:
        parser.print_help()