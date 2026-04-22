from enum import Enum
from typing import Optional
from sqlmodel import Field, SQLModel
from datetime import datetime


class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    HR = "hr"
    SUPER_HEAD = "super_head"
    NORMAL_STAFF = "normal_staff"


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    full_name: str = Field(unique=True, index=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    role: UserRole = Field(default=UserRole.NORMAL_STAFF)
    is_active: bool = Field(default=True)
    is_confirmed: bool = Field(default=False)
    is_google_user: bool = Field(default=False)
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
