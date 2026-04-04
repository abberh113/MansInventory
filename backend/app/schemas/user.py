from typing import Optional
from pydantic import BaseModel, EmailStr
from app.models.user import UserRole

class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    role: UserRole = UserRole.NORMAL_STAFF

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    password: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_role: UserRole

class TokenData(BaseModel):
    email: Optional[EmailStr] = None

class UserRead(UserBase):
    id: int
    is_active: bool
    is_confirmed: bool
    is_google_user: bool

    class Config:
        from_attributes = True

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str
