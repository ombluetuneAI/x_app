#!/usr/bin/env python3
"""
Flask API Server for X Client Web Interface.

This server provides REST API endpoints for the web frontend.
"""
import json
from pathlib import Path
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from x_client import XClient

# Configure app with static folder
STATIC_FOLDER = Path(__file__).parent / "static"
app = Flask(__name__, static_folder=str(STATIC_FOLDER))
CORS(app)

# Global client instance
_client = None


def get_client():
    """Get or create X client instance."""
    global _client
    if _client is None:
        config_path = Path(__file__).parent / "config.json"
        _client = XClient.from_config(config_path)
    return _client


def format_user(user):
    """Format user data for API response."""
    if not user:
        return None
    return {
        "id": user.id,
        "name": user.name,
        "screen_name": user.screen_name,
        "description": user.description,
        "location": user.location,
        "profile_image_url": user.profile_image_url.replace("_normal", "_400x400") if user.profile_image_url else "",
        "profile_banner_url": user.profile_banner_url,
        "verified": user.verified,
        "following": user.following,
        "created_at": user.created_at,
        "stats": {
            "followers_count": user.stats.followers_count,
            "friends_count": user.stats.friends_count,
            "statuses_count": user.stats.statuses_count,
            "media_count": user.stats.media_count,
        }
    }


def format_media(tweet):
    """Format media data for API response."""
    if not tweet or not tweet.media:
        return []
    result = []
    for m in tweet.media:
        # Get the best quality image URL
        url = m.url
        if m.type == "photo" and "?format=" in url:
            # Try to get larger version
            url = url.replace("?format=", "?name=large&format=")
        result.append({
            "type": m.type,
            "url": url,
            "video_url": m.video_url,
            "tweet_id": tweet.id,
            "tweet_text": tweet.text[:100] if tweet.text else "",
        })
    return result


def format_tweet(tweet):
    """Format tweet data for API response."""
    if not tweet:
        return None
    return {
        "id": tweet.id,
        "text": tweet.text,
        "created_at": tweet.created_at,
        "user_id": tweet.user_id,
        "user_name": tweet.user_name,
        "screen_name": tweet.screen_name,
        "stats": {
            "likes": tweet.stats.favorite_count,
            "retweets": tweet.stats.retweet_count,
            "replies": tweet.stats.reply_count,
            "quotes": tweet.stats.quote_count,
            "views": tweet.stats.view_count,
        },
        "media": format_media(tweet) if tweet.media else [],
        "has_media": bool(tweet.media),
    }


@app.route('/api/user/<screen_name>')
def get_user(screen_name):
    """Get user information by screen name."""
    try:
        client = get_client()
        user = client.user.get_user_by_screen_name(screen_name)
        if user:
            return jsonify({"success": True, "data": format_user(user)})
        return jsonify({"success": False, "error": "User not found"}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/user/<screen_name>/media')
def get_user_media(screen_name):
    """Get user's media tweets."""
    try:
        client = get_client()
        user = client.user.get_user_by_screen_name(screen_name)
        if not user:
            return jsonify({"success": False, "error": "User not found"}), 404
        
        count = request.args.get('count', 50, type=int)
        cursor = request.args.get('cursor', '')
        
        tweets, next_cursor = client.media.get_user_media(
            user.id, 
            count=count, 
            max_pages=1, 
            cursor=cursor
        )
        
        media_list = []
        for tweet in tweets:
            media_list.extend(format_media(tweet))
        
        return jsonify({
            "success": True,
            "data": {
                "user": format_user(user),
                "media": media_list[:count],
                "cursor": next_cursor
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/user/<screen_name>/following')
def get_user_following(screen_name):
    """Get user's following list."""
    try:
        client = get_client()
        user = client.user.get_user_by_screen_name(screen_name)
        if not user:
            return jsonify({"success": False, "error": "User not found"}), 404
        
        count = request.args.get('count', 100, type=int)
        following = client.user.get_following(user.id, count=count, max_pages=1)
        
        users = [format_user(u) for u in following]
        
        return jsonify({
            "success": True,
            "data": {
                "user": format_user(user),
                "following": users[:count]
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/user/<screen_name>/tweets')
def get_user_tweets(screen_name):
    """Get user's tweets (posts)."""
    try:
        client = get_client()
        user = client.user.get_user_by_screen_name(screen_name)
        if not user:
            return jsonify({"success": False, "error": "User not found"}), 404
        
        count = request.args.get('count', 20, type=int)
        cursor = request.args.get('cursor', '')
        
        tweets, next_cursor = client.tweet.get_user_tweets(
            user.id, 
            count=count, 
            max_pages=1, 
            cursor=cursor
        )
        
        tweet_list = [format_tweet(t) for t in tweets]
        
        return jsonify({
            "success": True,
            "data": {
                "user": format_user(user),
                "tweets": tweet_list[:count],
                "cursor": next_cursor
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/')
def index():
    """Serve the main page."""
    return send_from_directory(STATIC_FOLDER, 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    """Serve static files."""
    try:
        return send_from_directory(STATIC_FOLDER, path)
    except:
        # For SPA, serve index.html for any non-file routes
        return send_from_directory(STATIC_FOLDER, 'index.html')


if __name__ == '__main__':
    # Create static folder if not exists
    STATIC_FOLDER.mkdir(exist_ok=True)
    
    print("=" * 50)
    print("X Profile Viewer Server")
    print("=" * 50)
    print(f"Open http://localhost:5000 in your browser")
    print(f"Default user: elonmusk")
    print(f"To view other users: http://localhost:5000?user=username")
    print("=" * 50)
    
    app.run(host='0.0.0.0', port=5000, debug=True)
