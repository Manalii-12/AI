import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Hugg AI Business Operations & Intelligence Platform"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Database: Supports PostgreSQL or SQLite seamlessly
    # If postgresql:// is provided in env, it uses Postgres; otherwise falls back to SQLite
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./hugg_business.db")
    
    # Optional LLM API Keys (Groq is free, Gemini has free tier, OpenRouter has free models)
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    PERPLEXITY_API_KEY: str = os.getenv("PERPLEXITY_API_KEY", "")
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "")
    
    # Scheduler
    AI_SCAN_INTERVAL_MINUTES: int = int(os.getenv("AI_SCAN_INTERVAL_MINUTES", "15"))
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "hugg-super-secret-key-decision-intelligence-2025")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"
    ]

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
