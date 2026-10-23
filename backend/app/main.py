
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, documents
from backend.app.database import engine, Base


# Initialize FastAPI application
app = FastAPI(
    title="TrustVault API",
    description="Secure Document Management & Audit System for Snovasys Hiring Challenge",
    version="1.0.0",
)


# CORS configuration
# Replace the Vercel placeholder with your actual frontend domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://YOUR-ACTUAL-VERCEL-DOMAIN.vercel.app",
        "http://localhost:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register API routers
# The documents router already has /api/documents in documents.py.
app.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"],
)

app.include_router(
    documents.router,
    prefix="/api/documents",
    tags=["Documents"],
)


# Create database tables
@app.on_event("startup")
def create_database_tables():
    Base.metadata.create_all(bind=engine)


# Health check endpoint
@app.get("/")
def read_root():
    return {
        "message": "TrustVault API is running securely",
        "status": "active",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "TrustVault API",
    }
