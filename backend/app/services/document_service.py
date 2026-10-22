from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models import Document, AccessGrant, User, RoleEnum
from app.services.audit_service import log_audit_event

def verify_document_access(document_id: int, user: User, db: Session, request=None) -> Document:
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        log_audit_event(
            db=db,
            action="DOCUMENT_ACCESS",
            status="DENIED",
            request=request,
            user_id=user.id,
            details=f"Document ID {document_id} not found"
        )
        raise HTTPException(status_code=404, detail="Document not found")

    # Admins and Owners have automatic access
    if user.role == RoleEnum.ADMIN or doc.owner_id == user.id:
        log_audit_event(
            db=db,
            action="DOCUMENT_ACCESS",
            status="SUCCESS",
            request=request,
            user_id=user.id,
            details=f"Access granted via Ownership/Admin role to doc {document_id}"
        )
        return doc

    # Check explicit access grants for viewers
    grant = db.query(AccessGrant).filter(
        AccessGrant.document_id == document_id,
        AccessGrant.user_id == user.id
    ).first()

    if not grant:
        log_audit_event(
            db=db,
            action="DOCUMENT_ACCESS",
            status="DENIED",
            request=request,
            user_id=user.id,
            details=f"Unauthorized access attempt to doc {document_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this document"
        )

    log_audit_event(
        db=db,
        action="DOCUMENT_ACCESS",
        status="SUCCESS",
        request=request,
        user_id=user.id,
        details=f"Access granted via explicit grant to doc {document_id}"
    )
    return doc