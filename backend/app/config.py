from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    app_name: str = "NexusOC API"
    debug: bool = False
    log_level: str = "INFO"

    database_url: str = "postgresql+asyncpg://nexusoc:nexusoc@localhost:5432/nexusoc"
    redis_url: str = "redis://localhost:6379/0"

    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4-turbo-preview"

    storage_dir: str = "/data/storage"
    max_file_size_mb: int = 50
    allowed_extensions: str = ".py,.js,.ts,.tsx,.jsx,.json,.yml,.yaml,.md,.txt,.html,.css,.scss,.sql,.sh,.toml,.ini,.cfg,.env,.rb,.go,.rs,.java,.kt,.swift,.c,.cpp,.h,.hpp,.cs,.php,.r,.lua,.zig,.svelte,.vue,.astro"

    cors_origins: str = "https://ai.xus.me,http://localhost:3000"

    model_config = {"env_file": "../.env", "env_file_encoding": "utf-8", "case_sensitive": False}


settings = Settings()
