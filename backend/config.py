"""
Wayfinder Backend — Configuration
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    duffel_api_token: str = ""
    duffel_api_url: str = "https://api.duffel.com"
    duffel_version: str = "v2"
    database_url: str = "sqlite:///./wayfinder.db"
    debug: bool = True
    cors_origins: str = "*"
    deepseek_api_key: str = ""
    deepseek_model: str = "deepseek-chat"
    openai_api_key: str = ""
    ai_parser_enabled: bool = True
    ai_parser_provider: str = "openrouter"
    ai_parser_model: str = "deepseek/deepseek-v4-flash"
    ai_parser_api_key: str = ""

    @property
    def duffel_headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.duffel_api_token}",
            "Content-Type": "application/json",
            "Accept-Encoding": "gzip",
            "Duffel-Version": self.duffel_version,
        }

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # Allow extra env vars without error


settings = Settings()
