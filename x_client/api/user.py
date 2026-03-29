"""
User API module for X API client.

This module provides API methods for user-related operations.
"""
from typing import Dict, Any, Optional, List

from ..constants import APIEndpoints, Features
from ..models import User
from ..parsers import UserParser, UserTimelineParser
from .base import BaseAPI


class UserAPI(BaseAPI):
    """
    API methods for user-related operations.
    
    Methods:
        get_user_by_screen_name: Get user by screen name
        get_following: Get users that a user is following
    """
    
    def __init__(self, http_client):
        super().__init__(http_client)
        self._user_parser = UserParser()
        self._timeline_parser = UserTimelineParser()
    
    def get_user_by_screen_name(self, screen_name: str) -> Optional[User]:
        """
        Get user information by screen name.
        
        Args:
            screen_name: Twitter screen name (without @)
            
        Returns:
            User object or None if not found
            
        Example:
            >>> user = client.user.get_user_by_screen_name("elonmusk")
            >>> print(user.name)
            Elon Musk
        """
        variables = {
            "screen_name": screen_name,
            "withSafetyModeUserFields": True
        }
        
        params = self._build_params(
            variables=variables,
            features=Features.USER_BY_SCREEN_NAME,
            field_toggles=Features.FIELD_TOGGLES_USER_LABELS
        )
        
        data = self._get(APIEndpoints.USER_BY_SCREEN_NAME, params)
        return self._user_parser.parse_user_by_screen_name(data)
    
    def get_following(
        self,
        user_id: str,
        count: int = 200,
        max_pages: Optional[int] = None
    ) -> List[User]:
        """
        Get users that a user is following.
        
        Args:
            user_id: User ID
            count: Number of users per page (max 200)
            max_pages: Maximum number of pages to fetch (None for all)
            
        Returns:
            List of User objects
            
        Example:
            >>> following = client.user.get_following("123456789")
            >>> for user in following:
            ...     print(f"@{user.screen_name}")
        """
        all_users = []
        cursor = ""
        page = 0
        
        while True:
            if max_pages and page >= max_pages:
                break
            
            variables = {
                "userId": str(user_id),
                "count": count,
                "includePromotedContent": False,
                "cursor": cursor,
            }
            
            params = self._build_params(
                variables=variables,
                features=Features.FOLLOWING
            )
            
            data = self._get(APIEndpoints.FOLLOWING, params)
            users, next_cursor = self._timeline_parser.parse_users(data)
            
            all_users.extend(users)
            page += 1
            
            if not next_cursor or next_cursor.startswith("0|"):
                break
            
            cursor = next_cursor
        
        return all_users
