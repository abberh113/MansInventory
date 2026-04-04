import asyncio
from sqlalchemy.sql import text
from app.db.session import engine

async def check_users():
    async with engine.connect() as conn:
        result = await conn.execute(text('SELECT email, role, is_active, is_confirmed FROM "user"'))
        users = result.all()
        print("\n--- User Database Check ---")
        for user in users:
            print(f"Email: {user.email} | Role: {user.role} | Active: {user.is_active} | Confirmed: {user.is_confirmed}")
        print("---------------------------\n")

if __name__ == "__main__":
    asyncio.run(check_users())
