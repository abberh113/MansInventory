
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def test_connection():
    # Trying the password from the scripts
    db_url = "postgresql+asyncpg://user:password@aws-1-eu-west-2.pooler.supabase.com:6543/postgres"
    print(f"Testing connection to: {db_url}")
    
    engine = create_async_engine(db_url)
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            print(f"Success! Result: {result.fetchone()}")
    except Exception as e:
        print(f"Connection failed: {type(e).__name__}: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_connection())
