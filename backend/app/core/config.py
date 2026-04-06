from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Mans Luxury Empire"
    DATABASE_URL: str = "postgresql+asyncpg://postgres:Abberh113@localhost:5432/mans_inventory"
    SECRET_KEY: str = "mans-luxury-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # Email Settings (for notifications)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = "mansluxurystore@gmail.com"
    SMTP_PASS: str = "wwmg axea huqx lali"
    EMAILS_FROM_EMAIL: str = "Mans Luxury Empire <mansluxurystore@gmail.com>"
    
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://manspos.netlify.app",
        "https://mansluxury.netlify.app",
    ]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
