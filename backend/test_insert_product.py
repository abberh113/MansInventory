"""
Test script to diagnose why product insertion is failing.
Uses environment variables to avoid leaking secrets.
"""
import asyncio
import os

# Get URL from environment
DB_URL = os.getenv("DATABASE_URL", "YOUR_DATABASE_URL_HERE")

async def test_insert():
    if "YOUR_DATABASE_URL" in DB_URL:
        print("❌ Error: PLEASE SET DATABASE_URL environment variable first.")
        return

    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import text
    
    print("=" * 60)
    print("TEST: Direct Product Insertion Diagnostic")
    print("=" * 60)
    
    engine = create_async_engine(DB_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # [Diagnostic steps omitted for brevity in this scratch tool]
        print("\n[1] Testing connection...")
        try:
            result = await session.execute(text("SELECT 1"))
            print("    ✅ Connection successful.")
        except Exception as e:
            print(f"    ❌ Connection failed: {e}")
            return

        # 3. Try direct INSERT with image_path = NULL
        print("\n[3] Testing INSERT product (no image)...")
        try:
            # Get a category ID
            res = await session.execute(text("SELECT id FROM category LIMIT 1"))
            cat = res.fetchone()
            cat_id = cat[0] if cat else 1
            
            result = await session.execute(
                text("""INSERT INTO product (name, sku, price, stock_quantity, category_id, image_path) 
                        VALUES (:name, :sku, :price, :stock, :cat_id, NULL) 
                        RETURNING id"""),
                {"name": "DIAG_TEST", "sku": "DIAG-SKU-NEW", "price": 99.99, "stock": 5, "cat_id": cat_id}
            )
            new_id = result.fetchone()[0]
            await session.commit()
            print(f"    ✅ INSERT SUCCEEDED! id={new_id}")
            # Cleanup
            await session.execute(text("DELETE FROM product WHERE sku = 'DIAG-SKU-NEW'"))
            await session.commit()
            print(f"    ✅ Cleanup done.")
        except Exception as e:
            await session.rollback()
            print(f"    ❌ INSERT FAILED: {type(e).__name__}: {e}")

    await engine.dispose()
    print("\n" + "=" * 60)
    print("Diagnostic Complete.")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_insert())
