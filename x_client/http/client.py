"""
HTTP client module for X API requests.

This module provides a robust HTTP client with features like:
- Session management
- Authentication handling
- Proxy support
- Retry logic
- Rate limiting
- Error handling
"""
import json
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional, Union

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from ..constants import BEARER_TOKEN


class XAPIError(Exception):
    """Base exception for X API errors."""
    pass


class HTTPError(XAPIError):
    """Exception raised for HTTP errors."""
    
    def __init__(self, status_code: int, message: str, response: Optional[dict] = None):
        self.status_code = status_code
        self.message = message
        self.response = response
        super().__init__(f"HTTP {status_code}: {message}")


class RateLimitError(XAPIError):
    """Exception raised when rate limit is exceeded."""
    
    def __init__(self, retry_after: Optional[int] = None):
        self.retry_after = retry_after
        message = f"Rate limit exceeded"
        if retry_after:
            message += f", retry after {retry_after} seconds"
        super().__init__(message)


@dataclass
class Response:
    """
    HTTP response wrapper.
    
    Attributes:
        status_code: HTTP status code
        data: Response body as dictionary (for JSON responses)
        raw: Raw response object
    """
    status_code: int
    data: Dict[str, Any]
    raw: requests.Response
    
    def is_success(self) -> bool:
        """Check if response indicates success (2xx status code)."""
        return 200 <= self.status_code < 300


class HTTPClient:
    """
    HTTP client for making authenticated requests to X API.
    
    This client handles:
    - Authentication with bearer token and cookies
    - Proxy configuration
    - Automatic retries with exponential backoff
    - Rate limiting protection
    - Request/response logging
    
    Example:
        >>> from x_client import XConfig, HTTPClient
        >>> config = XConfig(auth_token="...", ct0="...")
        >>> client = HTTPClient(config)
        >>> response = client.get("/i/api/graphql/...")
    """
    
    DEFAULT_HEADERS = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Origin": "https://x.com",
        "Referer": "https://x.com/",
        "X-Twitter-Active-User": "yes",
        "X-Twitter-Auth-Type": "OAuth2Session",
        "X-Twitter-Client-Language": "en",
    }
    
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
        Initialize HTTP client.
        
        Args:
            auth_token: Twitter authentication token
            ct0: CSRF token
            proxy: Optional proxy URL
            timeout: Request timeout in seconds
            max_retries: Maximum retry attempts
            retry_delay: Base delay between retries
            rate_limit_delay: Delay between requests
        """
        self.auth_token = auth_token
        self.ct0 = ct0
        self.proxy = proxy
        self.timeout = timeout
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.rate_limit_delay = rate_limit_delay
        
        self._session: Optional[requests.Session] = None
        self._last_request_time: float = 0
    
    @classmethod
    def from_config(cls, config) -> "HTTPClient":
        """
        Create HTTPClient from XConfig instance.
        
        Args:
            config: XConfig instance
            
        Returns:
            HTTPClient instance
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
    
    def _create_session(self) -> requests.Session:
        """Create and configure a requests session."""
        session = requests.Session()
        
        # Set headers
        headers = self.DEFAULT_HEADERS.copy()
        headers["Authorization"] = f"Bearer {BEARER_TOKEN}"
        headers["X-Csrf-Token"] = self.ct0
        session.headers.update(headers)
        
        # Set cookies
        session.cookies.set("auth_token", self.auth_token, domain=".x.com")
        session.cookies.set("ct0", self.ct0, domain=".x.com")
        
        # Configure proxy
        if self.proxy:
            session.proxies = {
                "http": self.proxy,
                "https": self.proxy,
            }
        
        # Configure retry strategy
        retry_strategy = Retry(
            total=self.max_retries,
            backoff_factor=self.retry_delay,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        
        return session
    
    @property
    def session(self) -> requests.Session:
        """Get or create the requests session."""
        if self._session is None:
            self._session = self._create_session()
        return self._session
    
    def _enforce_rate_limit(self) -> None:
        """Enforce rate limiting between requests."""
        elapsed = time.time() - self._last_request_time
        if elapsed < self.rate_limit_delay:
            time.sleep(self.rate_limit_delay - elapsed)
    
    def _make_request(
        self,
        method: str,
        url: str,
        **kwargs
    ) -> Response:
        """
        Make an HTTP request with retry logic.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            url: Request URL
            **kwargs: Additional request arguments (headers, json, data, params, etc.)
            
        Returns:
            Response object
            
        Raises:
            HTTPError: If request fails after retries
            RateLimitError: If rate limited
        """
        self._enforce_rate_limit()
        
        # Set timeout if not provided
        kwargs.setdefault("timeout", self.timeout)
        
        # Merge custom headers with defaults
        if "headers" in kwargs:
            headers = {**self.DEFAULT_HEADERS, **kwargs["headers"]}
            kwargs["headers"] = headers
        else:
            kwargs.setdefault("headers", self.DEFAULT_HEADERS)
        
        # If sending form data (not JSON), remove Content-Type to let requests auto-set it
        if "data" in kwargs and kwargs["data"] is not None:
            if "json" not in kwargs or kwargs["json"] is None:
                # Remove Content-Type header so requests can auto-set it for form data
                kwargs["headers"] = {k: v for k, v in kwargs["headers"].items() if k.lower() != 'content-type'}
                # Also need to explicitly set it to None to override session's Content-Type
                kwargs["headers"]["Content-Type"] = None
        
        last_error = None
        
        for attempt in range(self.max_retries + 1):
            try:
                self._last_request_time = time.time()
                
                resp = self.session.request(method, url, **kwargs)
                
                # Handle rate limiting
                if resp.status_code == 429:
                    retry_after = resp.headers.get("Retry-After")
                    retry_after = int(retry_after) if retry_after else None
                    raise RateLimitError(retry_after)
                
                # Parse JSON response
                try:
                    data = resp.json()
                except json.JSONDecodeError:
                    data = {"raw_text": resp.text}
                
                # Handle HTTP errors
                if not resp.ok:
                    raise HTTPError(
                        status_code=resp.status_code,
                        message=resp.text[:500] if resp.text else "Unknown error",
                        response=data
                    )
                
                return Response(
                    status_code=resp.status_code,
                    data=data,
                    raw=resp
                )
                
            except (RateLimitError, HTTPError):
                raise
            except requests.RequestException as e:
                last_error = e
                if attempt < self.max_retries:
                    wait_time = self.retry_delay * (2 ** attempt)
                    time.sleep(wait_time)
        
        raise HTTPError(
            status_code=0,
            message=f"Request failed after {self.max_retries} retries: {last_error}"
        )
    
    def get(
        self,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        base_url: str = "https://x.com"
    ) -> Response:
        """
        Make a GET request.
        
        Args:
            path: API endpoint path
            params: Query parameters
            base_url: Base URL (default: https://x.com)
            
        Returns:
            Response object
        """
        url = f"{base_url}{path}"
        return self._make_request("GET", url, params=params)
    
    def post(
        self,
        path: str,
        json_data: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, str]] = None,
        base_url: str = "https://x.com"
    ) -> Response:
        """
        Make a POST request.
        
        Args:
            path: API endpoint path
            json_data: JSON body
            data: Form data (will be encoded as application/x-www-form-urlencoded)
            params: Query parameters
            base_url: Base URL (default: https://x.com)
            
        Returns:
            Response object
        """
        url = f"{base_url}{path}"
        
        # No need to set custom headers - _make_request will handle Content-Type for form data
        return self._make_request("POST", url, json=json_data, data=data, params=params)
    
    def close(self) -> None:
        """Close the session."""
        if self._session:
            self._session.close()
            self._session = None
    
    def __enter__(self) -> "HTTPClient":
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        """Context manager exit."""
        self.close()
