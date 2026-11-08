"""Supplement UserMedia with retweeted photo/video from UserTweets."""
from typing import Any, Dict, List

from .models import Media, Tweet


def media_gallery_key(m: Dict[str, Any]) -> str:
    media_id = m.get("media_id") or ""
    if media_id:
        return str(media_id)
    url = m.get("url") or ""
    tweet_id = m.get("tweet_id") or ""
    return f"{tweet_id}:{url}" if url else tweet_id


def extract_retweet_media_from_tweets(tweets: List[Tweet]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for tweet in tweets or []:
        inner = tweet.retweeted_tweet
        if not inner or not inner.media:
            continue
        for media in inner.media:
            row = media.to_dict()
            row["tweet_id"] = inner.id
            row["tweet_text"] = inner.text
            row["created_at"] = inner.created_at or tweet.created_at or ""
            row["media_source"] = "tweet_retweet"
            row["wrapper_tweet_id"] = tweet.id
            out.append(row)
    return out


def merge_gallery_media_lists(primary: List[Dict[str, Any]], supplemental: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen = set()
    merged: List[Dict[str, Any]] = []
    for m in list(primary) + list(supplemental):
        key = media_gallery_key(m)
        if not key or key in seen:
            continue
        seen.add(key)
        row = dict(m)
        if not row.get("media_source"):
            row["media_source"] = "user_media"
        merged.append(row)
    return merged


def sort_gallery_media_by_date(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    def sort_key(m: Dict[str, Any]):
        from time import mktime
        from email.utils import parsedate

        raw = m.get("created_at") or ""
        ts = 0.0
        if raw:
            try:
                ts = mktime(parsedate(raw))
            except (TypeError, ValueError):
                ts = 0.0
        return (-ts, str(m.get("tweet_id", "")))

    return sorted(items, key=sort_key)


def enrich_user_media_page(native_media: List[Media], tweets: List[Tweet]) -> Dict[str, Any]:
    native_dicts = [m.to_dict() for m in native_media]
    retweet_dicts = extract_retweet_media_from_tweets(tweets)
    merged = merge_gallery_media_lists(native_dicts, retweet_dicts)
    sorted_items = sort_gallery_media_by_date(merged)
    retweet_ids = sorted({str(m["tweet_id"]) for m in retweet_dicts if m.get("tweet_id")})
    return {
        "media": sorted_items,
        "sources": {
            "user_media_count": len(native_dicts),
            "tweet_retweet_items": len(retweet_dicts),
            "tweet_retweet_tweet_ids": retweet_ids,
            "merged_count": len(sorted_items),
        },
    }
