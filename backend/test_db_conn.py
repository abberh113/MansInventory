
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

async def test_connection(connection_name, db_url):
    print(f"--- Testing {connection_name} ---")
    print(f"URL: {db_url.split('@')[-1]}")
    
    if not db_url.startswith("postgresql+asyncpg://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://")

    # Disable statement cache for Supabase pooler
    connect_args = {"statement_cache_size": 0} if ":6543" in db_url else {}

    engine = create_async_engine(db_url, connect_args=connect_args)
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            print(f"✅ {connection_name} Success! Result: {result.fetchone()}")
            return True
    except Exception as e:
        print(f"❌ {connection_name} Failed: {e}")
        return False
    finally:
        await engine.dispose()

async def main():
    # 1. Try currently configured URL
    current_url = os.getenv("DATABASE_URL")
    await test_connection("Current .env URL", current_url)
    
    # 2. Try with alternative password found in deployment guide
    alt_url = current_url.replace("M5eFgd1fZae2YDtw", "MansInventory113%24")
    if alt_url != current_url:
        await test_connection("Alternative Password URL", alt_url)

    # 3. Try direct connection (no pooler)
    direct_url = "postgresql+asyncpg://postgres:MansInventory113%24@db.mbqmkeetmvwjodmkgmoz.supabase.co:5432/postgres"
    await test_connection("Direct Connection (no pooler)", direct_url)

if __name__ == "__main__":
    asyncio.run(main())
