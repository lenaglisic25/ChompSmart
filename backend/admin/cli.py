"""
©Copyright 2026 University of Florida Research Foundation, Inc.
All Rights Reserved.

ChompSmart Admin CLI
====================
Used by system administrators to manage providers and patients.
Providers cannot be created through the public API.
 
Commands:
  python cli.py add-provider --email dr.smith@clinic.com --name "Dr. Smith"
  python cli.py list-providers
  python cli.py list-patients
  python cli.py remove-provider dr.smith@clinic.com
  python cli.py remove-patient patient@example.com
  python cli.py reset-provider-password dr.smith@clinic.com
"""

import sys
from pathlib import Path
import argparse
import secrets
import string
import getpass
from datetime import datetime

backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

from passlib.context import CryptContext
from app.database import SessionLocal
from app.models.provider import Provider
from app.models.user import UserModel

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def _generate_temp_password(length: int = 16) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return "".join(secrets.choice(alphabet) for _ in range(length))
 
 
def _confirm(prompt: str) -> bool:
    answer = input(f"{prompt} [yes/no]: ").strip().lower()
    return answer == "yes"
 
 
def _audit_log(action: str, target: str, performed_by: str = "admin-cli"):
    if Path("/var/log/chompsmart").exists():
        log_path = Path("/var/log/chompsmart/admin_audit.log")
    else:
        log_path = Path(__file__).parent / "admin_audit.log"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    entry = f"{timestamp} | {performed_by} | {action} | {target}\n"
    with open(log_path, "a") as f:
        f.write(entry)
    print(f"  [audit] Logged: {action} → {target}")

# Provider commands
def add_provider(email: str, name: str):
    """
    Add a new provider with a system-generated temporary password.
    The provider must change their password on first login.
    """
    email = email.lower().strip()
    db = SessionLocal()
    try:
        if db.query(Provider).filter(Provider.email == email).first():
            print(f"ERROR: Provider {email} already exists.")
            return
 
        temp_password = _generate_temp_password()
 
        new_provider = Provider(
            email=email,
            password=pwd_context.hash(temp_password),
            name=name,
            is_first_login=True,
        )
        db.add(new_provider)
        db.commit()
 
        _audit_log("ADD_PROVIDER", email)
 
        print(f"\n  Provider created: {name} <{email}>")
        print(f"\n  *** TEMPORARY PASSWORD: ***")
        print(f"  {temp_password}")
 
    except Exception as e:
        db.rollback()
        print(f"ERROR adding provider: {e}")
    finally:
        db.close()
 
 
def reset_provider_password(email: str):
    email = email.lower().strip()
    db = SessionLocal()
    try:
        provider = db.query(Provider).filter(Provider.email == email).first()
        if not provider:
            print(f"ERROR: Provider not found: {email}")
            return
 
        if not _confirm(f"Reset password for provider {email}?"):
            print("Cancelled.")
            return
 
        temp_password = _generate_temp_password()
        provider.password = pwd_context.hash(temp_password)
        provider.is_first_login = True
        db.commit()
 
        _audit_log("RESET_PROVIDER_PASSWORD", email)
 
        print(f"\n  Password reset for: {email}")
        print(f"\n  *** NEW TEMPORARY PASSWORD: ***")
        print(f"  {temp_password}")
        print(f"\n  Provider must change this on next login.\n")
 
    except Exception as e:
        db.rollback()
        print(f"ERROR resetting password: {e}")
    finally:
        db.close()
 
 
def remove_provider(email: str):
    email = email.lower().strip()
    db = SessionLocal()
    try:
        provider = db.query(Provider).filter(Provider.email == email).first()
        if not provider:
            print(f"ERROR: Provider not found: {email}")
            return
 
        patient_count = db.query(UserModel).filter(UserModel.provider_email == email).count()
        if patient_count > 0:
            print(f"  WARNING: {patient_count} patient(s) are assigned to this provider.")
            print(f"  They will have no provider after deletion.")
 
        if not _confirm(f"Permanently delete provider {email}?"):
            print("Cancelled.")
            return
 
        db.delete(provider)
        db.commit()
 
        _audit_log("REMOVE_PROVIDER", email)
        print(f"  Deleted provider: {email}")
 
    except Exception as e:
        db.rollback()
        print(f"ERROR deleting provider: {e}")
    finally:
        db.close()
 
 
def list_providers():
    db = SessionLocal()
    try:
        providers = db.query(Provider).order_by(Provider.email).all()
        if not providers:
            print("  No providers found.")
            return
 
        print(f"\n  {'EMAIL':<35} {'NAME':<25} {'FIRST LOGIN?'}")
        print(f"  {'-'*35} {'-'*25} {'-'*12}")
        for p in providers:
            first = "Yes (temp pw)" if getattr(p, "is_first_login", False) else "No"
            print(f"  {p.email:<35} {getattr(p, 'name', ''):<25} {first}")
        print(f"\n  Total: {len(providers)}\n")
    finally:
        db.close()
 
 
# Patient commands
def remove_patient(email: str):
    """
    Remove a patient account and all associated data.
    For HIPAA compliance, ensure you have a documented reason for deletion before running this command.
    """
    email = email.lower().strip()
    db = SessionLocal()
    try:
        patient = db.query(UserModel).filter(UserModel.email == email).first()
        if not patient:
            print(f"ERROR: Patient not found: {email}")
            return
 
        print(f"  Patient: {getattr(patient, 'name', '(no name)')} <{email}>")
 
        if not _confirm(f"Permanently delete patient {email}?"):
            print("Cancelled.")
            return
 
        db.delete(patient)
        db.commit()
 
        _audit_log("REMOVE_PATIENT", email)
        print(f"  Deleted patient: {email}")
 
    except Exception as e:
        db.rollback()
        print(f"ERROR deleting patient: {e}")
    finally:
        db.close()
 
 
def list_patients():
    db = SessionLocal()
    try:
        patients = db.query(UserModel).order_by(UserModel.email).all()
        if not patients:
            print("  No patients found.")
            return
 
        print(f"\n  {'EMAIL':<35} {'NAME':<25} {'PROVIDER'}")
        print(f"  {'-'*35} {'-'*25} {'-'*30}")
        for p in patients:
            print(f"  {p.email:<35} {getattr(p, 'name', ''):<25} {p.provider_email or '(unassigned)'}")
        print(f"\n  Total: {len(patients)}\n")
    finally:
        db.close()
 
 
def reassign_patient(patient_email: str, new_provider_email: str):
    patient_email = patient_email.lower().strip()
    new_provider_email = new_provider_email.lower().strip()
    db = SessionLocal()
    try:
        patient = db.query(UserModel).filter(UserModel.email == patient_email).first()
        if not patient:
            print(f"ERROR: Patient not found: {patient_email}")
            return
 
        new_provider = db.query(Provider).filter(Provider.email == new_provider_email).first()
        if not new_provider:
            print(f"ERROR: Provider not found: {new_provider_email}")
            return
 
        old_provider = patient.provider_email or "(none)"
        patient.provider_email = new_provider_email
        db.commit()
 
        _audit_log("REASSIGN_PATIENT", f"{patient_email}: {old_provider} → {new_provider_email}")
        print(f"  Reassigned {patient_email} from {old_provider} to {new_provider_email}")
 
    except Exception as e:
        db.rollback()
        print(f"ERROR reassigning patient: {e}")
    finally:
        db.close()
 

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="ChompSmart Admin CLI — run on the server only",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    sub = parser.add_subparsers(dest="command")
 
    # add-provider
    p_add = sub.add_parser("add-provider", help="Create a new provider account")
    p_add.add_argument("--email", required=True)
    p_add.add_argument("--name", required=True, help="Full name e.g. 'Dr. Jane Smith'")
 
    # reset-provider-password
    p_reset = sub.add_parser("reset-provider-password", help="Issue a new temp password")
    p_reset.add_argument("email", help="Provider email")
 
    # remove-provider
    p_rm_prov = sub.add_parser("remove-provider", help="Delete a provider account")
    p_rm_prov.add_argument("email")
 
    # list-providers
    sub.add_parser("list-providers", help="Show all providers")
 
    # remove-patient
    p_rm_pat = sub.add_parser("remove-patient", help="Delete a patient account")
    p_rm_pat.add_argument("email")
 
    # list-patients
    sub.add_parser("list-patients", help="Show all patients")
 
    # reassign-patient
    p_reassign = sub.add_parser("reassign-patient", help="Move patient to a different provider")
    p_reassign.add_argument("patient_email")
    p_reassign.add_argument("new_provider_email")
 
    args = parser.parse_args()
 
    if args.command == "add-provider":
        add_provider(args.email, args.name)
    elif args.command == "reset-provider-password":
        reset_provider_password(args.email)
    elif args.command == "remove-provider":
        remove_provider(args.email)
    elif args.command == "list-providers":
        list_providers()
    elif args.command == "remove-patient":
        remove_patient(args.email)
    elif args.command == "list-patients":
        list_patients()
    elif args.command == "reassign-patient":
        reassign_patient(args.patient_email, args.new_provider_email)
    else:
        parser.print_help()