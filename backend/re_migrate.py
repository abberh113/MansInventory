import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.db.session import init_db, engine as session_engine
from app.models.user import User # Ensure models are imported
from app.models.inventory import Product, Category # Ensure models are imported

async def migrate():
    db_url = os.getenv("DATABASE_URL")
    print(f"Connecting to: {db_url.split('@')[-1]}")
    
    try:
        # 1. Run the main SQLModel initialization
        print("Re-initializing database schema...")
        await init_db()
        
        async with session_engine.begin() as conn:
            # 2. Add missing columns
            print("Checking/Adding missing columns...")
            await conn.execute(text('ALTER TABLE product ADD COLUMN IF NOT EXISTS image_path VARCHAR'))
            await conn.execute(text('ALTER TABLE inventoryorder ADD COLUMN IF NOT EXISTS staff_email VARCHAR'))
            await conn.execute(text('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN DEFAULT FALSE'))
            
            # 3. Check if we have at least one user, if not, create the admin
            result = await conn.execute(text('SELECT count(*) FROM "user"'))
            count = result.scalar()
            print(f"Current user count: {count}")
            
        print("✅ Migration sequence complete!")
        
    except Exception as e:
        print(f"❌ MIGRATION FAILED: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
