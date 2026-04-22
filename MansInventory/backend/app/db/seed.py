import asyncio
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import async_session, engine, init_db
from app.models.user import User, UserRole
from app.services.auth import get_password_hash

async def create_super_admin():
    # Make sure tables are created
    # await init_db()
    
    async with async_session() as session:
        # Check if super admin already exists
        statement = select(User).where(User.username == "superadmin")
        result = await session.execute(statement)
        if result.scalar_one_or_none():
            print("Super Admin already exists!")
            return

        # Create super admin
        super_admin = User(
            username="superadmin",
            email="superadmin@mans.com",
            hashed_password=get_password_hash("MansAdmin@2026"),
            role=UserRole.SUPER_ADMIN,
            is_active=True
        )
        session.add(super_admin)
        await session.commit()
        print("Super Admin 'superadmin' created successfully!")
        print("Credentials: superadmin / MansAdmin@2026")

if __name__ == "__main__":
    asyncio.run(create_super_admin())
