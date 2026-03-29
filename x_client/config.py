"""
Configuration management module for X API client.

This module handles loading, saving, and managing configuration settings
including authentication tokens, proxy settings, and other client options.
"""
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, Dict, Any


@dataclass
class XConfig:
    """
    Configuration dataclass for X API client.
    
    Attributes:
        auth_token: Twitter authentication token
        ct0: CSRF token for Twitter API
        proxy: Optional proxy URL (e.g., "http://127.0.0.1:10810")
        timeout: Request timeout in seconds
        max_retries: Maximum number of retries for failed requests
        retry_delay: Delay between retries in seconds
        rate_limit_delay: Delay between requests to respect rate limits
    """
    auth_token: str = ""
    ct0: str = ""
    proxy: Optional[str] = None
    timeout: int = 60
    max_retries: int = 3
    retry_delay: float = 1.0
    rate_limit_delay: float = 0.5
    
    def __post_init__(self):
        """Validate configuration after initialization."""
        if not self.auth_token:
            raise ValueError("auth_token is required")
        if not self.ct0:
            raise ValueError("ct0 is required")
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "XConfig":
        """Create XConfig from a dictionary."""
        return cls(
            auth_token=data.get("auth_token", ""),
            ct0=data.get("ct0", ""),
            proxy=data.get("proxy"),
            timeout=data.get("timeout", 60),
            max_retries=data.get("max_retries", 3),
            retry_delay=data.get("retry_delay", 1.0),
            rate_limit_delay=data.get("rate_limit_delay", 0.5),
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert XConfig to a dictionary."""
        return {
            "auth_token": self.auth_token,
            "ct0": self.ct0,
            "proxy": self.proxy,
            "timeout": self.timeout,
            "max_retries": self.max_retries,
            "retry_delay": self.retry_delay,
            "rate_limit_delay": self.rate_limit_delay,
        }


class ConfigManager:
    """
    Manager for loading and saving X client configuration.
    
    This class provides methods to load configuration from files
    and environment variables, as well as save configuration to files.
    """
    
    DEFAULT_CONFIG_FILENAME = "config.json"
    
    def __init__(self, config_path: Optional[Path] = None):
        """
        Initialize ConfigManager.
        
        Args:
            config_path: Optional path to configuration file.
                        If not provided, uses default location.
        """
        if config_path:
            self.config_path = config_path
        else:
            self.config_path = Path.cwd() / self.DEFAULT_CONFIG_FILENAME
    
    def load(self) -> XConfig:
        """
        Load configuration from file.
        
        Returns:
            XConfig instance with loaded settings
            
        Raises:
            FileNotFoundError: If config file doesn't exist
            ValueError: If required fields are missing
        """
        if not self.config_path.exists():
            raise FileNotFoundError(f"Config file not found: {self.config_path}")
        
        with open(self.config_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        return XConfig.from_dict(data)
    
    def load_or_create(self, **defaults) -> XConfig:
        """
        Load configuration or create with defaults if not exists.
        
        Args:
            **defaults: Default values for configuration
            
        Returns:
            XConfig instance
        """
        try:
            return self.load()
        except FileNotFoundError:
            if "auth_token" in defaults and "ct0" in defaults:
                config = XConfig.from_dict(defaults)
                self.save(config)
                return config
            raise ValueError("Config file not found and no defaults provided")
    
    def save(self, config: XConfig) -> None:
        """
        Save configuration to file.
        
        Args:
            config: XConfig instance to save
        """
        self.config_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.config_path, "w", encoding="utf-8") as f:
            json.dump(config.to_dict(), f, indent=2, ensure_ascii=False)
    
    @staticmethod
    def get_default_config_path() -> Path:
        """Get the default configuration file path."""
        return Path.cwd() / ConfigManager.DEFAULT_CONFIG_FILENAME
