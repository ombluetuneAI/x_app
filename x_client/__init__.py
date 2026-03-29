"""
X Client Library - A well-structured Python client for X (Twitter) GraphQL API.

This library provides a clean, modular interface for interacting with
Twitter's GraphQL API, with proper separation of concerns:

- **Configuration**: Manage authentication and settings
- **HTTP Client**: Handle requests with retry and rate limiting
- **Models**: Type-safe data structures
- **Parsers**: Transform API responses into models
- **API Modules**: Organized API methods by domain

Quick Start:
    >>> from x_client import XClient
    >>> 
    >>> # Create client from config file
    >>> with XClient.from_config("config.json") as client:
    ...     user = client.user.get_user_by_screen_name("elonmusk")
    ...     print(f"Found: {user.name} (@{user.screen_name})")
    ...     
    ...     # Get user's recent tweets
    ...     tweets = client.tweet.get_user_tweets(user.id, max_pages=2)
    ...     for tweet in tweets[:5]:
    ...         print(f"- {tweet.text[:50]}...")

Configuration (config.json):
    {
        "auth_token": "your_auth_token",
        "ct0": "your_ct0_token",
        "proxy": "http://127.0.0.1:10810"
    }

Features:
    - Clean separation of HTTP, parsing, and API layers
    - Automatic pagination handling
    - Retry logic with exponential backoff
    - Rate limiting protection
    - Type-safe data models
    - Context manager support
"""

# Core classes
from .config import XConfig, ConfigManager
from .client import XClient

# HTTP layer
from .http import HTTPClient, HTTPError, RateLimitError, XAPIError

# Models
from .models import User, UserStats, Tweet, TweetStats, Media, XList

# API modules
from .api import UserAPI, TweetAPI, MediaAPI, ListAPI

# Parsers
from .parsers import (
    BaseParser,
    TimelineParser,
    UserParser,
    TweetParser,
    MediaParser,
)

# Constants
from .constants import BEARER_TOKEN, APIEndpoints, Features

__version__ = "1.0.0"
__author__ = "X Client Team"

__all__ = [
    # Main client
    "XClient",
    
    # Configuration
    "XConfig",
    "ConfigManager",
    
    # HTTP
    "HTTPClient",
    "HTTPError",
    "RateLimitError",
    "XAPIError",
    
    # Models
    "User",
    "UserStats",
    "Tweet",
    "TweetStats",
    "Media",
    "XList",
    
    # API modules
    "UserAPI",
    "TweetAPI",
    "MediaAPI",
    "ListAPI",
    
    # Parsers
    "BaseParser",
    "TimelineParser",
    "UserParser",
    "TweetParser",
    "MediaParser",
    
    # Constants
    "BEARER_TOKEN",
    "APIEndpoints",
    "Features",
]
