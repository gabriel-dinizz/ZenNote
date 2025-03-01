from datetime import datetime, timedelta, timezone
from enum import verify
from typing import Annotated
from typing_extensions import deprecated

import jwt
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi import Depends, FastAPI, HTTPException, status
from pydantic import BaseModel
from passlib.context import CryptContext
from typing import Optional

SECRET_KEY = "030556cdab7821d6cbd82af841749f8464e4bea70c809dbf5b058f71462a2143"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


fake_users_db = {
    "gabrieldiniz": {
        "username": "gabrieldiniz",
        "full_name": "Gabriel Diniz Cremel",
        "email": "gabrieldiniz@exemplo.com",
        "hashed_password": "fakehashedpassword123",
        "disabled": False,
    },
    "rafael": {
        "username": "rafael",
        "full_name": "Rafael Gomes",
        "email": "raf@gmail.com",
        "hashed_password": "fakehashedpassword456",
        "disabled": True,
    },
}

app = FastAPI()


class Token(BaseModel):
    access_token: Optional[str] = None
    token_type: Optional[str] = None


class TokenData(BaseModel):
    username: Optional[str] = None


class User(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    disabled: Optional[bool] = None


class UserInDB(User):
    hashed_password: str


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context(password)


def get_user(db, username: str):
    if username in db:
        user_dict = db[username]
        return UserInDB(**user_dict)


def authenticate_user(fake_db, username: str, password: str):
    user = get_user(fake_db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user


def create_acces_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datatime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode)


async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]):
    """Validates and returns the user from the token"""
    user = fake_decode_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Ensures the user is active"""
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


@app.post("/token")
async def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    """Authenticates the user and returns an access token"""
    user_dict = fake_users_db.get(form_data.username)
    if not user_dict:
        raise HTTPException(
            status_code=400, detail="Incorrect username or password")

    user = UserInDB(**user_dict)
    hashed_password = fake_hash_password(form_data.password)

    if hashed_password != user.hashed_password:  # Fixed password comparison
        raise HTTPException(
            status_code=400, detail="Incorrect username or password")

    return {"access_token": user.username, "token_type": "bearer"}


@app.get("/users/me")
async def read_users_me(current_user: Annotated[User, Depends(get_current_active_user)]):
    """Returns the authenticated user's details"""
    return current_user
