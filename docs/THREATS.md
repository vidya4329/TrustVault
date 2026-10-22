# TrustVault - Threat Model & Security Analysis (`THREATS.md`)

TrustVault implements defense-in-depth principles to secure sensitive organizational documents and maintain immutable audit logs.

## STRIDE Threat Analysis

### 1. Spoofing Identity
- **Threat:** An attacker steals or forges JWT tokens to impersonate legitimate users or admins.
- **Mitigation:** Implemented secure password hashing via `passlib[bcrypt]` and signed JWT access tokens with strict expiration times (`python-jose`).

### 2. Tampering with Data
- **Threat:** Modification of audit log entries or uploaded document contents by unauthorized entities.
- **Mitigation:** Append-only audit service logging (`audit_service.py`) ensuring every document action (upload, view, delete) is immutably recorded with timestamps and actor metadata.

### 3. Information Disclosure
- **Threat:** Unauthorized users accessing confidential documents stored in the vault.
- **Mitigation:** Role-Based Access Control (RBAC) and strict ownership checks enforced via FastAPI dependency injection before file streams or metadata are returned.