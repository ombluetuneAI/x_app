"""
X Client - Main entry point for X (Twitter) API client.

This module provides the main XClient class that serves as the
primary interface for interacting with Twitter's GraphQL API.

Example:
    >>> from x_client import XClient, XConfig
    >>> 
    >>> # Create client from config file
    >>> client = XClient.from_config("config.json")
    >>> 
    >>> # Get user info
    >>> user = client.user.get_user_by_screen_name("elonmusk")
    >>> print(f"{user.name} (@{user.screen_name})")
    >>> 
    >>> # Get user tweets
    >>> tweets = client.tweet.get_user_tweets(user.id, max_pages=3)
    >>> for tweet in tweets[:5]:
    ...     print(tweet.text[:50])
    >>> 
    >>> # Close client when done
    >>> client.close()
"""
from pathlib import Path
from typing import Optional, Union

from .config import XConfig, ConfigManager
from .http import HTTPClient
from .api import UserAPI, TweetAPI, MediaAPI, ListAPI


class XClient:
    """
    Main client for X (Twitter) API.
    
    This class provides a unified interface for all X API operations.
    It manages the HTTP client and provides access to various API modules.
    
    Attributes:
        user: UserAPI for user-related operations
        tweet: TweetAPI for tweet-related operations
        media: MediaAPI for media-related operations
        list: ListAPI for list-related operations
    
    Example:
        >>> # Create client directly
        >>> client = XClient(
        ...     auth_token="your_token",
        ...     ct0="your_ct0",
        ...     proxy="http://127.0.0.1:10810"
        ... )
        >>> 
        >>> # Or from config file
        >>> client = XClient.from_config("config.json")
        >>> 
        >>> # Use as context manager
        >>> with XClient.from_config() as client:
        ...     user = client.user.get_user_by_screen_name("elonmusk")
    """
    
    def __init__(
        self,
        auth_token: str,
        ct0: str,
        proxy: Optional[str] = None,
        timeout: int = 60,
        max_retries: int = 3,
        retry_delay: float = 1.0,
        rate_limit_delay: float = 0.5,
    ):
        """
        Initialize X client.
        
        Args:
            auth_token: Twitter authentication token
            ct0: CSRF token
            proxy: Optional proxy URL
            timeout: Request timeout in seconds
            max_retries: Maximum retry attempts
            retry_delay: Base delay between retries
            rate_limit_delay: Delay between requests
        """
        self._http = HTTPClient(
            auth_token=auth_token,
            ct0=ct0,
            proxy=proxy,
            timeout=timeout,
            max_retries=max_retries,
            retry_delay=retry_delay,
            rate_limit_delay=rate_limit_delay,
        )
        
        # Initialize API modules
        self._user_api = UserAPI(self._http)
        self._tweet_api = TweetAPI(self._http)
        self._media_api = MediaAPI(self._http)
        self._list_api = ListAPI(self._http)
    
    @classmethod
    def from_config(cls, config_path: Optional[Union[str, Path]] = None) -> "XClient":
        """
        Create XClient from configuration file.
        
        Args:
            config_path: Path to config file. If None, uses default location.
            
        Returns:
            XClient instance
            
        Raises:
            FileNotFoundError: If config file doesn't exist
            ValueError: If required fields are missing
        """
        manager = ConfigManager(Path(config_path) if config_path else None)
        config = manager.load()
        return cls.from_config_object(config)
    
    @classmethod
    def from_config_object(cls, config: XConfig) -> "XClient":
        """
        Create XClient from XConfig object.
        
        Args:
            config: XConfig instance
            
        Returns:
            XClient instance
        """
        return cls(
            auth_token=config.auth_token,
            ct0=config.ct0,
            proxy=config.proxy,
            timeout=config.timeout,
            max_retries=config.max_retries,
            retry_delay=config.retry_delay,
            rate_limit_delay=config.rate_limit_delay,
        )
    
    @property
    def user(self) -> UserAPI:
        """Access user API methods."""
        return self._user_api
    
    @property
    def tweet(self) -> TweetAPI:
        """Access tweet API methods."""
        return self._tweet_api
    
    @property
    def media(self) -> MediaAPI:
        """Access media API methods."""
        return self._media_api
    
    @property
    def list(self) -> ListAPI:
        """Access list API methods."""
        return self._list_api
    
    def close(self) -> None:
        """Close the client and release resources."""
        self._http.close()
    
    def __enter__(self) -> "XClient":
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        """Context manager exit."""
        self.close()
