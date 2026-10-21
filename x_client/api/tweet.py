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
        get_home_timeline: Get home timeline tweets (For You or Following)
    """
    
    def __init__(self, http_client):
        super().__init__(http_client)
        self._parser = TweetTimelineParser()
    
    def get_home_timeline(
        self,
        count: int = 20,
        include_promoted_content: bool = True,
        latest: bool = False,
        max_pages: Optional[int] = None,
        cursor: str = ""
    ) -> tuple:
        """
        Get home timeline tweets.
        
        Args:
            count: Number of tweets per page (default 20, max 200)
            include_promoted_content: Whether to include promoted content
            latest: If True, get Following feed (chronological); 
                    if False, get For You feed (algorithmic)
            max_pages: Maximum number of pages to fetch (None for all)
            cursor: Pagination cursor for continuing from previous request
            
        Returns:
            Tuple of (List of Tweet objects, next cursor)
        """
        all_tweets = []
        next_cursor = cursor
        page = 0
        
        while True:
            if max_pages and page >= max_pages:
                break
            
            variables = {
                "count": count,
                "includePromotedContent": include_promoted_content,
                "latestControlAvailable": True,
                "requestContext": "launch",
                "withVoice": True,
            }
            
            if next_cursor:
                variables["cursor"] = next_cursor
            
            if latest:
                endpoint = APIEndpoints.HOME_LATEST_TIMELINE
                features = Features.HOME_LATEST_TIMELINE
            else:
                endpoint = APIEndpoints.HOME_TIMELINE
                features = Features.HOME_TIMELINE
            
            params = self._build_params(
                variables=variables,
                features=features,
                field_toggles=Features.FIELD_TOGGLES_WITH_ARTICLE
            )
            
            data = self._get(endpoint, params)
            tweets, next_cursor = self._parser.parse_tweets(data)
            
            all_tweets.extend(tweets)
            page += 1
            
            if not next_cursor or next_cursor.startswith("0|"):
                break
            
            cursor = next_cursor
        
        return all_tweets, next_cursor
    
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

    def get_tweet_detail(self, tweet_id: str, cursor: str = "") -> tuple:
        """
        Get a tweet thread (ancestors, focal tweet, replies).

        Returns:
            Tuple of (focal Tweet, ancestor list, reply list, next cursor)
        """
        variables = {
            "focalTweetId": str(tweet_id),
            "referrer": "profile",
            "with_rux_injections": False,
            "rankingMode": "Relevance",
            "includePromotedContent": True,
            "withCommunity": True,
        }
        if cursor:
            variables["cursor"] = cursor

        params = self._build_params(
            variables=variables,
            features=Features.TWEET_DETAIL,
            field_toggles=Features.FIELD_TOGGLES_WITH_ARTICLE,
        )
        data = self._get(APIEndpoints.TWEET_DETAIL, params)
        return self._parser.parse_tweet_detail(data, tweet_id)
