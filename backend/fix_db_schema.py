import asyncio
from sqlalchemy import text
from app.db.session import engine

async def add_image_path_column():
    async with engine.begin() as conn:
        try:
            await conn.execute(text('ALTER TABLE product ADD COLUMN image_path VARCHAR;'))
            print("Successfully added 'image_path' column to 'product' table.")
        except Exception as e:
            if 'already exists' in str(e).lower():
                print("'image_path' column already exists.")
            else:
                print(f"Error adding column: {e}")

if __name__ == "__main__":
    asyncio.run(add_image_path_column())
