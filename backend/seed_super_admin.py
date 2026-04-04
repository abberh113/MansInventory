import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlmodel import select, SQLModel

# We need to import our app config and models
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.models.user import User, UserRole
from app.services.auth import get_password_hash

# Credentials from user
USERNAME = "SuperAdmin"
EMAIL = "abberh113@gmail.com"
PASSWORD = "Abberh113$"

async def seed_super_admin():
    print(f"Connecting to database: {settings.DATABASE_URL}...")
    engine = create_async_engine(settings.DATABASE_URL, echo=True, future=True)
    
    # Initialize DB (Create tables if they don't exist)
    async with engine.begin() as conn:
        print("Initializing tables...")
        await conn.run_sync(SQLModel.metadata.create_all)

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Check if user already exists
        print(f"Checking if user '{USERNAME}' exists...")
        statement = select(User).where(User.username == USERNAME)
        results = await session.execute(statement)
        user = results.scalars().first()

        if user:
            print(f"User '{USERNAME}' already exists. Updating role to SUPER_ADMIN...")
            user.role = UserRole.SUPER_ADMIN
            user.hashed_password = get_password_hash(PASSWORD)
            user.email = EMAIL
            session.add(user)
        else:
            print(f"Creating new Super Admin: {USERNAME} ({EMAIL})...")
            new_user = User(
                username=USERNAME,
                email=EMAIL,
                hashed_password=get_password_hash(PASSWORD),
                role=UserRole.SUPER_ADMIN,
                is_active=True
            )
            session.add(new_user)
        
        await session.commit()
        print("Success! Super Admin record has been seeded.")

if __name__ == "__main__":
    asyncio.run(seed_super_admin())
