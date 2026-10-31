import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getVideoClipboardUrl,
  isAbsoluteHttpsMediaUrl,
  resolveAbsolutePlaybackUrl,
} from './videoCopyUrl.js';

const ORIGIN = 'https://x-xiaoxu.pages.dev';
const RAW =
  'https://video.twimg.com/ext_tw_video/123/pu/vid/abc.mp4?tag=12';
const ENCODED = encodeURIComponent(RAW);

test('resolveAbsolutePlaybackUrl keeps absolute https URLs', () => {
  assert.equal(resolveAbsolutePlaybackUrl(RAW, ORIGIN), RAW);
  assert.equal(
    resolveAbsolutePlaybackUrl(`https://pz.example.com?url=${ENCODED}`, ORIGIN),
    `https://pz.example.com?url=${ENCODED}`
  );
});

test('resolveAbsolutePlaybackUrl expands site-relative /api/media proxy paths', () => {
  const relative = `/api/media?url=${ENCODED}`;
  assert.equal(
    resolveAbsolutePlaybackUrl(relative, ORIGIN),
    `${ORIGIN}/api/media?url=${ENCODED}`
  );
});

test('resolveAbsolutePlaybackUrl supports protocol-relative CDN URLs', () => {
  assert.equal(
    resolveAbsolutePlaybackUrl('//video.twimg.com/foo.mp4', ORIGIN),
    'https://video.twimg.com/foo.mp4'
  );
});

test('getVideoClipboardUrl prefers proxied playback URL over raw direct twimg', () => {
  const relative = `/api/media?url=${ENCODED}`;
  const copied = getVideoClipboardUrl({
    playbackUrl: relative,
    rawVideoUrl: RAW,
    origin: ORIGIN,
  });
  assert.equal(copied, `${ORIGIN}/api/media?url=${ENCODED}`);
  assert.equal(isAbsoluteHttpsMediaUrl(copied), true);
});

test('getVideoClipboardUrl returns direct twimg when proxy disabled (playback is raw)', () => {
  const copied = getVideoClipboardUrl({
    playbackUrl: RAW,
    rawVideoUrl: RAW,
    origin: ORIGIN,
  });
  assert.equal(copied, RAW);
});

test('getVideoClipboardUrl handles external absolute proxy prefix', () => {
  const external = `https://pz.v88.qzz.io?url=${ENCODED}`;
  const copied = getVideoClipboardUrl({
    playbackUrl: external,
    rawVideoUrl: RAW,
    origin: ORIGIN,
  });
  assert.equal(copied, external);
});

test('getVideoClipboardUrl returns empty when no usable URL', () => {
  assert.equal(getVideoClipboardUrl({ playbackUrl: '/only-relative', origin: '' }), '');
  assert.equal(getVideoClipboardUrl({}), '');
});
