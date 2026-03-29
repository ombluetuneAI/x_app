"""
Tweet data models for X API client.

This module defines data models for tweet-related data.
"""
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class Media:
    """
    Media data model for tweets.
    
    Attributes:
        type: Media type (photo, video, animated_gif)
        url: Media URL (image URL or video thumbnail)
        video_url: Video URL for video/animated_gif types
        width: Media width
        height: Media height
    """
    type: str = ""
    url: str = ""
    video_url: str = ""
    width: int = 0
    height: int = 0
    
    @classmethod
    def from_dict(cls, data: dict) -> "Media":
        """Create Media from dictionary."""
        media_type = data.get("type", "")
        media_url = data.get("media_url_https", "")
        video_url = ""
        
        # Get highest quality video URL for videos
        if media_type in ("video", "animated_gif"):
            variants = data.get("video_info", {}).get("variants", [])
            max_bitrate = 0
            for v in variants:
                if v.get("content_type") == "video/mp4":
                    bitrate = v.get("bitrate", 0)
                    if bitrate > max_bitrate:
                        max_bitrate = bitrate
                        video_url = v.get("url", "")
            # Keep the tag parameter but remove other query params that might cause issues
            if video_url and "?" in video_url:
                # Extract just the tag parameter
                parts = video_url.split("?")
                base_url = parts[0]
                query = parts[1] if len(parts) > 1 else ""
                if "tag=" in query:
                    tag = query.split("tag=")[1].split("&")[0]
                    video_url = f"{base_url}?tag={tag}"
                else:
                    video_url = base_url
        
        sizes = data.get("sizes", {}).get("large", {})
        
        return cls(
            type=media_type,
            url=media_url,
            video_url=video_url,
            width=sizes.get("w", 0),
            height=sizes.get("h", 0),
        )
    
    def to_dict(self) -> dict:
        """Convert Media to dictionary."""
        return {
            "type": self.type,
            "url": self.url,
            "video_url": self.video_url,
            "width": self.width,
            "height": self.height,
        }


@dataclass
class TweetStats:
    """Tweet engagement statistics."""
    favorite_count: int = 0
    retweet_count: int = 0
    reply_count: int = 0
    quote_count: int = 0
    view_count: int = 0


@dataclass
class Tweet:
    """
    Tweet data model.
    
    Attributes:
        id: Tweet ID
        text: Tweet text content
        created_at: Tweet creation timestamp
        user_id: Author user ID
        user_name: Author display name
        screen_name: Author username
        media: List of attached media
        stats: Tweet statistics
        in_reply_to_status_id: ID of tweet being replied to
        in_reply_to_user_id: ID of user being replied to
        is_quote_status: Whether tweet is a quote
        quoted_tweet_id: ID of quoted tweet
        retweeted_tweet_id: ID of retweeted tweet
    """
    id: str
    text: str = ""
    created_at: str = ""
    user_id: str = ""
    user_name: str = ""
    screen_name: str = ""
    media: List[Media] = field(default_factory=list)
    stats: TweetStats = field(default_factory=TweetStats)
    in_reply_to_status_id: Optional[str] = None
    in_reply_to_user_id: Optional[str] = None
    is_quote_status: bool = False
    quoted_tweet_id: Optional[str] = None
    retweeted_tweet_id: Optional[str] = None
    
    @classmethod
    def from_dict(cls, data: dict) -> "Tweet":
        """Create Tweet from API response data."""
        result = data.get("result", data)
        
        # Handle visibility wrapper
        if "tweet" in result:
            result = result["tweet"]
        
        legacy = result.get("legacy", {})
        
        # Extract user info
        core = result.get("core", {})
        user_result = core.get("user_results", {}).get("result", {})
        
        # Try new structure first
        user_core = user_result.get("core", {})
        user_id = str(user_result.get("rest_id", ""))
        user_name = user_core.get("name", "")
        screen_name = user_core.get("screen_name", "")
        
        # Fallback to legacy structure
        if not user_name and not screen_name:
            user_legacy = user_result.get("legacy", {})
            user_name = user_legacy.get("name", "")
            screen_name = user_legacy.get("screen_name", "")
        
        # Extract media
        media_list = legacy.get("extended_entities", {}).get("media", [])
        media = [Media.from_dict(m) for m in media_list]
        
        # Extract stats
        stats = TweetStats(
            favorite_count=legacy.get("favorite_count", 0),
            retweet_count=legacy.get("retweet_count", 0),
            reply_count=legacy.get("reply_count", 0),
            quote_count=legacy.get("quote_count", 0),
            view_count=int(result.get("views", {}).get("count", 0) or 0),
        )
        
        return cls(
            id=str(result.get("rest_id", "") or legacy.get("id_str", "")),
            text=legacy.get("full_text", "") or legacy.get("text", ""),
            created_at=legacy.get("created_at", ""),
            user_id=user_id,
            user_name=user_name,
            screen_name=screen_name,
            media=media,
            stats=stats,
            in_reply_to_status_id=legacy.get("in_reply_to_status_id_str"),
            in_reply_to_user_id=legacy.get("in_reply_to_user_id_str"),
            is_quote_status=legacy.get("is_quote_status", False),
            quoted_tweet_id=legacy.get("quoted_status_id_str"),
            retweeted_tweet_id=legacy.get("retweeted_status_id_str"),
        )
    
    def to_dict(self) -> dict:
        """Convert Tweet to dictionary."""
        return {
            "id": self.id,
            "text": self.text,
            "created_at": self.created_at,
            "user_id": self.user_id,
            "user_name": self.user_name,
            "screen_name": self.screen_name,
            "media": [m.to_dict() for m in self.media],
            "stats": {
                "favorite_count": self.stats.favorite_count,
                "retweet_count": self.stats.retweet_count,
                "reply_count": self.stats.reply_count,
                "quote_count": self.stats.quote_count,
                "view_count": self.stats.view_count,
            },
            "in_reply_to_status_id": self.in_reply_to_status_id,
            "in_reply_to_user_id": self.in_reply_to_user_id,
            "is_quote_status": self.is_quote_status,
            "quoted_tweet_id": self.quoted_tweet_id,
            "retweeted_tweet_id": self.retweet_tweet_id,
        }
