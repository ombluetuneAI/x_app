"""
Media parser module for X API responses.

This module provides parsers for media-related API responses.
"""
from typing import Dict, Any, List, Tuple

from ..models import Media
from ..models.tweet import Tweet
from .base import TimelineParser


class MediaParser(TimelineParser):
    """
    Parser for media timeline responses (UserMedia API).
    """

    @staticmethod
    def _media_entities_from_legacy(legacy: Dict[str, Any]) -> List[Dict]:
        if not legacy:
            return []
        extended = legacy.get("extended_entities", {}).get("media", [])
        if extended:
            return extended
        return legacy.get("entities", {}).get("media", [])

    def _media_from_tweet_results(self, tweet_results: Dict[str, Any]) -> List[Media]:
        """Match JS mediaFromTweetResults: outer then inner legacy, then retweet fallback."""
        result = tweet_results.get("result", tweet_results)
        if not result or result.get("__typename") == "TweetTombstone":
            return []

        candidates = []
        if result.get("legacy"):
            candidates.append((result, result["legacy"]))
        inner = result.get("tweet") or {}
        if inner.get("legacy"):
            candidates.append((inner, inner["legacy"]))

        for node, legacy in candidates:
            media_list = self._media_entities_from_legacy(legacy)
            if not media_list:
                continue
            tweet_id = str(node.get("rest_id", "") or legacy.get("id_str", ""))
            tweet_text = legacy.get("full_text", "") or legacy.get("text", "")
            out: List[Media] = []
            for media_data in media_list:
                row = dict(media_data)
                row["tweet_id"] = tweet_id
                row["tweet_text"] = tweet_text
                out.append(Media.from_dict(row))
            return out

        try:
            tweet = Tweet.from_dict(tweet_results)
        except Exception:
            return []
        if not tweet:
            return []
        if tweet.media:
            source = tweet
        elif tweet.retweeted_tweet and tweet.retweeted_tweet.media:
            source = tweet.retweeted_tweet
        else:
            return []

        return [
            Media(
                type=media.type,
                url=media.url,
                video_url=media.video_url,
                width=media.width,
                height=media.height,
                duration=media.duration,
                tweet_id=source.id,
                tweet_text=source.text,
                media_id=media.media_id,
            )
            for media in source.media
        ]
    
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
                        
                        if entry_type == "TimelineTimelineItem":
                            item_content = content.get("itemContent", {})
                            if item_content:
                                item_contents.append(item_content)
                        elif entry_type == "TimelineTimelineModule":
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
    
    def parse_media_list(self, data: Dict[str, Any]) -> Tuple[List[Media], str]:
        """
        Parse timeline response to extract media objects.
        
        Args:
            data: API response data
            
        Returns:
            Tuple of (list of Media objects, next cursor)
        """
        item_contents, next_cursor = self.parse_media_items(data)
        
        all_media = []
        for item_content in item_contents:
            tweet_results = item_content.get("tweet_results", {})
            if not tweet_results:
                continue
            all_media.extend(self._media_from_tweet_results(tweet_results))
        
        return all_media, next_cursor
    
    def parse(self, data: Dict[str, Any]) -> tuple:
        """Override to return media list."""
        return self.parse_media_list(data)
