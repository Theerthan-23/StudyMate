import base64
import hashlib
import hmac
import json
import os
import secrets
import time

from dotenv import load_dotenv

load_dotenv()

from fastapi import Depends, HTTPException, status
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer
)

from sqlalchemy.orm import Session

from database import get_db
from models import User


SECRET_KEY = os.getenv("STUDYMATE_SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError(
        "STUDYMATE_SECRET_KEY environment variable is not set."
    )

SECRET_KEY = SECRET_KEY.encode("utf-8")


bearer_scheme = HTTPBearer(auto_error=False)


# PASSWORD HASHING
def hash_password(password: str) -> str:

    salt = secrets.token_bytes(16)

    derived = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        260_000
    )

    salt_text = base64.urlsafe_b64encode(
        salt
    ).decode("ascii")

    hash_text = base64.urlsafe_b64encode(
        derived
    ).decode("ascii")

    return f"pbkdf2_sha256$260000${salt_text}${hash_text}"


# PASSWORD VERIFICATION
def verify_password(password: str, stored_hash: str) -> bool:

    try:

        algorithm, iterations, salt_text, hash_text = (
            stored_hash.split("$", 3)
        )

        if algorithm != "pbkdf2_sha256":
            return False

        salt = base64.urlsafe_b64decode(
            salt_text.encode("ascii")
        )

        expected = base64.urlsafe_b64decode(
            hash_text.encode("ascii")
        )

        actual = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            int(iterations)
        )

        return hmac.compare_digest(actual, expected)

    except (ValueError, TypeError):

        return False


# TOKEN HELPERS
def encode_data(data: bytes) -> str:

    return base64.urlsafe_b64encode(
        data
    ).rstrip(b"=").decode("ascii")


def decode_data(value: str) -> bytes:

    return base64.urlsafe_b64decode(
        value + "=" * (-len(value) % 4)
    )


# CREATE LOGIN TOKEN
def create_access_token(
    user_id: str,
    expires_in: int = 7 * 24 * 60 * 60
) -> str:

    payload = {
        "sub": user_id,
        "exp": int(time.time()) + expires_in
    }

    encoded = encode_data(
        json.dumps(payload).encode("utf-8")
    )

    signature = encode_data(
        hmac.new(
            SECRET_KEY,
            encoded.encode("ascii"),
            hashlib.sha256
        ).digest()
    )

    return f"{encoded}.{signature}"


# GET LOGGED-IN USER
def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(
        bearer_scheme
    ),
    db: Session = Depends(get_db)
) -> User:

    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Please log in to access this resource.",
        headers={"WWW-Authenticate": "Bearer"}
    )

    if credentials is None:
        raise unauthorized

    if credentials.scheme.lower() != "bearer":
        raise unauthorized

    try:

        encoded, supplied_signature = (
            credentials.credentials.split(".", 1)
        )

        expected_signature = encode_data(
            hmac.new(
                SECRET_KEY,
                encoded.encode("ascii"),
                hashlib.sha256
            ).digest()
        )

        if not hmac.compare_digest(
            supplied_signature,
            expected_signature
        ):
            raise unauthorized

        payload = json.loads(
            decode_data(encoded)
        )

        if int(payload.get("exp", 0)) < int(time.time()):
            raise unauthorized

        user_id = payload.get("sub")

        if not user_id:
            raise unauthorized

    except (ValueError, TypeError, KeyError, json.JSONDecodeError):

        raise unauthorized

    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if user is None:
        raise unauthorized

    return user