# TrustVault - AI Prompt Engineering Log (`PROMPTS.md`)

This document records key prompts and architectural guidance utilized during the development of TrustVault.

## 1. Backend Architecture & Dependency Resolution
- **Prompt:** "How to resolve pydantic-core and sqlalchemy compilation blocks on Python 3.13 for FastAPI on Windows using binary wheels?"
- **Outcome:** Utilized `pip install --only-binary=:all:` with modern compatible versions (`fastapi==0.111.0`, `sqlalchemy==2.0.35`, `pydantic==2.8.2`, `psycopg[binary]==3.2.3`).

## 2. Database Layer & Fallback
- **Prompt:** "How to configure SQLAlchemy session management and provide a local fallback mechanism when PostgreSQL service isn't active during local development?"
- **Outcome:** Implemented SQLite engine fallback (`sqlite:///./trustvault.db`) with `check_same_thread: False` for rapid local testing alongside PostgreSQL production configuration.