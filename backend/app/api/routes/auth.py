from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import User
from app.security import get_password_hash, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

class UserRegister(BaseModel):
    username: str
    password: str

@router.post("/register")
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    try:
        # Check if user exists
        existing_user = db.query(User).filter(User.username == user_data.username).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Username already exists"
            )
        
        # Safely truncate password to 72 bytes to prevent bcrypt errors
        safe_password = user_data.password.encode('utf-8')[:72].decode('utf-8', errors='ignore')
        
        # Hash password and create user
        hashed_pwd = get_password_hash(safe_password)
        new_user = User(username=user_data.username, hashed_password=hashed_pwd)
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        return {"message": "User registered successfully"}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Database error: {str(e)}"
        )

@router.post("/token")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    safe_password = form_data.password.encode('utf-8')[:72].decode('utf-8', errors='ignore')
    user = db.query(User).filter(User.username == form_data.username).first()
    
    if not user or not verify_password(safe_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}