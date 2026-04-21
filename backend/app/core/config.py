from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Mans Luxury Empire"
    DATABASE_URL: str = ""
    SECRET_KEY: str = "your-secret-key-for-local-dev"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # Supabase Storage Settings
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    
    # Email Settings (for notifications)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = "mansluxurystore@gmail.com"
    SMTP_PASS: str = ""
    EMAILS_FROM_EMAIL: str = "Mans Luxury Empire <mansluxurystore@gmail.com>"
    
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://manspos.netlify.app",
        "https://mansluxury.netlify.app",
        "https://mansinventory.netlify.app",
    ]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
