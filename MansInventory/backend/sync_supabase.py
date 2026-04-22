import asyncio
import sys
from app.db.session import init_db, engine
from sqlmodel import SQLModel

# We MUST import all models so SQLModel metadata knows about them
import app.models.user
import app.models.inventory
import app.models.audit

async def sync():
    print("Initiating Supabase Schema Sync...")
    try:
        await init_db()
        print("✅ Success! All tables created in Supabase.")
    except Exception as e:
        print(f"❌ Error syncing to Supabase: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(sync())
