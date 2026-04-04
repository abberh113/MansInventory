from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_session
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserRead, Token, PasswordResetRequest, PasswordResetConfirm
from app.services.auth import get_password_hash, verify_password, create_access_token
import secrets

from app.api.v1.audit import create_audit_log
from app.api.v1.deps import get_current_user
from fastapi import Request

router = APIRouter()

@router.post("/register", response_model=UserRead)
async def register_user(user_in: UserCreate, session: AsyncSession = Depends(get_session)):
    # Check if user already exists
    statement = select(User).where(User.email == user_in.email)
    result = await session.execute(statement)
    if result.first():
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    # Create new user
    user = User(
        full_name=user_in.full_name,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role,
        is_confirmed=True if user_in.role == UserRole.SUPER_ADMIN else False
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    
    # Notify user of account creation
    from app.services.email import send_email
    await send_email(
        "Welcome to Mans Luxury Empire",
        [user.email],
        f"Hello {user.full_name}, your account has been created. {'Your account is now active.' if user.is_confirmed else 'Your account is pending confirmation by the management team.'}"
    )
    return user

@router.post("/login", response_model=Token)
async def login_user(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(), 
    session: AsyncSession = Depends(get_session)
):
    # Use email for login (passed in the 'username' field of OAuth2 form)
    statement = select(User).where(User.email == form_data.username)
    result = await session.execute(statement)
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Your account has been suspended by an administrator.")
        
    if not user.is_confirmed and user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Your account is pending confirmation by an administrator. Please check back later.")
    
    # Log the Login event
    await create_audit_log(session, user, "LOGIN", details="Successful login", request=request)
    
    # Requirement: Notify Admins except for Super Admin login
    if user.role != UserRole.SUPER_ADMIN:
        from app.services.email import notify_admins
        await notify_admins(
            f"🔔 User Login: {user.full_name}",
            f"The user {user.full_name} ({user.email}) has signed in to the system at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}.",
            session
        )
    
    access_token = create_access_token(data={"sub": user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_role": user.role
    }

@router.post("/logout")
async def logout_user(
    request: Request,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    await create_audit_log(session, current_user, "LOGOUT", details="Manual sign out", request=request)
    
    # Requirement: Notify Admins except for Super Admin logout
    if current_user.role != UserRole.SUPER_ADMIN:
        from app.services.email import notify_admins
        await notify_admins(
            f"🚶 User Logout: {current_user.full_name}",
            f"The user {current_user.full_name} ({current_user.email}) has signed out of the system at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}.",
            session
        )
    return {"message": "Log out event recorded."}

@router.post("/password-reset-request")
async def request_password_reset(reset_in: PasswordResetRequest, session: AsyncSession = Depends(get_session)):
    statement = select(User).where(User.email == reset_in.email)
    result = await session.execute(statement)
    user = result.scalar_one_or_none()
    
    if user:
        # Generate a secure reset JWT
        from datetime import timedelta
        reset_token = create_access_token(
            data={"sub": user.email, "type": "reset"},
            expires_delta=timedelta(minutes=15)
        )
        
        # Link for the frontend
        # Assuming frontend is hosted centrally, we point it to the frontend URL
        # For local dev this might be localhost:5173
        reset_link = f"http://localhost:5173/forgot-password?token={reset_token}"
        
        # Send actual email
        from app.services.email import send_email
        await send_email(
            "Password Reset Request",
            [user.email],
            f"<p>Hello {user.full_name},</p><p>You requested a password reset. Click the link below to reset your password. This link will expire in 15 minutes.</p><p><a href='{reset_link}'>{reset_link}</a></p><p>If you did not request this, please ignore this email.</p>"
        )
        print(f"Password reset email sent to {user.email}")
    
    return {"message": "If an account with that email exists, we have sent a password reset link."}

@router.post("/password-reset-confirm")
async def confirm_password_reset(reset_in: PasswordResetConfirm, session: AsyncSession = Depends(get_session)):
    try:
        from jose import jwt, JWTError
        from app.core.config import settings
        payload = jwt.decode(reset_in.token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email = payload.get("sub")
        token_type = payload.get("type")
        
        if not email or token_type != "reset":
            raise HTTPException(status_code=400, detail="Invalid token")
            
        statement = select(User).where(User.email == email)
        result = await session.execute(statement)
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=400, detail="Invalid token")
            
        user.hashed_password = get_password_hash(reset_in.new_password)
        session.add(user)
        await session.commit()
        return {"message": "Password updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
