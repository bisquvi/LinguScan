import hashlib
import re
import secrets
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from passlib.exc import MissingBackendError, UnknownHashError
from passlib.hash import pbkdf2_sha256
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas

router = APIRouter()
password_context = CryptContext(schemes=["bcrypt", "pbkdf2_sha256"], deprecated="auto")
legacy_sha256_pattern = re.compile(r"^[a-f0-9]{64}$")


def hash_password(password: str) -> str:
    try:
        return password_context.hash(password, scheme="bcrypt")
    except MissingBackendError:
        return pbkdf2_sha256.hash(password)
    except Exception as exc:
        print(f"[auth] bcrypt hash failed, falling back to pbkdf2_sha256: {exc}")
        return pbkdf2_sha256.hash(password)


def is_legacy_sha256_hash(password_hash: Optional[str]) -> bool:
    return bool(password_hash and legacy_sha256_pattern.fullmatch(password_hash))


def verify_password(password: str, password_hash: Optional[str]) -> bool:
    if not password_hash:
        return False

    if is_legacy_sha256_hash(password_hash):
        legacy_hash = hashlib.sha256(password.encode("utf-8")).hexdigest()
        return secrets.compare_digest(legacy_hash, password_hash)

    try:
        return password_context.verify(password, password_hash)
    except (MissingBackendError, UnknownHashError):
        try:
            return pbkdf2_sha256.verify(password, password_hash)
        except Exception:
            return False
    except Exception:
        return False


def extract_bearer_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None

    scheme, _, token = authorization.partition(" ")
    if scheme != "Bearer" or not token:
        return None

    return token


def get_current_user(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    token = extract_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    user = db.query(models.User).filter(models.User.token == token).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    return user


def get_optional_current_user(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
):
    if authorization is None:
        return None

    token = extract_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = db.query(models.User).filter(models.User.token == token).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    return user


@router.post("/register", response_model=schemas.UserResponse)
def register(user_data: schemas.UserRegister, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")

    new_user = models.User(
        username=user_data.username,
        password=hash_password(user_data.password),
        token=secrets.token_hex(32)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=schemas.UserResponse)
def login(user_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == user_data.username).first()
    if not user or not verify_password(user_data.password, user.password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")

    if is_legacy_sha256_hash(user.password):
        user.password = hash_password(user_data.password)

    user.token = secrets.token_hex(32)
    db.commit()
    db.refresh(user)
    return user

@router.post("/logout")
def logout(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.token = None
    db.commit()
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=schemas.UserResponse)
def update_me(user_update: schemas.UserUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check if new username is already taken
    if user_update.username != current_user.username:
        existing_user = db.query(models.User).filter(models.User.username == user_update.username).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already taken")
        
        current_user.username = user_update.username
        db.commit()
        db.refresh(current_user)
        
    return current_user

@router.delete("/me")
def delete_me(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Delete the user. Cascading deletes should handle related decks, cards, etc. if configured in models.
    # Otherwise, we just delete the user.
    db.delete(current_user)
    db.commit()
    return {"message": "Account deleted successfully"}
