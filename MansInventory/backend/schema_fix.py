import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:Abberh113@localhost:5432/mans_inventory"

async def fix():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        print("Checking/Adding image_path to product...")
        try:
            await conn.execute(text("ALTER TABLE product ADD COLUMN image_path VARCHAR;"))
            print("Done.")
        except Exception as e:
            print(f"Result: {e}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(fix())
