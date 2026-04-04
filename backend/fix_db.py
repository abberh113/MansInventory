import asyncio
from sqlalchemy import text
from app.db.session import engine

async def fix_database():
    print("🚀 Connecting to database to apply hotfix...")
    async with engine.begin() as conn:
        try:
            # Add payment_mode to inventoryorder
            await conn.execute(text('ALTER TABLE inventoryorder ADD COLUMN IF NOT EXISTS payment_mode VARCHAR;'))
            print("✅ Added 'payment_mode' column to inventoryorder table.")
            
            # While we are at it, let's make sure total_amount is a float if it isn't
            await conn.execute(text('ALTER TABLE inventoryorder ALTER COLUMN total_amount TYPE FLOAT;'))
            print("✅ Verified 'total_amount' column type.")
            
            print("\n✨ Database schema is now synchronized!")
        except Exception as e:
            print(f"❌ Error applying fix: {e}")

if __name__ == "__main__":
    asyncio.run(fix_database())
