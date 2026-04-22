from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.db.session import get_session
from app.models.user import User, UserRole
from app.services.auth import decode_token
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_session)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token_data = decode_token(token)
    if token_data is None:
        raise credentials_exception
    
    statement = select(User).where(User.email == token_data.email)
    result = await session.execute(statement)
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    return user

async def get_active_user(user: User = Depends(get_current_user)) -> User:
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user

class PermissionChecker:
    def __init__(self, allowed_roles: list[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_active_user)):
        if user.role not in self.allowed_roles and user.role != UserRole.SUPER_ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return user

# Convenience dependency for Super Admin only
def get_super_admin(user: User = Depends(get_active_user)):
    if user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin privileges required"
        )
    return user
