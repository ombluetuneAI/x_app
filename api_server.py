#!/usr/bin/env python3
"""
Flask API Server for X Client Web Interface.

This server provides REST API endpoints for the web frontend.
"""
from pathlib import Path
from urllib.parse import urlparse

import requests
from flask import Flask, Response, jsonify, request, send_from_directory
from flask_cors import CORS
from x_client import XClient

_MEDIA_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
_MEDIA_PASSTHROUGH_HEADERS = (
    "Content-Type",
    "Content-Length",
    "Accept-Ranges",
    "Content-Range",
    "ETag",
    "Last-Modified",
)


def _is_allowed_media_url(target: str) -> bool:
    try:
        parsed = urlparse(target)
    except Exception:
        return False
    if parsed.scheme != "https":
        return False
    host = (parsed.hostname or "").lower()
    return host == "twimg.com" or host.endswith(".twimg.com")

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


@app.route('/api/home/timeline')
def get_home_timeline():
    """Get home timeline tweets (For You or Following)."""
    try:
        client = get_client()
        count = request.args.get('count', 20, type=int)
        cursor = request.args.get('cursor', '')
        feed_type = request.args.get('type', 'foryou')  # 'foryou' or 'following'
        latest = feed_type == 'following'
        
        tweets, next_cursor = client.tweet.get_home_timeline(
            count=count,
            latest=latest,
            max_pages=1,
            cursor=cursor
        )
        
        tweet_list = [t.to_dict() for t in tweets]
        
        return jsonify({
            "success": True,
            "data": {
                "tweets": tweet_list,
                "cursor": next_cursor
            }
        })
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e), "traceback": tb}), 500


@app.route('/api/user/<screen_name>')
def get_user(screen_name):
    """Get user information by screen name."""
    try:
        client = get_client()
        user = client.user.get_user_by_screen_name(screen_name)
        if user:
            return jsonify({"success": True, "data": user.to_dict()})
        return jsonify({"success": False, "error": "User not found"}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/user/<screen_name>/media')
def get_user_media(screen_name):
    """Get user's media."""
    try:
        client = get_client()
        user = client.user.get_user_by_screen_name(screen_name)
        if not user:
            return jsonify({"success": False, "error": "User not found"}), 404
        
        count = request.args.get('count', 50, type=int)
        cursor = request.args.get('cursor', '')
        
        media_list, next_cursor = client.media.get_user_media(
            user.id, 
            count=count, 
            max_pages=1, 
            cursor=cursor
        )
        
        formatted_media = [m.to_dict() for m in media_list]
        
        return jsonify({
            "success": True,
            "data": {
                "user": user.to_dict(),
                "media": formatted_media,
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
        
        count = request.args.get('count', 50, type=int)
        cursor = request.args.get('cursor', '')
        following, next_cursor = client.user.get_following_page(
            user.id,
            count=count,
            cursor=cursor
        )
        
        users = [u.to_dict() for u in following]
        
        return jsonify({
            "success": True,
            "data": {
                "user": user.to_dict(),
                "following": users,
                "cursor": next_cursor
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/user/<screen_name>/followers')
def get_user_followers(screen_name):
    """Get user's followers list."""
    try:
        client = get_client()
        user = client.user.get_user_by_screen_name(screen_name)
        if not user:
            return jsonify({"success": False, "error": "User not found"}), 404
        
        count = request.args.get('count', 50, type=int)
        cursor = request.args.get('cursor', '')
        followers, next_cursor = client.user.get_followers_page(
            user.id,
            count=count,
            cursor=cursor
        )
        
        users = [u.to_dict() for u in followers]
        
        return jsonify({
            "success": True,
            "data": {
                "user": user.to_dict(),
                "followers": users,
                "cursor": next_cursor
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
        
        tweet_list = [t.to_dict() for t in tweets]
        
        return jsonify({
            "success": True,
            "data": {
                "user": user.to_dict(),
                "tweets": tweet_list,
                "cursor": next_cursor
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/user/<user_id>/follow', methods=['POST'])
def follow_user(user_id):
    """Follow a user."""
    try:
        client = get_client()
        client.user.follow_user(user_id)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/media', methods=['GET', 'HEAD'])
def proxy_media():
    """Proxy X/Twitter CDN media (twimg.com only) for the web UI."""
    target = request.args.get('url')
    if not target:
        return jsonify({"success": False, "error": "Missing url query parameter"}), 400
    if not _is_allowed_media_url(target):
        return jsonify({"success": False, "error": "URL host not allowed"}), 403

    headers = {"User-Agent": _MEDIA_UA}
    range_header = request.headers.get("Range")
    if range_header:
        headers["Range"] = range_header

    try:
        upstream = requests.request(
            request.method,
            target,
            headers=headers,
            stream=True,
            timeout=60,
        )
    except requests.RequestException as e:
        return jsonify({"success": False, "error": str(e)}), 502

    resp_headers = {}
    for name in _MEDIA_PASSTHROUGH_HEADERS:
        if name in upstream.headers:
            resp_headers[name] = upstream.headers[name]
    if "Cache-Control" not in resp_headers:
        resp_headers["Cache-Control"] = "public, max-age=86400"

    if request.method == "HEAD":
        upstream.close()
        return Response(status=upstream.status_code, headers=resp_headers)

    def generate():
        try:
            for chunk in upstream.iter_content(chunk_size=8192):
                if chunk:
                    yield chunk
        finally:
            upstream.close()

    return Response(generate(), status=upstream.status_code, headers=resp_headers)


@app.route('/api/user/<user_id>/unfollow', methods=['POST'])
def unfollow_user(user_id):
    """Unfollow a user."""
    try:
        client = get_client()
        client.user.unfollow_user(user_id)
        return jsonify({"success": True})
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
