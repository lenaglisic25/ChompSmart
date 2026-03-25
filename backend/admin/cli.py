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
        existing_provider = db.query(Provider).filter(Provider.email == email).first()
        if existing_provider:
            print(f"Error: A provider with the email '{email}' already exists.")
            return

        hashed_password = pwd_context.hash(password)
        new_provider = Provider(email=email, password=hashed_password)
        db.add(new_provider)
        db.commit()
        
        print(f"Success: Provider '{email}' has been securely added to the database.")
    except Exception as e:
        print(f"An error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Admin CLI for secure backend management.")
    parser.add_argument("--email", required=True, help="The provider's email address.")
    parser.add_argument("--password", required=True, help="The provider's secure password.")
    
    args = parser.parse_args()
    add_provider(args.email, args.password)