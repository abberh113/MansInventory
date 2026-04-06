from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlmodel import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
import asyncio
from app.db.session import get_session
from app.models.audit import AuditLog
from app.models.user import User, UserRole
from app.schemas.audit import AuditLogRead
from app.api.v1.deps import get_active_user, PermissionChecker
from app.services.email import notify_admins

router = APIRouter()

@router.get("/", response_model=list[AuditLogRead])
async def get_audit_logs(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(PermissionChecker([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR])),
    limit: int = 200
):
    # Fetch most recent logs first
    statement = select(AuditLog).order_by(desc(AuditLog.created_at)).limit(limit)
    result = await session.execute(statement)
    return result.scalars().all()

# Helper function to create logs (internal use)
async def create_audit_log(session: AsyncSession, user: User, action: str, details: str = None, request: Request = None):
    # Get details for the email before possible commit
    user_id = user.id
    full_name = user.full_name
    email = user.email
    ip_address = request.client.host if request else "N/A"
    
    try:
        new_log = AuditLog(
            user_id=user_id,
            full_name=full_name,
            email=email,
            action=action,
            details=details,
            ip_address=ip_address
        )
        session.add(new_log)
        await session.commit()
    except Exception as e:
        print(f"⚠️ Audit log write failed: {e}")

    # Fire-and-forget email notification without reusing the current session object
    # This prevents the 500 error when session is committed
    async def _send_notif():
        from app.db.session import async_session
        try:
            async with async_session() as new_session:
                subject = f"Audit Log Alert: {action}"
                body = f"""
                <html>
                    <body>
                        <h2>New Activity Log</h2>
                        <p><strong>Action:</strong> {action}</p>
                        <p><strong>User:</strong> {full_name} ({email})</p>
                        <p><strong>Details:</strong> {details or 'N/A'}</p>
                        <p><strong>IP Address:</strong> {ip_address}</p>
                    </body>
                </html>
                """
                await notify_admins(subject, body, new_session)
        except Exception as e:
            print(f"⚠️ Audit email notification failed: {e}")

    asyncio.create_task(_send_notif())
