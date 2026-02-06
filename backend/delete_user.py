from app.database import SessionLocal, engine
from app.models.user import User
from app.models.profile import Profile
import sqlite3

def delete_user(email: str):
    if "sqlite" in str(engine.url):
        conn = sqlite3.connect("chompsmart.db")
        cursor = conn.cursor()
        
        try:
            cursor.execute("PRAGMA foreign_keys = OFF")
            
            cursor.execute("DELETE FROM profiles WHERE user_email = ?", (email,))
            profiles_deleted = cursor.rowcount
            
            cursor.execute("DELETE FROM users WHERE email = ?", (email,))
            user_deleted = cursor.rowcount
            
            cursor.execute("PRAGMA foreign_keys = ON")
            
            conn.commit()
            
            if profiles_deleted > 0:
                print(f"Deleted {profiles_deleted} profile record(s) for {email}")
            if user_deleted > 0:
                print(f"Deleted user: {email}")
            if profiles_deleted == 0 and user_deleted == 0:
                print(f"No records found for {email}")
            else:
                print(f"Successfully deleted all records for {email}")
        except Exception as e:
            conn.rollback()
            print(f"Error deleting user: {e}")
        finally:
            conn.close()
    else:
        print("Database is not SQLite")

def delete_profile(email: str):
    """Delete only the profile for a user"""
    if "sqlite" in str(engine.url):
        conn = sqlite3.connect("chompsmart.db")
        cursor = conn.cursor()
        
        try:
            cursor.execute("PRAGMA foreign_keys = OFF")
            
            cursor.execute("DELETE FROM profiles WHERE user_email = ?", (email,))
            profiles_deleted = cursor.rowcount
            
            cursor.execute("PRAGMA foreign_keys = ON")
            
            conn.commit()
            print(f"Successfully deleted {profiles_deleted} profile record(s) for {email}")
        except Exception as e:
            conn.rollback()
            print(f"Error deleting profile: {e}")
        finally:
            conn.close()
    else:
        print("Database is not SQLite")

if __name__ == "__main__":
    print("Delete User/Profile Tool")
    print("1. Delete user and profile")
    print("2. Delete profile only")
    
    choice = input("Enter choice (1 or 2): ").strip()
    email_to_delete = input("Enter email: ").strip()
    
    if not email_to_delete:
        print("No email provided")
    elif choice == "1":
        print(f"Deleting user and profile for: {email_to_delete}")
        delete_user(email_to_delete)
    elif choice == "2":
        print(f"Deleting profile for: {email_to_delete}")
        delete_profile(email_to_delete)
    else:
        print("Invalid choice")
