import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.services.auth import get_password_hash
from app.core.config import settings
from app.models.user import UserRole

async def reset_password():
    print(f"Connecting to DB...")
    engine = create_async_engine(str(settings.DATABASE_URL), connect_args={"statement_cache_size": 0})
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        email = "abberh113@gmail.com"
        new_hashed = get_password_hash("Abberh113")
        
        # Check if user exists
        result = await session.execute(text('SELECT id FROM "user" WHERE email = :e'), {"e": email})
        user = result.first()
        
        if not user:
            print(f"User {email} not found! Creating super admin account...")
            await session.execute(text('''
                INSERT INTO "user" (full_name, email, hashed_password, role, is_active, is_confirmed)
                VALUES (:name, :e, :h, :r, true, true)
            '''), {
                "name": "Abberh",
                "e": email,
                "h": new_hashed,
                "r": UserRole.SUPER_ADMIN.value
            })
        else:
            print(f"User {email} found! Updating password to the secure bcrypt hash...")
            await session.execute(text('''
                UPDATE "user" 
                SET hashed_password = :h,
                    is_active = true,
                    is_confirmed = true
                WHERE email = :e
            '''), {
                "h": new_hashed,
                "e": email
            })
            
        await session.commit()
        print("✅ Success! The encrypted password has been saved to the database.")

if __name__ == "__main__":
    asyncio.run(reset_password())
