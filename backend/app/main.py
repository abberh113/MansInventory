from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.api.v1 import auth, users, inventory, audit
from app.db.session import init_db, engine

import os
from fastapi.staticfiles import StaticFiles

# Ensure uploads directory exists at startup
os.makedirs("uploads/products", exist_ok=True)

from sqlalchemy import text

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    # Auto-migration for image_path
    async with engine.begin() as conn:
        # Add image_path to product if missing
        await conn.execute(text('ALTER TABLE product ADD COLUMN IF NOT EXISTS image_path VARCHAR'))
        
        # Rename username to full_name in user table
        # We check if 'username' still exists to determine if we need to rename
        result = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='user' AND column_name='username'"))
        if result.first():
            print("Migrating 'username' to 'full_name'...")
            await conn.execute(text('ALTER TABLE "user" RENAME COLUMN username TO full_name'))
            
        # Add staff_email to inventoryorder
        await conn.execute(text('ALTER TABLE inventoryorder ADD COLUMN IF NOT EXISTS staff_email VARCHAR'))
        
        # Add is_confirmed to user
        await conn.execute(text('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN DEFAULT FALSE'))
    yield

app = FastAPI(
    title="Mans Luxury Empire Inventory API",
    description="Backend for the premium inventory management system.",
    version="1.0.0",
    lifespan=lifespan,
)

# Serve uploaded files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/v1/users", tags=["User Management"])
app.include_router(inventory.router, prefix="/api/v1/inventory", tags=["Inventory"])
app.include_router(audit.router, prefix="/api/v1/audit", tags=["Audit"])

@app.get("/")
async def root():
    return {"message": "Welcome to Mans Luxury Empire API"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
