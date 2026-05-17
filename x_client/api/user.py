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
        get_user_by_screen_name: Get user by screen name (GraphQL)
        get_following: Get users that a user is following (GraphQL)
        follow_user: Follow a user (REST API v1.1)
        unfollow_user: Unfollow a user (REST API v1.1)
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
    
    def get_followers(
        self,
        user_id: str,
        count: int = 200,
        max_pages: Optional[int] = None
    ) -> List[User]:
        """
        Get users that follow a user.
        
        Uses v1.1 REST API which is more stable than GraphQL
        (no query hash rotation issues).
        
        Args:
            user_id: User ID
            count: Number of users per page (max 200)
            max_pages: Maximum number of pages to fetch (None for all)
            
        Returns:
            List of User objects
        """
        from ..models import User as UserModel
        
        all_users = []
        cursor = -1
        page = 0
        
        while True:
            if max_pages and page >= max_pages:
                break
            
            params = {
                "user_id": str(user_id),
                "count": str(count),
                "cursor": str(cursor),
                "skip_status": "true",
                "include_user_entities": "true",
            }
            
            data = self._get(APIEndpoints.FOLLOWERS, params=params)
            
            users_data = data.get("users", [])
            if not users_data:
                break
            
            for user_data in users_data:
                user = UserModel.from_v1_dict(user_data)
                if user:
                    all_users.append(user)
            
            page += 1
            
            # Get next cursor for pagination
            next_cursor = data.get("next_cursor", 0)
            if not next_cursor or next_cursor == 0:
                break
            
            cursor = next_cursor
        
        return all_users
    
    def follow_user(self, user_id: str) -> bool:
        """
        Follow a user.
        
        Args:
            user_id: User ID to follow
            
        Returns:
            True if successful
            
        Example:
            >>> success = client.user.follow_user("123456789")
        """
        # REST API v1.1 requires form data with specific parameters
        data = {
            "include_profile_interstitial_type": 1,
            "include_blocking": 1,
            "include_blocked_by": 1,
            "include_followed_by": 1,
            "include_want_retweets": 1,
            "include_mute_edge": 1,
            "include_can_dm": 1,
            "include_can_media_tag": 1,
            "include_ext_is_blue_verified": 1,
            "include_ext_verified_type": 1,
            "include_ext_profile_image_shape": 1,
            "skip_status": 1,
            "user_id": str(user_id),
        }
        
        self._post(APIEndpoints.CREATE_FRIENDSHIP, data=data)
        return True
    
    def unfollow_user(self, user_id: str) -> bool:
        """
        Unfollow a user.
        
        Args:
            user_id: User ID to unfollow
            
        Returns:
            True if successful
            
        Example:
            >>> success = client.user.unfollow_user("123456789")
        """
        # REST API v1.1 requires form data with specific parameters
        data = {
            "include_profile_interstitial_type": 1,
            "include_blocking": 1,
            "include_blocked_by": 1,
            "include_followed_by": 1,
            "include_want_retweets": 1,
            "include_mute_edge": 1,
            "include_can_dm": 1,
            "include_can_media_tag": 1,
            "include_ext_is_blue_verified": 1,
            "include_ext_verified_type": 1,
            "include_ext_profile_image_shape": 1,
            "skip_status": 1,
            "user_id": str(user_id),
        }
        
        self._post(APIEndpoints.DESTROY_FRIENDSHIP, data=data)
        return True
