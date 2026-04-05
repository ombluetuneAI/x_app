#!/usr/bin/env python3
"""
Flask API Server for X Client Web Interface.

This server provides REST API endpoints for the web frontend.
"""
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
        
        count = request.args.get('count', 100, type=int)
        following = client.user.get_following(user.id, count=count, max_pages=1)
        
        users = [u.to_dict() for u in following]
        
        return jsonify({
            "success": True,
            "data": {
                "user": user.to_dict(),
                "following": users
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
