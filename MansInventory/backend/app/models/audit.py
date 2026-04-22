from typing import Optional
from sqlmodel import Field, SQLModel
from datetime import datetime

class AuditLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)
    full_name: str
    email: str
    action: str  # e.g., "LOGIN", "LOGOUT", "PRODUCT_CREATED"
    details: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
