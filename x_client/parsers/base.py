"""
Base parser module for X API responses.

This module provides base classes for parsing API responses.
"""
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Tuple


class BaseParser(ABC):
    """
    Abstract base class for API response parsers.
    
    Subclasses should implement the parse method to convert
    raw API response data into structured objects.
    """
    
    @abstractmethod
    def parse(self, data: Dict[str, Any]) -> Any:
        """
        Parse API response data.
        
        Args:
            data: Raw API response dictionary
            
        Returns:
            Parsed object(s)
        """
        pass
    
    @staticmethod
    def safe_get(data: dict, *keys, default=None):
        """
        Safely get nested dictionary value.
        
        Args:
            data: Dictionary to search
            *keys: Keys to traverse
            default: Default value if key not found
            
        Returns:
            Value at key path or default
        """
        for key in keys:
            if not isinstance(data, dict):
                return default
            data = data.get(key, default)
            if data is None:
                return default
        return data


class TimelineParser(BaseParser):
    """
    Parser for timeline-style API responses.
    
    Timeline responses have a common structure with:
    - instructions containing TimelineAddEntries
    - entries containing items or cursors
    - cursors for pagination
    """
    
    @staticmethod
    def get_instructions(data: Dict[str, Any]) -> List[Dict]:
        """
        Extract timeline instructions from response.
        
        Args:
            data: API response data
            
        Returns:
            List of instruction objects
        """
        # Try different response structures
        paths = [
            ("data", "user", "result", "timeline_v2", "timeline", "instructions"),
            ("data", "user", "result", "timeline", "timeline", "instructions"),
            ("data", "list", "members_timeline", "timeline", "instructions"),
        ]
        
        for path in paths:
            instructions = BaseParser.safe_get(data, *path, default=None)
            if instructions:
                return instructions
        
        return []
    
    @staticmethod
    def get_entries(instructions: List[Dict]) -> List[Dict]:
        """
        Extract entries from instructions.
        
        Args:
            instructions: List of instruction objects
            
        Returns:
            List of entry objects
        """
        for inst in instructions:
            if inst.get("type") == "TimelineAddEntries":
                return inst.get("entries", [])
        return []
    
    @staticmethod
    def get_next_cursor(entries: List[Dict]) -> str:
        """
        Extract the bottom cursor for pagination.
        
        Args:
            entries: List of entry objects
            
        Returns:
            Cursor string or empty string if not found
        """
        for entry in reversed(entries):
            content = entry.get("content", {})
            if (content.get("entryType") == "TimelineTimelineCursor" and
                content.get("cursorType") == "Bottom"):
                return content.get("value", "")
        return ""
    
    @staticmethod
    def get_previous_cursor(entries: List[Dict]) -> str:
        """
        Extract the top cursor for pagination.
        
        Args:
            entries: List of entry objects
            
        Returns:
            Cursor string or empty string if not found
        """
        for entry in entries:
            content = entry.get("content", {})
            if (content.get("entryType") == "TimelineTimelineCursor" and
                content.get("cursorType") == "Top"):
                return content.get("value", "")
        return ""
    
    @staticmethod
    def get_item_contents(entry: Dict) -> List[Dict]:
        """
        Extract item contents from an entry.
        
        Args:
            entry: Entry object
            
        Returns:
            List of item content objects
        """
        content = entry.get("content", {})
        entry_type = content.get("entryType", "")
        
        if entry_type == "TimelineTimelineModule":
            # Module with multiple items
            items = content.get("items", [])
            return [
                item.get("item", {}).get("itemContent", {})
                for item in items
            ]
        elif entry_type == "TimelineTimelineItem":
            # Single item
            item_content = content.get("itemContent", {})
            if item_content:
                return [item_content]
        elif entry_type == "TimelineAddToModule":
            # Add to module instruction
            return content.get("moduleItems", [])
        
        return []
    
    def parse(self, data: Dict[str, Any]) -> Tuple[List[Dict], str]:
        """
        Parse timeline response to get item contents and cursor.
        
        Args:
            data: API response data
            
        Returns:
            Tuple of (item contents list, next cursor)
        """
        instructions = self.get_instructions(data)
        entries = self.get_entries(instructions)
        
        all_item_contents = []
        for entry in entries:
            # Skip cursor entries
            if entry.get("content", {}).get("entryType") == "TimelineTimelineCursor":
                continue
            all_item_contents.extend(self.get_item_contents(entry))
        
        next_cursor = self.get_next_cursor(entries)
        return all_item_contents, next_cursor
