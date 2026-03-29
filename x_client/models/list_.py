"""
List data models for X API client.

This module defines data models for Twitter list-related data.
"""
from dataclasses import dataclass, field
from typing import Optional

from .user import User


@dataclass
class XList:
    """
    Twitter List data model.
    
    Attributes:
        id: List ID
        name: List name
        description: List description
        member_count: Number of members in the list
        subscriber_count: Number of subscribers
        is_private: Whether list is private
        created_at: List creation timestamp
        creator: User who created the list
    """
    id: str
    name: str = ""
    description: str = ""
    member_count: int = 0
    subscriber_count: int = 0
    is_private: bool = False
    created_at: str = ""
    creator: Optional[User] = None
    
    @classmethod
    def from_dict(cls, data: dict) -> "XList":
        """Create XList from API response data."""
        list_data = data.get("data", {}).get("list", data)
        
        # Extract creator info
        creator = None
        user_results = list_data.get("user_results", {})
        if user_results:
            creator = User.from_dict(user_results)
        
        return cls(
            id=str(list_data.get("id_str", "")),
            name=list_data.get("name", ""),
            description=list_data.get("description", ""),
            member_count=list_data.get("member_count", 0),
            subscriber_count=list_data.get("subscriber_count", 0),
            is_private=list_data.get("is_private", False),
            created_at=list_data.get("created_at", ""),
            creator=creator,
        )
    
    def to_dict(self) -> dict:
        """Convert XList to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "member_count": self.member_count,
            "subscriber_count": self.subscriber_count,
            "is_private": self.is_private,
            "created_at": self.created_at,
            "creator": self.creator.to_dict() if self.creator else None,
        }
