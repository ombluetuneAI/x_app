"""
List API module for X API client.

This module provides API methods for Twitter list-related operations.
"""
from typing import List, Optional

from ..constants import APIEndpoints, Features
from ..models import XList, User
from ..parsers import UserParser, UserTimelineParser
from .base import BaseAPI


class ListAPI(BaseAPI):
    """
    API methods for Twitter list-related operations.
    
    Methods:
        get_list: Get list information
        get_list_members: Get members of a list
    """
    
    def __init__(self, http_client):
        super().__init__(http_client)
        self._user_parser = UserParser()
        self._timeline_parser = UserTimelineParser()
    
    def get_list(self, list_id: str) -> Optional[XList]:
        """
        Get list information by ID.
        
        Args:
            list_id: Twitter list ID
            
        Returns:
            XList object or None if not found
            
        Example:
            >>> lst = client.list.get_list("123456789")
            >>> print(f"{lst.name} by @{lst.creator.screen_name}")
        """
        variables = {"listId": str(list_id)}
        
        params = self._build_params(
            variables=variables,
            features=Features.LIST_BY_REST_ID
        )
        
        data = self._get(APIEndpoints.LIST_BY_REST_ID, params)
        
        try:
            list_data = data.get("data", {}).get("list", {})
            if not list_data:
                return None
            
            # Parse creator
            creator = None
            user_results = list_data.get("user_results", {})
            if user_results:
                creator = self._user_parser.parse_user_result(user_results)
            
            return XList(
                id=str(list_data.get("id_str", "")),
                name=list_data.get("name", ""),
                description=list_data.get("description", ""),
                member_count=list_data.get("member_count", 0),
                subscriber_count=list_data.get("subscriber_count", 0),
                is_private=list_data.get("is_private", False),
                created_at=list_data.get("created_at", ""),
                creator=creator,
            )
        except (KeyError, TypeError):
            return None
    
    def get_list_members(
        self,
        list_id: str,
        count: int = 200,
        max_pages: Optional[int] = None
    ) -> List[User]:
        """
        Get members of a Twitter list.
        
        Args:
            list_id: Twitter list ID
            count: Number of members per page (max 200)
            max_pages: Maximum number of pages to fetch (None for all)
            
        Returns:
            List of User objects
            
        Example:
            >>> members = client.list.get_list_members("123456789")
            >>> for user in members:
            ...     print(f"@{user.screen_name}")
        """
        all_users = []
        cursor = ""
        page = 0
        
        while True:
            if max_pages and page >= max_pages:
                break
            
            variables = {
                "listId": str(list_id),
                "count": count,
                "withSafetyModeUserFields": True,
                "cursor": cursor,
            }
            
            params = self._build_params(
                variables=variables,
                features=Features.LIST_MEMBERS
            )
            
            data = self._get(APIEndpoints.LIST_MEMBERS, params)
            users, next_cursor = self._timeline_parser.parse_users(data)
            
            all_users.extend(users)
            page += 1
            
            if not next_cursor or next_cursor.startswith("0|"):
                break
            
            cursor = next_cursor
        
        return all_users
