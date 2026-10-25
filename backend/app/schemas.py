from pydantic import BaseModel, EmailStr
from datetime import datetime
from app.models import RoleEnum, AccessLevelEnum

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: RoleEnum = RoleEnum.VIEWER

class UserResponse(BaseModel):
    id: int
    email: str
    role: RoleEnum
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: str | None = None

class DocumentResponse(BaseModel):
    id: int
    title: str
    category: str
    owner_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class GrantCreate(BaseModel):
    document_id: int
    user_id: int
    permission: AccessLevelEnum = AccessLevelEnum.READ