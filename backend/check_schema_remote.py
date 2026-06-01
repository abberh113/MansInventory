
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os

async def check_schema():
    # Use environment variable or placeholder
    db_url = os.getenv("DATABASE_URL", "YOUR_DATABASE_URL_HERE")
    if "YOUR_DATABASE_URL" in db_url:
        print("Please set DATABASE_URL environment variable.")
        return
        
    engine = create_async_engine(db_url)
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'product'"))
            columns = [row[0] for row in result.fetchall()]
            print(f"Columns in 'product' table: {columns}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_schema())
