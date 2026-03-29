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
        get_user_media: Get media tweets from a user
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
        Get media tweets from a user's media timeline.
        
        Args:
            user_id: User ID
            count: Number of tweets per page (default 100)
            max_pages: Maximum number of pages to fetch (None for all)
            cursor: Pagination cursor for continuing from previous request
            
        Returns:
            Tuple of (List of Tweet objects with media attachments, next cursor)
            
        Example:
            >>> media, cursor = client.media.get_user_media("123456789")
            >>> for tweet in media:
            ...     for m in tweet.media:
            ...         print(f"{m.type}: {m.url}")
        """
        all_tweets = []
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
            tweets, next_cursor = self._parser.parse_media_tweets(data)
            
            all_tweets.extend(tweets)
            page += 1
            
            if not next_cursor or next_cursor.startswith("0|"):
                break
            
            cursor = next_cursor
        
        return all_tweets, next_cursor
