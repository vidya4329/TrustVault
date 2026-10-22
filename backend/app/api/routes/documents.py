import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.security import get_current_user
from app.models import User, Document
from app.config import settings
from app.services.document_service import verify_document_access
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/api/documents", tags=["documents"])

def check_is_privileged(role):
    if not role:
        return False
    role_str = str(role).split('.')[-1].lower()
    return role_str in ["owner", "admin"]

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    request: Request,
    title: str = Form(...),
    category: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not check_is_privileged(getattr(current_user, 'role', None)):
        log_audit_event(db, "UPLOAD", "DENIED", request, getattr(current_user, 'id', 1), "Role not permitted to upload")
        raise HTTPException(status_code=403, detail="Only Owners and Admins can upload documents.")
    
    os.makedirs(settings.STORAGE_DIR, exist_ok=True)
    file_extension = os.path.splitext(file.filename)[1]
    saved_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(settings.STORAGE_DIR, saved_filename)
    
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)
        
    doc = Document(
        title=title,
        category=category,
        file_path=file_path,
        owner_id=current_user.id
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    
    log_audit_event(db, "UPLOAD", "SUCCESS", request, current_user.id, f"Document {doc.id} uploaded")
    return {"message": "Document uploaded successfully", "document_id": doc.id}

@router.get("/")
def list_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    role_str = str(getattr(current_user, 'role', '')).split('.')[-1].lower()
    if role_str == "admin":
        docs = db.query(Document).all()
    elif role_str == "owner":
        docs = db.query(Document).filter(Document.owner_id == current_user.id).all()
    else:
        grants = getattr(current_user, 'grants', [])
        docs = [g.document for g in grants if hasattr(g, 'document') and g.document]
    return docs

@router.get("/{document_id}/download")
def download_document(
    document_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = verify_document_access(document_id, current_user, db, request)
    if not doc or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on server storage")
    return FileResponse(doc.file_path, filename=os.path.basename(doc.file_path))