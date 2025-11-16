from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Inventory Forecasting App"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str
    
    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # File Upload
    UPLOAD_DIR: str = "app/temp"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    
    # ML Model
    MODEL_PATH: str = "DemandForecast/forecast_model.json"
    
    # Stock Calculations
    LEAD_TIME_WEEKS: int = 2
    SAFETY_STOCK: int = 10
    BUFFER_PERCENTAGE: float = 0.20
    EXPIRY_ALERT_DAYS: int = 30
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()