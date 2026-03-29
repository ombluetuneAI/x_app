"""
User parser module for X API responses.

This module provides parsers for user-related API responses.
"""
from typing import Dict, Any, List, Optional

from ..models import User
from .base import BaseParser, TimelineParser


class UserParser(BaseParser):
    """
    Parser for user-related API responses.
    """
    
    def parse(self, data: Dict[str, Any]) -> Optional[User]:
        """
        Parse user API response.
        
        Args:
            data: API response data
            
        Returns:
            User object or None
        """
        return self.parse_user_by_screen_name(data)
    
    @staticmethod
    def parse_user_result(user_results: Dict) -> Optional[User]:
        """
        Parse a user result object.
        
        Args:
            user_results: User results dictionary
            
        Returns:
            User object or None if user unavailable
        """
        result = user_results.get("result", {})
        
        if result.get("__typename") == "UserUnavailable":
            return None
        
        return User.from_dict(user_results)
    
    def parse_user_by_screen_name(self, data: Dict[str, Any]) -> Optional[User]:
        """
        Parse UserByScreenName API response.
        
        Args:
            data: API response data
            
        Returns:
            User object or None
        """
        try:
            user_results = data["data"]["user"]
            return self.parse_user_result(user_results)
        except (KeyError, TypeError):
            return None


class UserTimelineParser(TimelineParser):
    """
    Parser for user timeline responses (following, list members).
    """
    
    def parse_users(self, data: Dict[str, Any]) -> tuple:
        """
        Parse timeline response to extract users.
        
        Args:
            data: API response data
            
        Returns:
            Tuple of (list of User objects, next cursor)
        """
        # Call parent class parse method to get item contents
        item_contents, next_cursor = TimelineParser.parse(self, data)
        
        users = []
        for item in item_contents:
            user_results = item.get("user_results", {})
            if user_results:
                user = UserParser.parse_user_result(user_results)
                if user:
                    users.append(user)
        
        return users, next_cursor
    
    def parse(self, data: Dict[str, Any]) -> tuple:
        """Override to return users instead of raw contents."""
        return self.parse_users(data)
