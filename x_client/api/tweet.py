"""
Tweet API module for X API client.

This module provides API methods for tweet-related operations.
"""
from typing import List, Optional

from ..constants import APIEndpoints, Features
from ..models import Tweet
from ..parsers import TweetTimelineParser
from .base import BaseAPI


class TweetAPI(BaseAPI):
    """
    API methods for tweet-related operations.
    
    Methods:
        get_user_tweets: Get tweets from a user's timeline
    """
    
    def __init__(self, http_client):
        super().__init__(http_client)
        self._parser = TweetTimelineParser()
    
    def get_user_tweets(
        self,
        user_id: str,
        count: int = 20,
        include_promoted_content: bool = True,
        max_pages: Optional[int] = None,
        cursor: str = ""
    ) -> tuple:
        """
        Get tweets from a user's timeline.
        
        Args:
            user_id: User ID
            count: Number of tweets per page (default 20)
            include_promoted_content: Whether to include promoted content
            max_pages: Maximum number of pages to fetch (None for all)
            cursor: Pagination cursor for continuing from previous request
            
        Returns:
            Tuple of (List of Tweet objects, next cursor)
            
        Example:
            >>> tweets, cursor = client.tweet.get_user_tweets("123456789")
            >>> for tweet in tweets:
            ...     print(f"{tweet.text[:50]}...")
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
                "includePromotedContent": include_promoted_content,
                "withQuickPromoteEligibilityTweetFields": True,
                "withVoice": True,
            }
            
            if next_cursor:
                variables["cursor"] = next_cursor
            
            params = self._build_params(
                variables=variables,
                features=Features.USER_TWEETS,
                field_toggles=Features.FIELD_TOGGLES_WITH_ARTICLE
            )
            
            data = self._get(APIEndpoints.USER_TWEETS, params)
            tweets, next_cursor = self._parser.parse_tweets(data)
            
            all_tweets.extend(tweets)
            page += 1
            
            if not next_cursor or next_cursor.startswith("0|"):
                break
            
            cursor = next_cursor
        
        return all_tweets, next_cursor
