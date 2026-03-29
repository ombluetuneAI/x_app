#!/usr/bin/env python3
"""
Example usage of X Client library.

This script demonstrates how to use the X Client library
to interact with Twitter's GraphQL API.

Prerequisites:
    1. Create a config.json file with your credentials:
       {
           "auth_token": "your_auth_token",
           "ct0": "your_ct0_token",
           "proxy": "http://127.0.0.1:10810"  // optional
       }

    2. Install requests: pip install requests
"""
import json
from pathlib import Path

# Add parent directory to path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent))

from x_client import XClient, XConfig


def example_get_user_info(client: XClient):
    """Example: Get user information by screen name."""
    print("\n=== Example: Get User Info ===\n")
    
    screen_name = "elonmusk"
    print(f"Fetching user: @{screen_name}")
    
    user = client.user.get_user_by_screen_name(screen_name)
    
    if user:
        print(f"\nUser Information:")
        print(f"  ID: {user.id}")
        print(f"  Name: {user.name}")
        print(f"  Screen Name: @{user.screen_name}")
        print(f"  Description: {user.description[:100]}...")
        print(f"  Followers: {user.stats.followers_count:,}")
        print(f"  Following: {user.stats.friends_count:,}")
        print(f"  Tweets: {user.stats.statuses_count:,}")
        print(f"  Media: {user.stats.media_count:,}")
    
    return user


def example_get_user_tweets(client: XClient, user_id: str):
    """Example: Get user's tweets."""
    print("\n=== Example: Get User Tweets ===\n")
    
    print(f"Fetching tweets for user ID: {user_id}")
    
    # Get first 2 pages of tweets
    tweets = client.tweet.get_user_tweets(user_id, count=20, max_pages=2)
    
    print(f"\nFound {len(tweets)} tweets\n")
    
    for i, tweet in enumerate(tweets[:5], 1):
        print(f"{i}. {tweet.text[:80]}...")
        print(f"   Likes: {tweet.stats.favorite_count:,} | "
              f"Retweets: {tweet.stats.retweet_count:,} | "
              f"Replies: {tweet.stats.reply_count:,}")
        if tweet.media:
            print(f"   Media: {len(tweet.media)} item(s)")
        print()
    
    return tweets


def example_get_user_media(client: XClient, user_id: str):
    """Example: Get user's media tweets."""
    print("\n=== Example: Get User Media ===\n")
    
    print(f"Fetching media for user ID: {user_id}")
    
    # Get first page of media
    media_tweets = client.media.get_user_media(user_id, count=50, max_pages=1)
    
    print(f"\nFound {len(media_tweets)} tweets with media\n")
    
    for i, tweet in enumerate(media_tweets[:5], 1):
        print(f"{i}. {tweet.text[:60]}...")
        for media in tweet.media:
            print(f"   - {media.type}: {media.url}")
        print()
    
    return media_tweets


def example_get_list_members(client: XClient):
    """Example: Get members of a Twitter list."""
    print("\n=== Example: Get List Members ===\n")
    
    # Example list ID (replace with a real one)
    list_id = "1073356376045436928"
    
    print(f"Fetching list: {list_id}")
    
    # Get list info
    lst = client.list.get_list(list_id)
    
    if lst:
        print(f"\nList Information:")
        print(f"  Name: {lst.name}")
        print(f"  Description: {lst.description[:100] if lst.description else 'N/A'}")
        print(f"  Members: {lst.member_count}")
        print(f"  Subscribers: {lst.subscriber_count}")
        if lst.creator:
            print(f"  Creator: @{lst.creator.screen_name}")
        
        # Get members (first page only)
        print(f"\nFetching members...")
        members = client.list.get_list_members(list_id, count=100, max_pages=1)
        
        print(f"\nFound {len(members)} members:\n")
        for i, member in enumerate(members[:10], 1):
            print(f"  {i}. @{member.screen_name} ({member.name})")
    
    return lst


def example_get_following(client: XClient, user_id: str):
    """Example: Get users that a user is following."""
    print("\n=== Example: Get Following ===\n")
    
    print(f"Fetching following for user ID: {user_id}")
    
    # Get first page of following
    following = client.user.get_following(user_id, count=100, max_pages=1)
    
    print(f"\nFound {len(following)} users:\n")
    
    for i, user in enumerate(following[:10], 1):
        print(f"  {i}. @{user.screen_name} ({user.name})")
    
    return following


def example_context_manager():
    """Example: Using client as context manager."""
    print("\n=== Example: Context Manager ===\n")
    
    # This automatically handles closing the client
    with XClient.from_config() as client:
        user = client.user.get_user_by_screen_name("elonmusk")
        if user:
            print(f"Found user: {user.name}")


def example_save_results(data: dict, filename: str):
    """Save results to JSON file."""
    output_path = Path(__file__).parent / filename
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=str)
    print(f"Results saved to: {output_path}")


def main():
    """Main function demonstrating various X Client features."""
    
    # Load configuration
    config_path = Path(__file__).parent / "config.json"
    
    if not config_path.exists():
        print("Error: config.json not found!")
        print("Please create a config.json file with your credentials:")
        print(json.dumps({
            "auth_token": "your_auth_token",
            "ct0": "your_ct0_token",
            "proxy": "http://127.0.0.1:10810"
        }, indent=2))
        return
    
    print("=" * 60)
    print("X Client Library - Usage Examples")
    print("=" * 60)
    
    # Create client from config
    with XClient.from_config(config_path) as client:
        
        # Example 1: Get user info
        user = example_get_user_info(client)
        
        if user:
            # Example 2: Get user tweets
            tweets = example_get_user_tweets(client, user.id)
            
            # Example 3: Get user media
            media = example_get_user_media(client, user.id)
            
            # Example 4: Get following
            following = example_get_following(client, user.id)
            
            # Save results
            results = {
                "user": user.to_dict() if user else None,
                "tweets_count": len(tweets),
                "media_count": len(media),
                "following_count": len(following),
            }
            example_save_results(results, "example_results.json")
        
        # Example 5: Get list members
        example_get_list_members(client)
    
    print("\n" + "=" * 60)
    print("Examples completed!")
    print("=" * 60)


if __name__ == "__main__":
    main()
