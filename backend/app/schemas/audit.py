from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class AuditLogRead(BaseModel):
    id: int
    user_id: int
    full_name: str
    email: str
    action: str
    details: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
