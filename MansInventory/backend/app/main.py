from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from app.api.v1 import auth, users, inventory, audit
from app.db.session import init_db, engine
from app.core.config import settings

import os
import asyncio
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

# Ensure uploads directory exists at startup
os.makedirs("uploads/products", exist_ok=True)

async def run_migrations():
    """Run DB migrations separately so they don't block app startup."""
    try:
        await init_db()
        async with engine.begin() as conn:
            await conn.execute(text('ALTER TABLE product ADD COLUMN IF NOT EXISTS image_path VARCHAR'))
            result = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='user' AND column_name='username'"))
            if result.first():
                print("Migrating 'username' to 'full_name'...")
                await conn.execute(text('ALTER TABLE "user" RENAME COLUMN username TO full_name'))
            await conn.execute(text('ALTER TABLE inventoryorder ADD COLUMN IF NOT EXISTS staff_email VARCHAR'))
            await conn.execute(text('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN DEFAULT FALSE'))
        print("✅ DB migrations complete.")
    except Exception as e:
        print(f"⚠️ DB migration warning (non-fatal): {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run migrations in background — don't block startup
    asyncio.create_task(run_migrations())
    yield

app = FastAPI(
    title="Mans Luxury Empire Inventory API",
    description="Backend for the premium inventory management system.",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS — must be added BEFORE any routes or other middleware
ALLOWED_ORIGINS = settings.BACKEND_CORS_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Custom exception handler to ensure CORS headers are always present on errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    origin = request.headers.get("origin", "")
    headers = {}
    if origin in ALLOWED_ORIGINS:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    
    # LOG THE ACTUAL ERROR TO THE SERVER OUTPUT (Cloud Run logs)
    print(f"❌ SERVER ERROR on {request.method} {request.url}")
    print(f"Traceback: {''.join(traceback.format_exception(None, exc, exc.__traceback__))}")
    
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error_type": type(exc).__name__},
        headers=headers,
    )

# Serve uploaded files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

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
