import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.core.config import settings

async def list_users():
    engine = create_async_engine(str(settings.DATABASE_URL), connect_args={"statement_cache_size": 0})
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        result = await session.execute(text('SELECT email, role, is_active, is_confirmed FROM "user"'))
        users = result.fetchall()
        print(f"Total Users: {len(users)}")
        for u in users:
            print(f"- {u.email} | Role: {u.role} | Active: {u.is_active} | Confirmed: {u.is_confirmed}")

if __name__ == "__main__":
    asyncio.run(list_users())
