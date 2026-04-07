import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

# Supabase URL with encoded password
DATABASE_URL = "postgresql+asyncpg://postgres.mbqmkeetmvwjodmkgmoz:MansInventory113%24@aws-1-eu-west-2.pooler.supabase.com:6543/postgres"

async def check_users():
    engine = create_async_engine(DATABASE_URL, connect_args={"statement_cache_size": 0})
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            # Check users
            result = await session.execute(text('SELECT id, email, full_name, role, is_confirmed FROM "user"'))
            users = result.fetchall()
            print(f"Found {len(users)} users:")
            for u in users:
                print(f"- {u.full_name} ({u.email}) | Role: {u.role} | Confirmed: {u.is_confirmed}")
        except Exception as e:
            print(f"Error checking users: {e}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_users())
