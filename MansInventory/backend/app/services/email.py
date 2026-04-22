import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings
from typing import List
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

async def notify_admins(subject: str, body: str, session, additional_emails: List[str] = None):
    # Helper to get all Admin, SuperAdmin, HR emails
    from app.models.user import User, UserRole
    from sqlmodel import select
    
    statement = select(User).where(User.role.in_([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR]))
    result = await session.execute(statement)
    admins = result.scalars().all()
    emails = [admin.email for admin in admins]
    
    if additional_emails:
        emails.extend(additional_emails)
        
    # Remove duplicates
    emails = list(set(emails))
    
    if emails:
        asyncio.create_task(send_email(subject, emails, body))

async def notify_all_users(subject: str, body: str, session):
    from app.models.user import User
    from sqlmodel import select
    
    result = await session.execute(select(User))
    users = result.scalars().all()
    emails = [u.email for u in users]
    
    if emails:
        asyncio.create_task(send_email(subject, emails, body))
