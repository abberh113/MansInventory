from sqlmodel import create_engine, Session, SQLModel, select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# For SQLModel, use the sync engine for simple cases or async for better performance
# Since requirements has sqlalchemy[asyncio], let's use async

engine = create_async_engine(
    settings.DATABASE_URL, 
    echo=True, 
    future=True, 
    connect_args={"statement_cache_size": 0}
)

async_session = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def init_db():
    async with engine.begin() as conn:
        # await conn.run_sync(SQLModel.metadata.drop_all)
        await conn.run_sync(SQLModel.metadata.create_all)

async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session
