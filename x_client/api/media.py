"""
Media API module for X API client.

This module provides API methods for media-related operations.
"""
from typing import List, Optional

from ..constants import APIEndpoints, Features
from ..models import Tweet
from ..parsers import MediaParser
from .base import BaseAPI


class MediaAPI(BaseAPI):
    """
    API methods for media-related operations.
    
    Methods:
        get_user_media: Get all media from a user's media timeline
    """
    
    def __init__(self, http_client):
        super().__init__(http_client)
        self._parser = MediaParser()
    
    def get_user_media(
        self,
        user_id: str,
        count: int = 100,
        max_pages: Optional[int] = None,
        cursor: str = ""
    ) -> tuple:
        """
        Get all media from a user's media timeline.
        
        Args:
            user_id: User ID
            count: Number of tweets per page (default 100)
            max_pages: Maximum number of pages to fetch (None for all)
            cursor: Pagination cursor for continuing from previous request
            
        Returns:
            Tuple of (List of Media objects, next cursor)
            
        Example:
            >>> media, cursor = client.media.get_user_media("123456789")
            >>> for m in media:
            ...     print(f"{m.type}: {m.url}")
        """
        all_media = []
        next_cursor = cursor
        page = 0
        
        while True:
            if max_pages and page >= max_pages:
                break
            
            variables = {
                "userId": str(user_id),
                "count": count,
                "cursor": next_cursor,
                "includePromotedContent": False,
                "withClientEventToken": False,
                "withBirdwatchNotes": False,
                "withVoice": True,
                "withV2Timeline": True,
            }
            
            params = self._build_params(
                variables=variables,
                features=Features.USER_MEDIA,
                field_toggles=Features.FIELD_TOGGLES_WITH_ARTICLE
            )
            
            data = self._get(APIEndpoints.USER_MEDIA, params)
            media_list, next_cursor = self._parser.parse_media_list(data)
            
            all_media.extend(media_list)
            page += 1
            
            if not next_cursor or next_cursor.startswith("0|"):
                break
            
            cursor = next_cursor
        
        return all_media, next_cursor
