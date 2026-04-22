import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlmodel import select, SQLModel
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.models.user import User, UserRole
from app.services.auth import get_password_hash

# Credentials from user
NAME = "Super Admin"
EMAIL = "abberh113@gmail.com"
PASSWORD = "Abberh113$"

async def seed_super_admin():
    print(f"Connecting to database to seed Super Admin...")
    # Add statement_cache_size: 0 for Supabase Compatibility
    engine = create_async_engine(
        settings.DATABASE_URL, 
        echo=True, 
        future=True, 
        connect_args={"statement_cache_size": 0}
    )
    
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        print(f"Checking if user '{EMAIL}' exists...")
        statement = select(User).where(User.email == EMAIL)
        results = await session.execute(statement)
        user = results.scalars().first()

        if user:
            print(f"User '{EMAIL}' already exists. Elevating to SUPER_ADMIN...")
            user.role = UserRole.SUPER_ADMIN
            user.is_active = True
            user.is_confirmed = True
            session.add(user)
        else:
            print(f"Creating new Super Admin: {NAME} ({EMAIL})...")
            new_user = User(
                full_name=NAME,
                email=EMAIL,
                hashed_password=get_password_hash(PASSWORD),
                role=UserRole.SUPER_ADMIN,
                is_active=True,
                is_confirmed=True
            )
            session.add(new_user)
        
        await session.commit()
        print("✅ Success! Your Super Admin has been seeded.")

if __name__ == "__main__":
    asyncio.run(seed_super_admin())
