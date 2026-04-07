import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.services.auth import verify_password
from app.core.config import settings

async def debug_user():
    print(f"Checking DB: {settings.DATABASE_URL}")
    engine = create_async_engine(str(settings.DATABASE_URL), connect_args={"statement_cache_size": 0})
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        email = "abberh113@gmail.com"
        result = await session.execute(text('SELECT email, hashed_password, is_active, is_confirmed, role FROM "user" WHERE email = :e'), {"e": email})
        user = result.first()
        
        if not user:
            print(f"❌ User {email} NOT FOUND in database!")
        else:
            print(f"✅ User found!")
            print(f"Email: {user.email}")
            print(f"Hash: {user.hashed_password}")
            print(f"Active: {user.is_active}, Confirmed: {user.is_confirmed}, Role: {user.role}")
            
            # Test verification locally
            is_valid = verify_password("Abberh113", user.hashed_password)
            print(f"Verification test with 'Abberh113': {'PASS' if is_valid else 'FAIL'}")

if __name__ == "__main__":
    asyncio.run(debug_user())
