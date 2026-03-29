"""
Tweet parser module for X API responses.

This module provides parsers for tweet-related API responses.
"""
from typing import Dict, Any, List, Tuple

from ..models import Tweet
from .base import BaseParser, TimelineParser


class TweetParser(BaseParser):
    """
    Parser for tweet-related API responses.
    """
    
    def parse(self, data: Dict[str, Any]) -> List[Tweet]:
        """
        Parse tweet API response.
        
        Args:
            data: API response data (entry object)
            
        Returns:
            List of Tweet objects
        """
        return self.parse_tweets_from_entry(data)
    
    @staticmethod
    def parse_tweet_result(tweet_results: Dict) -> Tweet:
        """
        Parse a tweet result object.
        
        Args:
            tweet_results: Tweet results dictionary
            
        Returns:
            Tweet object or None
        """
        result = tweet_results.get("result", {})
        if not result:
            return None
        
        return Tweet.from_dict(tweet_results)
    
    def parse_tweets_from_entry(self, entry: Dict) -> List[Tweet]:
        """
        Parse tweets from a timeline entry.
        
        Args:
            entry: Entry object
            
        Returns:
            List of Tweet objects
        """
        content = entry.get("content", {})
        entry_type = content.get("entryType", "")
        
        tweets = []
        
        if entry_type == "TimelineTimelineItem":
            item_content = content.get("itemContent", {})
            tweet_results = item_content.get("tweet_results", {})
            if tweet_results:
                tweet = self.parse_tweet_result(tweet_results)
                if tweet:
                    tweets.append(tweet)
        
        elif entry_type == "TimelineTimelineModule":
            items = content.get("items", [])
            for item in items:
                item_content = item.get("item", {}).get("itemContent", {})
                tweet_results = item_content.get("tweet_results", {})
                if tweet_results:
                    tweet = self.parse_tweet_result(tweet_results)
                    if tweet:
                        tweets.append(tweet)
        
        return tweets


class TweetTimelineParser(TimelineParser):
    """
    Parser for tweet timeline responses.
    """
    
    def __init__(self):
        super().__init__()
        self.tweet_parser = TweetParser()
    
    def parse_tweets(self, data: Dict[str, Any]) -> Tuple[List[Tweet], str]:
        """
        Parse timeline response to extract tweets.
        
        Args:
            data: API response data
            
        Returns:
            Tuple of (list of Tweet objects, next cursor)
        """
        instructions = self.get_instructions(data)
        entries = self.get_entries(instructions)
        
        tweets = []
        for entry in entries:
            # Skip cursor entries
            if entry.get("content", {}).get("entryType") == "TimelineTimelineCursor":
                continue
            
            entry_tweets = self.tweet_parser.parse_tweets_from_entry(entry)
            tweets.extend(entry_tweets)
        
        next_cursor = self.get_next_cursor(entries)
        return tweets, next_cursor
    
    def parse(self, data: Dict[str, Any]) -> tuple:
        """Override to return tweets instead of raw contents."""
        return self.parse_tweets(data)
