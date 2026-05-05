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
        duration: Video duration in seconds (0 for photos)
        tweet_id: ID of the tweet containing this media
        tweet_text: Text content of the tweet
    """
    type: str = ""
    url: str = ""
    video_url: str = ""
    width: int = 0
    height: int = 0
    duration: float = 0.0
    tweet_id: str = ""
    tweet_text: str = ""
    
    @classmethod
    def from_dict(cls, data: dict) -> "Media":
        """Create Media from dictionary."""
        media_type = data.get("type", "")
        media_url = data.get("media_url_https", "")
        video_url = ""
        
        # Get highest quality video URL for videos
        duration = 0.0
        if media_type in ("video", "animated_gif"):
            video_info = data.get("video_info", {})
            variants = video_info.get("variants", [])
            max_bitrate = 0
            for v in variants:
                if v.get("content_type") == "video/mp4":
                    bitrate = v.get("bitrate", 1)
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
            # Get video duration in seconds
            duration = video_info.get("duration_millis", 0) / 1000.0
        
        sizes = data.get("sizes", {}).get("large", {})
        
        return cls(
            type=media_type,
            url=media_url,
            video_url=video_url,
            width=sizes.get("w", 0),
            height=sizes.get("h", 0),
            duration=duration,
            tweet_id=data.get("tweet_id", ""),
            tweet_text=data.get("tweet_text", ""),
        )
    
    def to_dict(self) -> dict:
        """Convert Media to dictionary."""
        return {
            "type": self.type,
            "url": self.url,
            "video_url": self.video_url,
            "width": self.width,
            "height": self.height,
            "duration": self.duration,
            "tweet_id": self.tweet_id,
            "tweet_text": self.tweet_text,
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
        profile_image_url: Author profile image URL
        media: List of attached media
        stats: Tweet statistics
        in_reply_to_status_id: ID of tweet being replied to
        in_reply_to_user_id: ID of user being replied to
        is_quote_status: Whether tweet is a quote
        quoted_tweet_id: ID of quoted tweet
        quoted_tweet: Full quoted tweet object (if available)
        retweeted_tweet_id: ID of retweeted tweet
        retweeted_tweet: Full retweeted tweet object (if available)
    """
    id: str
    text: str = ""
    created_at: str = ""
    user_id: str = ""
    user_name: str = ""
    screen_name: str = ""
    profile_image_url: str = ""
    media: List[Media] = field(default_factory=list)
    stats: TweetStats = field(default_factory=TweetStats)
    in_reply_to_status_id: Optional[str] = None
    in_reply_to_user_id: Optional[str] = None
    is_quote_status: bool = False
    quoted_tweet_id: Optional[str] = None
    quoted_tweet: Optional["Tweet"] = None
    retweeted_tweet_id: Optional[str] = None
    retweeted_tweet: Optional["Tweet"] = None
    
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
        
        # Extract profile image from user
        profile_image_url = ""
        user_legacy = user_result.get("legacy", {})
        if user_legacy.get("profile_image_url_https"):
            profile_image_url = user_legacy["profile_image_url_https"].replace("_normal", "_400x400")
        elif user_core.get("profile_image_url_https"):
            profile_image_url = user_core["profile_image_url_https"].replace("_normal", "_400x400")
        
        # Extract media - try extended_entities first, then entities as fallback
        media_list = legacy.get("extended_entities", {}).get("media", [])
        if not media_list:
            # Check entities as fallback
            media_list = legacy.get("entities", {}).get("media", [])
        
        # Also check if there are cards that contain media
        if not media_list and "card" in result:
            # Extract media from cards
            card = result.get("card", {})
            card_legacy = card.get("legacy", {})
            binding_values = card_legacy.get("binding_values", {})
            
            # Handle binding_values - can be dict or list
            if isinstance(binding_values, dict):
                values_to_check = list(binding_values.values())
            elif isinstance(binding_values, list):
                values_to_check = binding_values
            else:
                values_to_check = []
            
            # Look for photo/video cards
            for value in values_to_check:
                if isinstance(value, dict) and value.get("type") == "IMAGE":
                    image_url = value.get("image_value", {}).get("url", "")
                    if image_url:
                        media_list.append({
                            "type": "photo",
                            "media_url_https": image_url,
                            "media_url": image_url
                        })
                elif isinstance(value, dict) and value.get("type") == "VIDEO":
                    video_info = value.get("video_value", {})
                    thumbnail_url = video_info.get("thumbnail_url", "")
                    variants = video_info.get("variants", [])
                    if thumbnail_url:
                        media_item = {
                            "type": "video",
                            "media_url_https": thumbnail_url,
                            "media_url": thumbnail_url
                        }
                        if variants:
                            media_item["video_info"] = {"variants": variants}
                        media_list.append(media_item)
        
        media = [Media.from_dict(m) for m in media_list]
        
        # Extract stats
        stats = TweetStats(
            favorite_count=legacy.get("favorite_count", 0),
            retweet_count=legacy.get("retweet_count", 0),
            reply_count=legacy.get("reply_count", 0),
            quote_count=legacy.get("quote_count", 0),
            view_count=int(result.get("views", {}).get("count", 0) or 0),
        )
        
        # Parse retweeted_status (the original tweet being retweeted)
        retweeted_tweet = None
        retweeted_status = legacy.get("retweeted_status_result")
        if not retweeted_status:
            # Some API versions nest it differently
            retweeted_status = result.get("retweeted_status_result")
        if retweeted_status:
            try:
                retweeted_tweet = cls.from_dict(retweeted_status)
            except Exception:
                retweeted_tweet = None
        
        # Parse quoted_status (the tweet being quoted/referenced)
        quoted_tweet = None
        quoted_status = legacy.get("quoted_status_result")
        if not quoted_status:
            # Some API versions nest it differently
            quoted_status = result.get("quoted_status_result")
        if quoted_status:
            try:
                quoted_tweet = cls.from_dict(quoted_status)
            except Exception:
                quoted_tweet = None
        
        # For retweets, the text is usually "RT @user: ..." which is not useful
        # Use the retweeted tweet's text instead if available
        tweet_text = legacy.get("full_text", "") or legacy.get("text", "")
        
        # For long tweets (Note Tweets), full_text is truncated to ~280 chars.
        # The full content is in note_tweet.note_tweet_results.result.text
        note_tweet = result.get("note_tweet")
        if not note_tweet:
            note_tweet = legacy.get("note_tweet")
        if note_tweet:
            note_results = note_tweet.get("note_tweet_results", {})
            note_result = note_results.get("result", {})
            if isinstance(note_result, dict):
                note_text = note_result.get("text", "")
                if note_text:
                    tweet_text = note_text
        
        if retweeted_tweet and tweet_text.startswith("RT @"):
            # Keep original text but we'll show retweeted tweet content in UI
            pass
        
        return cls(
            id=str(result.get("rest_id", "") or legacy.get("id_str", "")),
            text=tweet_text,
            created_at=legacy.get("created_at", ""),
            user_id=user_id,
            user_name=user_name,
            screen_name=screen_name,
            profile_image_url=profile_image_url,
            media=media,
            stats=stats,
            in_reply_to_status_id=legacy.get("in_reply_to_status_id_str"),
            in_reply_to_user_id=legacy.get("in_reply_to_user_id_str"),
            is_quote_status=legacy.get("is_quote_status", False),
            quoted_tweet_id=legacy.get("quoted_status_id_str"),
            quoted_tweet=quoted_tweet,
            retweeted_tweet_id=legacy.get("retweeted_status_id_str"),
            retweeted_tweet=retweeted_tweet,
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
            "profile_image_url": self.profile_image_url,
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
            "quoted_tweet": self.quoted_tweet.to_dict() if self.quoted_tweet else None,
            "retweeted_tweet_id": self.retweeted_tweet_id,
            "retweeted_tweet": self.retweeted_tweet.to_dict() if self.retweeted_tweet else None,
        }
