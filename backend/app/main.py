from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.models import User, Document, AccessGrant, AuditLog
from app.api.routes import auth, documents

# Create database tables automatically on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TrustVault API",
    description="Secure Document Management & Audit System for Snovasys Hiring Challenge",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update with your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router)
app.include_router(documents.router)

@app.get("/")
def read_root():
    return {"message": "TrustVault API is running securely", "status": "active"}