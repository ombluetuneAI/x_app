function normalizeProfileImageUrl(raw) {
  if (!raw) return '';
  return raw.replace('_normal', '_400x400');
}

/** Profile image from GraphQL User (legacy or avatar.image_url). */
export function profileImageUrlFromUserResult(userResult) {
  if (!userResult || userResult.__typename === 'UserUnavailable') return '';
  const userLegacy = userResult.legacy || {};
  const userCore = userResult.core || {};
  const raw =
    userLegacy.profile_image_url_https ||
    userCore.profile_image_url_https ||
    userResult.avatar?.image_url ||
    '';
  return normalizeProfileImageUrl(raw);
}

export function userFromDict(data) {
  const result = data?.result ?? data;
  if (!result || result.__typename === 'UserUnavailable') {
    return null;
  }
  const legacy = result.legacy || {};
  const profileImageRaw = legacy.profile_image_url_https || result.avatar?.image_url || '';
  return {
    id: String(result.rest_id || ''),
    name: legacy.name || '',
    screen_name: legacy.screen_name || '',
    description: legacy.description || '',
    location: legacy.location || '',
    url: legacy.url || '',
    profile_image_url: profileImageRaw,
    profile_banner_url: legacy.profile_banner_url || '',
    protected: legacy.protected || false,
    verified: legacy.verified || false,
    following: legacy.following || false,
    muting: legacy.muting || false,
    blocking: legacy.blocking || false,
    stats: {
      friends_count: legacy.friends_count || 0,
      followers_count: legacy.followers_count || 0,
      statuses_count: legacy.statuses_count || 0,
      media_count: legacy.media_count || 0,
      listed_count: legacy.listed_count || 0,
      favourites_count: legacy.favourites_count || 0,
    },
    created_at: legacy.created_at || '',
  };
}

export function userFromV1Dict(data) {
  let urlVal = data.url || '';
  if (urlVal && typeof urlVal === 'object') {
    const urls = urlVal.urls || [];
    urlVal = urls[0]?.expanded_url || '';
  }
  return {
    id: String(data.id_str || data.id || ''),
    name: data.name || '',
    screen_name: data.screen_name || '',
    description: data.description || '',
    location: data.location || '',
    url: urlVal,
    profile_image_url: data.profile_image_url_https || '',
    profile_banner_url: data.profile_banner_url || '',
    protected: data.protected || false,
    verified: data.verified || false,
    following: data.following || false,
    muting: data.muting || false,
    blocking: data.blocking || false,
    stats: {
      friends_count: data.friends_count || 0,
      followers_count: data.followers_count || 0,
      statuses_count: data.statuses_count || 0,
      media_count: data.media_count || 0,
      listed_count: data.listed_count || 0,
      favourites_count: data.favourites_count || 0,
    },
    created_at: data.created_at || '',
  };
}

export function userToDict(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    screen_name: user.screen_name,
    description: user.description,
    location: user.location,
    url: user.url,
    profile_image_url: user.profile_image_url
      ? user.profile_image_url.replace('_normal', '_400x400')
      : '',
    profile_banner_url: user.profile_banner_url,
    protected: user.protected,
    verified: user.verified,
    following: user.following,
    muting: user.muting,
    blocking: user.blocking,
    stats: user.stats,
    created_at: user.created_at,
  };
}

export function mediaFromDict(data) {
  const mediaType = data.type || '';
  let mediaUrl = data.media_url_https || '';
  let videoUrl = '';
  let duration = 0;

  if (mediaType === 'video' || mediaType === 'animated_gif') {
    const videoInfo = data.video_info || {};
    const variants = videoInfo.variants || [];
    let maxBitrate = 0;
    for (const v of variants) {
      if (v.content_type === 'video/mp4') {
        const bitrate = v.bitrate || 1;
        if (bitrate > maxBitrate) {
          maxBitrate = bitrate;
          videoUrl = v.url || '';
        }
      }
    }
    if (videoUrl && videoUrl.includes('?')) {
      const [baseUrl, query] = videoUrl.split('?');
      if (query.includes('tag=')) {
        const tag = query.split('tag=')[1].split('&')[0];
        videoUrl = `${baseUrl}?tag=${tag}`;
      } else {
        videoUrl = baseUrl;
      }
    }
    duration = (videoInfo.duration_millis || 0) / 1000;
  }

  const sizes = data.sizes?.large || {};
  return {
    type: mediaType,
    url: mediaUrl,
    video_url: videoUrl,
    width: sizes.w || 0,
    height: sizes.h || 0,
    duration,
    tweet_id: data.tweet_id || '',
    tweet_text: data.tweet_text || '',
  };
}

export function tweetFromDict(data) {
  let result = data?.result ?? data;
  if (!result) return null;
  if (result.promotedMetadata) return null;
  if (result.tweet) {
    if (result.tweet.promotedMetadata) return null;
    result = result.tweet;
  }

  const legacy = result.legacy || {};
  const core = result.core || {};
  const userResult = core.user_results?.result || {};

  const userCore = userResult.core || {};
  let userId = String(userResult.rest_id || '');
  let userName = userCore.name || '';
  let screenName = userCore.screen_name || '';

  if (!userName && !screenName) {
    const userLegacy = userResult.legacy || {};
    userName = userLegacy.name || '';
    screenName = userLegacy.screen_name || '';
  }

  const profileImageUrl = profileImageUrlFromUserResult(userResult);

  let mediaList = legacy.extended_entities?.media || [];
  if (!mediaList.length) {
    mediaList = legacy.entities?.media || [];
  }

  if (!mediaList.length && result.card) {
    const card = result.card || {};
    const cardLegacy = card.legacy || {};
    let bindingValues = cardLegacy.binding_values || {};
    const valuesToCheck = Array.isArray(bindingValues)
      ? bindingValues
      : Object.values(bindingValues);

    for (const value of valuesToCheck) {
      if (value?.type === 'IMAGE') {
        const imageUrl = value.image_value?.url || '';
        if (imageUrl) {
          mediaList.push({ type: 'photo', media_url_https: imageUrl, media_url: imageUrl });
        }
      } else if (value?.type === 'VIDEO') {
        const videoInfo = value.video_value || {};
        const thumbnailUrl = videoInfo.thumbnail_url || '';
        const variants = videoInfo.variants || [];
        if (thumbnailUrl) {
          const mediaItem = {
            type: 'video',
            media_url_https: thumbnailUrl,
            media_url: thumbnailUrl,
          };
          if (variants.length) mediaItem.video_info = { variants };
          mediaList.push(mediaItem);
        }
      }
    }
  }

  const media = mediaList.map(mediaFromDict);

  const stats = {
    favorite_count: legacy.favorite_count || 0,
    retweet_count: legacy.retweet_count || 0,
    reply_count: legacy.reply_count || 0,
    quote_count: legacy.quote_count || 0,
    view_count: parseInt(result.views?.count || 0, 10) || 0,
  };

  let retweetedTweet = null;
  const retweetedStatus = legacy.retweeted_status_result || result.retweeted_status_result;
  if (retweetedStatus) {
    try {
      retweetedTweet = tweetFromDict(retweetedStatus);
    } catch {
      retweetedTweet = null;
    }
  }

  let quotedTweet = null;
  const quotedStatus = legacy.quoted_status_result || result.quoted_status_result;
  if (quotedStatus) {
    try {
      quotedTweet = tweetFromDict(quotedStatus);
    } catch {
      quotedTweet = null;
    }
  }

  let tweetText = legacy.full_text || legacy.text || '';
  let noteText = '';
  let noteTweet = result.note_tweet || legacy.note_tweet;
  if (noteTweet) {
    const noteResult = noteTweet.note_tweet_results?.result;
    if (noteResult && typeof noteResult === 'object') {
      noteText = noteResult.text || '';
      if (noteText) tweetText = noteText;
    }
  }

  const entities = legacy.entities || {};
  let urlEntities = entities.urls || [];

  if (noteTweet) {
    const noteResult = noteTweet.note_tweet_results?.result;
    if (noteResult && typeof noteResult === 'object') {
      const noteEnts = noteResult.entity_set || noteResult.entities || {};
      const noteUrlEntities = noteEnts.urls || [];
      if (noteUrlEntities.length && noteText) {
        urlEntities = noteUrlEntities;
      }
    }
  }

  if (urlEntities.length) {
    const sorted = urlEntities
      .filter((u) => u.indices)
      .sort((a, b) => b.indices[0] - a.indices[0]);
    for (const urlEnt of sorted) {
      const expanded = urlEnt.expanded_url || '';
      if (expanded) {
        const [start, end] = urlEnt.indices;
        if (start < tweetText.length && end <= tweetText.length) {
          tweetText = tweetText.slice(0, start) + expanded + tweetText.slice(end);
        }
      }
    }
  }

  const mediaEntities = entities.media || [];
  if (mediaEntities.length) {
    for (const m of [...mediaEntities].reverse()) {
      const indices = m.indices;
      if (indices) {
        let [start, end] = indices;
        if (start > 0 && tweetText[start - 1] === ' ') start -= 1;
        tweetText = tweetText.slice(0, start) + tweetText.slice(end);
      }
    }
    tweetText = tweetText.trimEnd();
  }

  return {
    id: String(result.rest_id || legacy.id_str || ''),
    text: tweetText,
    created_at: legacy.created_at || '',
    user_id: userId,
    user_name: userName,
    screen_name: screenName,
    profile_image_url: profileImageUrl,
    media,
    stats,
    in_reply_to_status_id: legacy.in_reply_to_status_id_str || null,
    in_reply_to_user_id: legacy.in_reply_to_user_id_str || null,
    is_quote_status: legacy.is_quote_status || false,
    quoted_tweet_id: legacy.quoted_status_id_str || null,
    quoted_tweet: quotedTweet,
    retweeted_tweet_id: legacy.retweeted_status_id_str || null,
    retweeted_tweet: retweetedTweet,
  };
}

export function tweetToDict(tweet) {
  if (!tweet) return null;
  return {
    id: tweet.id,
    text: tweet.text,
    created_at: tweet.created_at,
    user_id: tweet.user_id,
    user_name: tweet.user_name,
    screen_name: tweet.screen_name,
    profile_image_url: tweet.profile_image_url,
    media: tweet.media.map((m) => ({ ...m })),
    stats: tweet.stats,
    in_reply_to_status_id: tweet.in_reply_to_status_id,
    in_reply_to_user_id: tweet.in_reply_to_user_id,
    is_quote_status: tweet.is_quote_status,
    quoted_tweet_id: tweet.quoted_tweet_id,
    quoted_tweet: tweetToDict(tweet.quoted_tweet),
    retweeted_tweet_id: tweet.retweeted_tweet_id,
    retweeted_tweet: tweetToDict(tweet.retweeted_tweet),
  };
}
