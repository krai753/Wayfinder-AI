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


settings = Settings()
