from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_session
from app.models.user import User, UserRole
from app.schemas.user import UserRead, UserUpdate, UserCreate
from app.api.v1.deps import get_current_user, get_active_user, PermissionChecker
from app.services.auth import get_password_hash
from app.services.email import send_email, notify_admins
from app.api.v1.audit import create_audit_log

router = APIRouter()

@router.get("/", response_model=list[UserRead])
async def list_users(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(PermissionChecker([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR]))
):
    result = await session.execute(select(User))
    return result.scalars().all()

@router.post("/", response_model=UserRead)
async def create_new_user(
    user_in: UserCreate,
    request: Request = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(PermissionChecker([UserRole.SUPER_ADMIN, UserRole.ADMIN]))
):
    # RBAC check: Only Super Admin can create Admin or SuperAdmin
    if current_user.role != UserRole.SUPER_ADMIN and user_in.role in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin cannot create Super Admin or another Admin")

    # Check if user already exists
    statement = select(User).where(User.email == user_in.email)
    result = await session.execute(statement)
    if result.first():
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    new_user = User(
        full_name=user_in.full_name,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role,
        is_confirmed=True # Administrative creation auto-confirms
    )
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)
    
    # Notify user
    await send_email(
        "Account Created", 
        [new_user.email], 
        f"Your account as {new_user.role} has been created by {current_user.full_name}."
    )
    
    await create_audit_log(
        session, current_user, "USER_CREATED", 
        details=f"Created user {new_user.full_name} ({new_user.email}) as {new_user.role}", 
        request=request
    )
    return new_user

@router.put("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    request: Request = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(PermissionChecker([UserRole.SUPER_ADMIN, UserRole.ADMIN]))
):
    statement = select(User).where(User.id == user_id)
    result = await session.execute(statement)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # RBAC check for Admins
    if current_user.role != UserRole.SUPER_ADMIN:
        if user.role in [UserRole.SUPER_ADMIN, UserRole.ADMIN] and user.id != current_user.id:
            raise HTTPException(status_code=403, detail="Admin cannot update other Admins or Super Admins")

    if user_update.full_name: user.full_name = user_update.full_name
    if user_update.email: user.email = user_update.email
    if user_update.role and current_user.role == UserRole.SUPER_ADMIN:
        user.role = user_update.role
    
    session.add(user)
    await session.commit()
    await session.refresh(user)
    
    # Notify user
    await send_email(
        "Account Updated", 
        [user.email], 
        f"Your account details have been updated by {current_user.full_name}."
    )
    
    await create_audit_log(
        session, current_user, "USER_UPDATED", 
        details=f"Updated user profile for {user.full_name} ({user.email})", 
        request=request
    )
    return user

@router.put("/{user_id}/reset-password")
async def reset_user_password(
    user_id: int,
    password_in: str,
    request: Request = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(PermissionChecker([UserRole.SUPER_ADMIN, UserRole.ADMIN]))
):
    statement = select(User).where(User.id == user_id)
    result = await session.execute(statement)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Admins can't reset other Admins/SuperAdmin
    if current_user.role != UserRole.SUPER_ADMIN and user.role in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin cannot reset passwords for other Admins")

    user.hashed_password = get_password_hash(password_in)
    session.add(user)
    await session.commit()
    
    # Notify user
    await send_email(
        "Password Reset Successful", 
        [user.email], 
        f"Your password has been reset by an administrator ({current_user.full_name})."
    )
    
    await create_audit_log(
        session, current_user, "PASSWORD_RESET_ADMIN", 
        details=f"Forced password reset for user {user.full_name}", 
        request=request
    )
    
    return {"message": f"Password for user {user.full_name} has been reset."}

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    request: Request = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(PermissionChecker([UserRole.SUPER_ADMIN, UserRole.ADMIN]))
):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Users cannot delete themselves.")

    statement = select(User).where(User.id == user_id)
    result = await session.execute(statement)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if current_user.role != UserRole.SUPER_ADMIN and user.role in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin cannot delete other Admins or Super Admins")
    await create_audit_log(
        session, current_user, "USER_DELETED", 
        details=f"Deleted user {user.full_name} ({user.email})", 
        request=request
    )
        
    await session.delete(user)
    await session.commit()
    return None

@router.post("/{user_id}/confirm")
async def confirm_user(
    user_id: int,
    request: Request = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(PermissionChecker([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR]))
):
    statement = select(User).where(User.id == user_id)
    result = await session.execute(statement)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_confirmed = True
    session.add(user)
    await session.commit()
    
    # Notify user
    await send_email(
        "Account Confirmed", 
        [user.email], 
        f"🥳 Great news {user.full_name}! Your account has been confirmed by {current_user.full_name}. You can now log in."
    )
    
    await create_audit_log(
        session, current_user, "USER_CONFIRMED", 
        details=f"Confirmed user account for {user.full_name}", 
        request=request
    )
    
    return {"message": f"User {user.full_name} has been confirmed."}

@router.post("/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: int,
    request: Request = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(PermissionChecker([UserRole.SUPER_ADMIN, UserRole.ADMIN]))
):
    statement = select(User).where(User.id == user_id)
    result = await session.execute(statement)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot disable your own account")
        
    if current_user.role != UserRole.SUPER_ADMIN and user.role in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin cannot suspend other admins")

    user.is_active = not user.is_active
    session.add(user)
    await session.commit()
    
    # Notify user
    status_str = "RE-ACTIVATED" if user.is_active else "SUSPENDED"
    await send_email(
        f"Account {status_str}", 
        [user.email], 
        f"Hello {user.full_name}, your account access has been {status_str} by {current_user.full_name}."
    )
    
    await create_audit_log(
        session, current_user, f"USER_{status_str}", 
        details=f"Changed user status to {status_str} for {user.full_name}", 
        request=request
    )
    
    return {"message": f"User {user.full_name} has been {'activated' if user.is_active else 'suspended'}.", "is_active": user.is_active}

@router.get("/me", response_model=UserRead)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user
