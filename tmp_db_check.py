import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def check():
    db_url = os.getenv("DATABASE_URL")
    print(f"Checking connection to: {db_url.split('@')[-1]}")
    try:
        engine = create_async_engine(db_url, connect_args={"statement_cache_size": 0})
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
        print(f"SUCCESS: DATABASE IS ALIVE! Response: {result.scalar()}")
    except Exception as e:
        print(f"ERROR: DATABASE CONNECTION FAILED: {e}")

if __name__ == "__main__":
    asyncio.run(check())
