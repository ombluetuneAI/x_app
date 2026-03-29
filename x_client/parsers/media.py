"""
Media parser module for X API responses.

This module provides parsers for media-related API responses.
"""
from typing import Dict, Any, List, Tuple

from ..models import Media
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
            
            result = tweet_results.get("result", {})
            if not result:
                continue
            
            # Handle visibility wrapper
            if "tweet" in result:
                result = result["tweet"]
            
            legacy = result.get("legacy", {})
            
            # Get tweet info
            tweet_id = str(result.get("rest_id", "") or legacy.get("id_str", ""))
            tweet_text = legacy.get("full_text", "") or legacy.get("text", "")
            
            # Check if tweet has media - try extended_entities first, then entities
            media_list = legacy.get("extended_entities", {}).get("media", [])
            if not media_list:
                media_list = legacy.get("entities", {}).get("media", [])
            if not media_list:
                continue
            
            # Parse media objects with tweet context
            for media_data in media_list:
                # Add tweet info to media data
                media_data["tweet_id"] = tweet_id
                media_data["tweet_text"] = tweet_text
                media = Media.from_dict(media_data)
                all_media.append(media)
        
        return all_media, next_cursor
    
    def parse(self, data: Dict[str, Any]) -> tuple:
        """Override to return media list."""
        return self.parse_media_list(data)
