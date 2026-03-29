"""
Media parser module for X API responses.

This module provides parsers for media-related API responses.
"""
from typing import Dict, Any, List, Tuple

from ..models import Tweet, Media
from .base import TimelineParser


class MediaParser(TimelineParser):
    """
    Parser for media timeline responses (UserMedia API).
    """
    
    def parse_media_items(self, data: Dict[str, Any]) -> Tuple[List[Dict], str]:
        """
        Parse timeline response to extract media items.
        
        This method handles the special structure of UserMedia responses
        which may have TimelineTimelineModule or TimelineAddToModule entries.
        
        Args:
            data: API response data
            
        Returns:
            Tuple of (list of media item dicts, next cursor)
        """
        try:
            user_result = data["data"]["user"]["result"]
            timeline = user_result.get("timeline_v2") or user_result.get("timeline")
            if not timeline:
                return [], ""
            
            instructions = timeline.get("timeline", {}).get("instructions", [])
            
            all_entries = []
            item_contents = []
            
            for inst in instructions:
                inst_type = inst.get("type", "")
                
                if inst_type == "TimelineAddEntries":
                    entries = inst.get("entries", [])
                    all_entries.extend(entries)
                    
                    for entry in entries:
                        content = entry.get("content", {})
                        entry_type = content.get("entryType", "")
                        
                        if entry_type == "TimelineTimelineModule":
                            items = content.get("items", [])
                            # Extract itemContent from each item
                            for item in items:
                                item_content = item.get("item", {}).get("itemContent", {})
                                if item_content:
                                    item_contents.append(item_content)
                
                elif inst_type == "TimelineAddToModule":
                    module_items = inst.get("moduleItems", [])
                    for item in module_items:
                        item_content = item.get("item", {}).get("itemContent", {})
                        if item_content:
                            item_contents.append(item_content)
            
            next_cursor = self.get_next_cursor(all_entries)
            return item_contents, next_cursor
            
        except (KeyError, TypeError):
            return [], ""
    
    def parse_media_tweets(self, data: Dict[str, Any]) -> Tuple[List[Tweet], str]:
        """
        Parse timeline response to extract tweets with media.
        
        Args:
            data: API response data
            
        Returns:
            Tuple of (list of Tweet objects with media, next cursor)
        """
        item_contents, next_cursor = self.parse_media_items(data)
        
        tweets = []
        for item_content in item_contents:
            tweet_results = item_content.get("tweet_results", {})
            if not tweet_results:
                continue
            
            result = tweet_results.get("result", {})
            if not result:
                continue
            
            legacy = result.get("legacy", {})
            
            # Check if tweet has media
            media_list = legacy.get("extended_entities", {}).get("media", [])
            if not media_list:
                continue
            
            # Parse the tweet
            tweet = Tweet.from_dict(tweet_results)
            if tweet and tweet.media:
                tweets.append(tweet)
        
        return tweets, next_cursor
    
    def parse(self, data: Dict[str, Any]) -> tuple:
        """Override to return media tweets."""
        return self.parse_media_tweets(data)
