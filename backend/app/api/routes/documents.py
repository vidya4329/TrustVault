
import os
import uuid

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
    Request,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.security import get_current_user
from app.models import User, Document
from app.config import settings
from app.services.document_service import verify_document_access
from app.services.audit_service import log_audit_event


router = APIRouter(prefix="/api/documents", tags=["documents"])


def get_role_name(role) -> str:
    """Normalize string or enum roles to lowercase names."""
    if role is None:
        return ""

    # Enum members commonly expose their stored role through .value.
    value = getattr(role, "value", role)
    return str(value).split(".")[-1].strip().lower()


def check_is_privileged(role) -> bool:
    """Only owners and admins may upload documents."""
    return get_role_name(role) in {"owner", "admin"}


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    request: Request,
    title: str = Form(...),
    category: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Keep the role-based security check.
    if not check_is_privileged(getattr(current_user, "role", None)):
        log_audit_event(
            db,
            "UPLOAD",
            "DENIED",
            request,
            current_user.id,
            "Role not permitted to upload",
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Owners and Admins can upload documents.",
        )

    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please select a file to upload.",
        )

    storage_dir = settings.STORAGE_DIR
    os.makedirs(storage_dir, exist_ok=True)

    # Generate a server-side filename; don't trust the uploaded filename
    # as a filesystem path.
    original_filename = os.path.basename(file.filename)
    file_extension = os.path.splitext(original_filename)[1]
    saved_filename = f"{uuid.uuid4().hex}{file_extension}"
    file_path = os.path.join(storage_dir, saved_filename)

    try:
        contents = await file.read()

        if not contents:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The selected file is empty.",
            )

        with open(file_path, "wb") as saved_file:
            saved_file.write(contents)

        document = Document(
            title=title,
            category=category,
            file_path=file_path,
            owner_id=current_user.id,
        )

        db.add(document)
        db.commit()
        db.refresh(document)

    except HTTPException:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise

    except Exception:
        db.rollback()

        if os.path.exists(file_path):
            os.remove(file_path)

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Upload failed while saving the document. Please try again.",
        )

    finally:
        await file.close()

    # Record success after the document has been saved.
    try:
        log_audit_event(
            db,
            "UPLOAD",
            "SUCCESS",
            request,
            current_user.id,
            f"Document {document.id} uploaded",
        )
    except Exception:
        # Don't report a failed upload when the document was already saved.
        db.rollback()

    return {
        "message": "Document uploaded successfully",
        "document_id": document.id,
    }


@router.get("/")
def list_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role_name = get_role_name(getattr(current_user, "role", None))

    if role_name == "admin":
        documents = db.query(Document).all()

    elif role_name == "owner":
        documents = (
            db.query(Document)
            .filter(Document.owner_id == current_user.id)
            .all()
        )

    else:
        grants = getattr(current_user, "grants", []) or []
        documents = [
            grant.document
            for grant in grants
            if getattr(grant, "document", None) is not None
        ]

    return documents


@router.get("/{document_id}/download")
def download_document(
    document_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = verify_document_access(
        document_id,
        current_user,
        db,
        request,
    )

    if not document or not os.path.isfile(document.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on server storage.",
        )

    return FileResponse(
        document.file_path,
        filename=os.path.basename(document.file_path),
    )
