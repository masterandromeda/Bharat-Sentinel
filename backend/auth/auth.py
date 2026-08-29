"""
BharatSentinel — Authentication module
Provides: user registration, login (JWT), logout (client-side token drop),
          current-user lookup, and change-password.
Uses: bcrypt directly for password hashing, python-jose for JWT.
"""
import os
import uuid
import bcrypt as _bcrypt
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from pydantic import BaseModel, Field

from backend.database.database import get_connection

# ── Config ─────────────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "bharat-sentinel-secret-change-in-production-2025")
ALGORITHM  = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))  # 24h default

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

router = APIRouter(prefix="/api/auth", tags=["Auth"])


# ── Pydantic schemas ───────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: str
    password: str = Field(..., min_length=8)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    email: str


class UserResponse(BaseModel):
    id: str
    email: str
    created_at: str


# ── Helpers ────────────────────────────────────────────────────────────────────
def _hash_password(plain: str) -> str:
    return _bcrypt.hashpw(plain.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")


def _verify_password(plain: str, hashed: str) -> bool:
    try:
        return _bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def _create_token(email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": email, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def _get_user_by_email(email: str) -> Optional[dict]:
    conn = get_connection()
    try:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """FastAPI dependency — validates JWT and returns user dict."""
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            raise credentials_error
    except JWTError:
        raise credentials_error
    user = _get_user_by_email(email)
    if not user:
        raise credentials_error
    return user


# ── Routes ─────────────────────────────────────────────────────────────────────
@router.post("/register", response_model=TokenResponse, status_code=201)
def register(req: RegisterRequest):
    """Create a new account. Returns JWT on success."""
    existing = _get_user_by_email(req.email)
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    now = datetime.utcnow().isoformat()
    user_id = str(uuid.uuid4())
    hashed = _hash_password(req.password)
    conn = get_connection()
    try:
        conn.execute(
            "INSERT INTO users (id, email, hashed_password, created_at, updated_at) VALUES (?,?,?,?,?)",
            (user_id, req.email, hashed, now, now),
        )
        conn.commit()
    finally:
        conn.close()
    token = _create_token(req.email)
    return TokenResponse(access_token=token, email=req.email)


@router.post("/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends()):
    """
    Login with email + password.
    Uses OAuth2 form (username field = email).
    """
    user = _get_user_by_email(form.username)
    if not user or not _verify_password(form.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = _create_token(user["email"])
    return TokenResponse(access_token=token, email=user["email"])


@router.get("/me", response_model=UserResponse)
def me(current_user: dict = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        created_at=current_user["created_at"],
    )


@router.post("/change-password")
def change_password(req: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    """Change the authenticated user's password."""
    if not _verify_password(req.current_password, current_user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    if req.new_password == req.current_password:
        raise HTTPException(status_code=400, detail="New password must differ from current password.")
    new_hash = _hash_password(req.new_password)
    now = datetime.utcnow().isoformat()
    conn = get_connection()
    try:
        conn.execute(
            "UPDATE users SET hashed_password = ?, updated_at = ? WHERE id = ?",
            (new_hash, now, current_user["id"]),
        )
        conn.commit()
    finally:
        conn.close()
    return {"message": "Password changed successfully."}


@router.post("/logout")
def logout():
    """
    Logout endpoint — instructs client to drop its token.
    JWT is stateless; actual invalidation is handled client-side.
    """
    return {"message": "Logged out. Please discard your access token."}
