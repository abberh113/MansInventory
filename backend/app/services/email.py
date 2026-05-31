import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings
from typing import List, Optional
import asyncio

async def send_email(subject: str, recipients: List[str], body: str):
    # Log to console since we need real credentials for SMTP
    print(f"\n--- [EMAIL TO: {recipients}] ---")
    print(f"Subject: {subject}")
    # print(f"Body: {body}")
    print("---------------------------------\n")

    def _send():
        try:
            msg = MIMEMultipart()
            msg['From'] = settings.EMAILS_FROM_EMAIL
            msg['To'] = ", ".join(recipients)
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'html'))
            
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASS)
            server.send_message(msg)
            server.quit()
        except Exception as e:
            print(f"Failed to send email: {e}")

    # Run the blocking SMTP logic in a separate thread without awaiting it to avoid blocking the API response
    loop = asyncio.get_running_loop()
    loop.run_in_executor(None, _send)
    return True

async def notify_admins(subject: str, body: str, session: Optional[any] = None, additional_emails: List[str] = None):
    # Helper to get all Admin, SuperAdmin, HR emails
    from app.models.user import User, UserRole
    from sqlmodel import select
    from app.db.session import async_session
    
    async def _get_emails(sess):
        statement = select(User).where(User.role.in_([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR]))
        res = await sess.execute(statement)
        admins = res.scalars().all()
        return [admin.email for admin in admins]

    emails = []
    if session:
        emails = await _get_emails(session)
    else:
        async with async_session() as new_session:
            emails = await _get_emails(new_session)
    
    if additional_emails:
        emails.extend(additional_emails)
        
    # Remove duplicates
    emails = list(set(emails))
    
    if emails:
        # Use a task to ensure the request isn't blocked by SMTP
        asyncio.create_task(send_email(subject, emails, body))

async def notify_all_users(subject: str, body: str, session: Optional[any] = None):
    from app.models.user import User
    from sqlmodel import select
    from app.db.session import async_session
    
    async def _get_emails(sess):
        result = await sess.execute(select(User))
        users = result.scalars().all()
        return [u.email for u in users]

    emails = []
    if session:
        try:
            emails = await _get_emails(session)
        except:
            # Session might be closed if called as background task
            async with async_session() as new_session:
                emails = await _get_emails(new_session)
    else:
        async with async_session() as new_session:
            emails = await _get_emails(new_session)
    
    if emails:
        asyncio.create_task(send_email(subject, emails, body))
