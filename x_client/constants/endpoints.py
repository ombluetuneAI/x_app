"""
API endpoints and feature constants for X (Twitter) GraphQL API.

This module contains all the API endpoint paths and feature flags
required for making requests to Twitter's GraphQL API.
"""
import json


# Bearer token for Twitter API authentication
BEARER_TOKEN = (
    "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D"
    "1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
)


def json_dumps(obj: dict) -> str:
    """Compact JSON serialization for API parameters."""
    return json.dumps(obj, separators=(',', ':'))


class APIEndpoints:
    """
    Twitter API endpoint paths (GraphQL + REST v1.1).
    
    Most endpoints use GraphQL API, but some operations like follow/unfollow
    use the more stable REST API v1.1.
    
    The full URL is constructed by prepending "https://x.com" to these paths.
    """
    
    # User endpoints (GraphQL)
    USER_BY_SCREEN_NAME = "/i/api/graphql/xmU6X_CKVnQ5lSrCbAmJsg/UserByScreenName"
    USER_TWEETS = "/i/api/graphql/FOlovQsiHGDls3c0Q_HaSQ/UserTweets"
    USER_MEDIA = "/i/api/graphql/MOLbHrtk8Ovu7DUNOLcXiA/UserMedia"
    FOLLOWING = "/i/api/graphql/7FEKOPNAvxWASt6v9gfCXw/Following"
    
    # Followers endpoint (REST API v1.1 - more stable than GraphQL)
    FOLLOWERS = "/i/api/1.1/followers/list.json"
    
    # Home timeline endpoints (GraphQL)
    HOME_TIMELINE = "/i/api/graphql/1u0Wlkw6Ru1NwBUD-pDiww/HomeTimeline"
    HOME_LATEST_TIMELINE = "/i/api/graphql/9EwYy8pLBOSFlEoSP2STiQ/HomeLatestTimeline"
    
    # User endpoints (REST API v1.1 - more stable)
    CREATE_FRIENDSHIP = "/i/api/1.1/friendships/create.json"
    DESTROY_FRIENDSHIP = "/i/api/1.1/friendships/destroy.json"
    
    # List endpoints
    LIST_BY_REST_ID = "/i/api/graphql/ZMQOSpxDo0cP5Cdt8MgEVA/ListByRestId"
    LIST_MEMBERS = "/i/api/graphql/3dQPyRyAj6Lslp4e0ClXzg/ListMembers"
    
    # Base URL
    BASE_URL = "https://x.com"


class Features:
    """
    Feature flags for Twitter GraphQL API requests.
    
    These feature flags are required parameters for API requests.
    They control which features are enabled in the API response.
    """
    
    # Features for UserByScreenName API
    USER_BY_SCREEN_NAME = json_dumps({
        "hidden_profile_subscriptions_enabled": True,
        "rweb_tipjar_consumption_enabled": True,
        "responsive_web_graphql_exclude_directive_enabled": True,
        "verified_phone_label_enabled": False,
        "subscriptions_verification_info_is_identity_verified_enabled": True,
        "subscriptions_verification_info_verified_since_enabled": True,
        "highlights_tweets_tab_ui_enabled": True,
        "responsive_web_twitter_article_notes_tab_enabled": True,
        "subscriptions_feature_can_gift_premium": False,
        "creator_subscriptions_tweet_preview_api_enabled": True,
        "responsive_web_graphql_skip_user_profile_image_extensions_enabled": False,
        "responsive_web_graphql_timeline_navigation_enabled": True,
    })
    
    # Features for UserMedia API
    USER_MEDIA = json_dumps({
        "rweb_tipjar_consumption_enabled": True,
        "responsive_web_graphql_exclude_directive_enabled": True,
        "verified_phone_label_enabled": False,
        "creator_subscriptions_tweet_preview_api_enabled": True,
        "responsive_web_graphql_timeline_navigation_enabled": True,
        "responsive_web_graphql_skip_user_profile_image_extensions_enabled": False,
        "communities_web_enable_tweet_community_results_fetch": True,
        "c9s_tweet_anatomy_moderator_badge_enabled": True,
        "articles_preview_enabled": True,
        "tweetypie_unmention_optimization_enabled": True,
        "responsive_web_edit_tweet_api_enabled": True,
        "graphql_is_translatable_rweb_tweet_is_translatable_enabled": True,
        "view_counts_everywhere_api_enabled": True,
        "longform_notetweets_consumption_enabled": True,
        "responsive_web_twitter_article_tweet_consumption_enabled": True,
        "tweet_awards_web_tipping_enabled": False,
        "creator_subscriptions_quote_tweet_preview_enabled": False,
        "freedom_of_speech_not_reach_fetch_enabled": True,
        "standardized_nudges_misinfo": True,
        "tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled": True,
        "rweb_video_timestamps_enabled": True,
        "longform_notetweets_rich_text_read_enabled": True,
        "longform_notetweets_inline_media_enabled": True,
        "responsive_web_enhance_cards_enabled": False,
    })
    
    # Features for UserTweets API
    USER_TWEETS = json_dumps({
        "rweb_video_screen_enabled": False,
        "profile_label_improvements_pcf_label_in_post_enabled": True,
        "responsive_web_profile_redirect_enabled": False,
        "rweb_tipjar_consumption_enabled": False,
        "verified_phone_label_enabled": False,
        "creator_subscriptions_tweet_preview_api_enabled": True,
        "responsive_web_graphql_timeline_navigation_enabled": True,
        "responsive_web_graphql_skip_user_profile_image_extensions_enabled": False,
        "premium_content_api_read_enabled": False,
        "communities_web_enable_tweet_community_results_fetch": True,
        "c9s_tweet_anatomy_moderator_badge_enabled": True,
        "responsive_web_grok_analyze_button_fetch_trends_enabled": False,
        "responsive_web_grok_analyze_post_followups_enabled": True,
        "responsive_web_jetfuel_frame": True,
        "responsive_web_grok_share_attachment_enabled": True,
        "responsive_web_grok_annotations_enabled": True,
        "articles_preview_enabled": True,
        "responsive_web_edit_tweet_api_enabled": True,
        "graphql_is_translatable_rweb_tweet_is_translatable_enabled": True,
        "view_counts_everywhere_api_enabled": True,
        "longform_notetweets_consumption_enabled": True,
        "responsive_web_twitter_article_tweet_consumption_enabled": True,
        "content_disclosure_indicator_enabled": True,
        "content_disclosure_ai_generated_indicator_enabled": True,
        "responsive_web_grok_show_grok_translated_post": False,
        "responsive_web_grok_analysis_button_from_backend": True,
        "post_ctas_fetch_enabled": True,
        "freedom_of_speech_not_reach_fetch_enabled": True,
        "standardized_nudges_misinfo": True,
        "tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled": True,
        "longform_notetweets_rich_text_read_enabled": True,
        "longform_notetweets_inline_media_enabled": False,
        "responsive_web_grok_image_annotation_enabled": True,
        "responsive_web_grok_imagine_annotation_enabled": True,
        "responsive_web_grok_community_note_auto_translation_is_enabled": False,
        "responsive_web_enhance_cards_enabled": False,
    })
    
    # Features for ListByRestId API
    LIST_BY_REST_ID = json_dumps({
        "rweb_tipjar_consumption_enabled": True,
        "responsive_web_graphql_exclude_directive_enabled": True,
        "verified_phone_label_enabled": False,
        "responsive_web_graphql_skip_user_profile_image_extensions_enabled": False,
        "responsive_web_graphql_timeline_navigation_enabled": True,
    })
    
    # Features for ListMembers API
    LIST_MEMBERS = json_dumps({
        "rweb_tipjar_consumption_enabled": True,
        "responsive_web_graphql_exclude_directive_enabled": True,
        "verified_phone_label_enabled": False,
        "creator_subscriptions_tweet_preview_api_enabled": True,
        "responsive_web_graphql_timeline_navigation_enabled": True,
        "responsive_web_graphql_skip_user_profile_image_extensions_enabled": False,
        "communities_web_enable_tweet_community_results_fetch": True,
        "c9s_tweet_anatomy_moderator_badge_enabled": True,
        "articles_preview_enabled": True,
        "tweetypie_unmention_optimization_enabled": True,
        "responsive_web_edit_tweet_api_enabled": True,
        "graphql_is_translatable_rweb_tweet_is_translatable_enabled": True,
        "view_counts_everywhere_api_enabled": True,
        "longform_notetweets_consumption_enabled": True,
        "responsive_web_twitter_article_tweet_consumption_enabled": True,
        "tweet_awards_web_tipping_enabled": False,
        "creator_subscriptions_quote_tweet_preview_enabled": False,
        "freedom_of_speech_not_reach_fetch_enabled": True,
        "standardized_nudges_misinfo": True,
        "tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled": True,
        "rweb_video_timestamps_enabled": True,
        "longform_notetweets_rich_text_read_enabled": True,
        "longform_notetweets_inline_media_enabled": True,
        "responsive_web_enhance_cards_enabled": False,
    })
    
    # Features for Following API (same as ListMembers)
    FOLLOWING = LIST_MEMBERS
    
    # Features for Home Timeline API (For You feed)
    HOME_TIMELINE = json_dumps({
        "rweb_tipjar_consumption_enabled": True,
        "responsive_web_graphql_exclude_directive_enabled": True,
        "verified_phone_label_enabled": False,
        "creator_subscriptions_tweet_preview_api_enabled": True,
        "responsive_web_graphql_timeline_navigation_enabled": True,
        "responsive_web_graphql_skip_user_profile_image_extensions_enabled": False,
        "communities_web_enable_tweet_community_results_fetch": True,
        "c9s_tweet_anatomy_moderator_badge_enabled": True,
        "articles_preview_enabled": True,
        "tweetypie_unmention_optimization_enabled": True,
        "responsive_web_edit_tweet_api_enabled": True,
        "graphql_is_translatable_rweb_tweet_is_translatable_enabled": True,
        "view_counts_everywhere_api_enabled": True,
        "longform_notetweets_consumption_enabled": True,
        "responsive_web_twitter_article_tweet_consumption_enabled": True,
        "tweet_awards_web_tipping_enabled": False,
        "creator_subscriptions_quote_tweet_preview_enabled": False,
        "freedom_of_speech_not_reach_fetch_enabled": True,
        "standardized_nudges_misinfo": True,
        "tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled": True,
        "rweb_video_timestamps_enabled": True,
        "longform_notetweets_rich_text_read_enabled": True,
        "longform_notetweets_inline_media_enabled": True,
        "responsive_web_enhance_cards_enabled": False,
    })
    
    # Features for Home Latest Timeline API (Following feed - same as Home Timeline)
    HOME_LATEST_TIMELINE = HOME_TIMELINE
    
    # Field toggles
    FIELD_TOGGLES_WITH_ARTICLE = '{"withArticlePlainText":false}'
    FIELD_TOGGLES_USER_LABELS = '{"withAuxiliaryUserLabels":false}'
