#!/usr/bin/env node
/**
 * Fetch a live UserMedia GraphQL response and print redacted parse diagnostics.
 * Requires X credentials in the environment (never pass on argv):
 *   X_AUTH_TOKEN, X_CT0, optional X_BEARER
 *
 * Usage:
 *   SCREEN_NAME=someuser node scripts/inspect-user-media.mjs
 */
import { readFileSync } from 'node:fs';
import { createXApi } from '../functions/lib/xapi.js';
import { parseMediaList, summarizeUserMediaResponse } from '../functions/lib/parsers.js';

const screenName = process.env.SCREEN_NAME || process.argv[2];
if (!screenName) {
  console.error('Set SCREEN_NAME=... or pass screen name as first argument.');
  process.exit(1);
}

if (!process.env.X_AUTH_TOKEN || !process.env.X_CT0) {
  console.error('Blocked: X_AUTH_TOKEN and X_CT0 are required for live upstream verification.');
  console.error('Copy .dev.vars.example → .dev.vars or export vars locally (do not commit).');
  process.exit(2);
}

const env = {
  X_AUTH_TOKEN: process.env.X_AUTH_TOKEN,
  X_CT0: process.env.X_CT0,
  X_BEARER: process.env.X_BEARER,
};

const api = createXApi(env);
const user = await api.getUserByScreenName(screenName);
if (!user) {
  console.error(`User not found: ${screenName}`);
  process.exit(3);
}

// Re-fetch raw JSON by mirroring getUserMedia params inside xapi (parse only path here).
const { media, nextCursor, sources } = await api.getUserMediaWithRetweets(user.id, {
  count: 40,
});
const outPath = process.env.DUMP_PATH;
let raw = null;
if (outPath) {
  try {
    raw = JSON.parse(readFileSync(outPath, 'utf8'));
  } catch (e) {
    console.error(`Could not read DUMP_PATH ${outPath}:`, e.message);
  }
}

console.log(
  JSON.stringify(
    {
      screen_name: screenName,
      user_id: user.id,
      parsed_media_count: media.length,
      media_sources: sources,
      next_cursor: nextCursor ? `${nextCursor.slice(0, 8)}…` : '',
      sample_media_ids: media.slice(0, 5).map((m) => m.media_id || m.tweet_id),
      raw_summary: raw ? summarizeUserMediaResponse(raw) : null,
      note: raw
        ? null
        : 'Set DUMP_PATH=/path/to/usermedia.json to summarize raw upstream (save from browser network tab).',
    },
    null,
    2
  )
);
