import asyncio
import asyncpg
from app.core.config import settings

async def create_db():
    # Parse current URL to get credentials but connect to 'postgres' db
    # URL format: postgresql+asyncpg://user:password@host:port/dbname
    base_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgres://")
    # Replace the actual DB name with 'postgres' for the initial connection
    # We find the last slash and replace everything after it
    last_slash_idx = base_url.rfind("/")
    connection_url = base_url[:last_slash_idx+1] + "postgres"

    print(f"Connecting to default database to create 'mans_inventory'...")
    try:
        conn = await asyncpg.connect(connection_url)
        # Check if DB exists
        exists = await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = 'mans_inventory'")
        if not exists:
            # We must use a connection that is not in a transaction for CREATE DATABASE
            # asyncpg connections are usually not in a transaction unless specified
            await conn.execute("CREATE DATABASE mans_inventory")
            print("Database 'mans_inventory' created successfully.")
        else:
            print("Database 'mans_inventory' already exists.")
        await conn.close()
    except Exception as e:
        print(f"Error creating database: {e}")

if __name__ == "__main__":
    asyncio.run(create_db())
