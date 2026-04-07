import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres.mbqmkeetmvwjodmkgmoz:MansInventory113%24@aws-1-eu-west-2.pooler.supabase.com:6543/postgres"

async def debug_password():
    engine = create_async_engine(DATABASE_URL, connect_args={"statement_cache_size": 0})
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            result = await session.execute(text('SELECT email, hashed_password FROM "user" WHERE email = \'abberh113@gmail.com\''))
            user = result.fetchone()
            if user:
                print(f"User: {user.email}")
                print(f"Hashed Password Length: {len(user.hashed_password)}")
                print(f"Hashed Password Start: {user.hashed_password[:10]}...")
            else:
                print("Admin user not found!")
        except Exception as e:
            print(f"Error: {e}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(debug_password())
