"""
User data models for X API client.

This module defines data models for user-related data.
"""
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class UserStats:
    """User statistics."""
    friends_count: int = 0
    followers_count: int = 0
    statuses_count: int = 0
    media_count: int = 0
    listed_count: int = 0
    favourites_count: int = 0


@dataclass
class User:
    """
    User data model.
    
    Attributes:
        id: User ID (rest_id)
        name: Display name
        screen_name: Username (handle)
        description: Profile bio/description
        location: Profile location
        url: Profile URL
        profile_image_url: Profile image URL
        profile_banner_url: Profile banner URL
        protected: Whether account is protected/private
        verified: Whether account is verified
        following: Whether current user follows this user
        followers_count: Number of followers
        friends_count: Number of following
        created_at: Account creation timestamp
    """
    id: str
    name: str = ""
    screen_name: str = ""
    description: str = ""
    location: str = ""
    url: str = ""
    profile_image_url: str = ""
    profile_banner_url: str = ""
    protected: bool = False
    verified: bool = False
    following: bool = False
    muting: bool = False
    blocking: bool = False
    stats: UserStats = field(default_factory=UserStats)
    created_at: str = ""
    
    @classmethod
    def from_dict(cls, data: dict) -> "User":
        """Create User from dictionary."""
        result = data.get("result", data)
        
        # Handle unavailable user
        if result.get("__typename") == "UserUnavailable":
            return None
        
        legacy = result.get("legacy", {})
        
        stats = UserStats(
            friends_count=legacy.get("friends_count", 0),
            followers_count=legacy.get("followers_count", 0),
            statuses_count=legacy.get("statuses_count", 0),
            media_count=legacy.get("media_count", 0),
            listed_count=legacy.get("listed_count", 0),
            favourites_count=legacy.get("favourites_count", 0),
        )
        
        return cls(
            id=str(result.get("rest_id", "")),
            name=legacy.get("name", ""),
            screen_name=legacy.get("screen_name", ""),
            description=legacy.get("description", ""),
            location=legacy.get("location", ""),
            url=legacy.get("url", ""),
            profile_image_url=legacy.get("profile_image_url_https", ""),
            profile_banner_url=legacy.get("profile_banner_url", ""),
            protected=legacy.get("protected", False),
            verified=legacy.get("verified", False),
            following=legacy.get("following", False),
            muting=legacy.get("muting", False),
            blocking=legacy.get("blocking", False),
            stats=stats,
            created_at=legacy.get("created_at", ""),
        )
    
    def to_dict(self) -> dict:
        """Convert User to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "screen_name": self.screen_name,
            "description": self.description,
            "location": self.location,
            "url": self.url,
            "profile_image_url": self.profile_image_url.replace("_normal", "_400x400") if self.profile_image_url else "",
            "profile_banner_url": self.profile_banner_url,
            "protected": self.protected,
            "verified": self.verified,
            "following": self.following,
            "muting": self.muting,
            "blocking": self.blocking,
            "stats": {
                "friends_count": self.stats.friends_count,
                "followers_count": self.stats.followers_count,
                "statuses_count": self.stats.statuses_count,
                "media_count": self.stats.media_count,
                "listed_count": self.stats.listed_count,
                "favourites_count": self.stats.favourites_count,
            },
            "created_at": self.created_at,
        }
