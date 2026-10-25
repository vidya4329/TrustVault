from sqlalchemy.orm import Session
from app.models import AuditLog

def log_audit_event(db: Session, action: str, status: str, request=None, user_id=int | None, details: str = None):
    ip_address = request.client.host if request and request.client else None
    audit_entry = AuditLog(
        user_id=user_id,
        action=action,
        status=status,
        ip_address=ip_address,
        details=details
    )
    db.add(audit_entry)
    db.commit()