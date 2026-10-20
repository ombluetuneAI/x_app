import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedMediaUrl } from './mediaProxy.js';

test('isAllowedMediaUrl allows twimg CDN hosts', () => {
  assert.equal(isAllowedMediaUrl('https://pbs.twimg.com/media/abc.jpg'), true);
  assert.equal(isAllowedMediaUrl('https://video.twimg.com/ext_tw_video/foo.mp4'), true);
  assert.equal(isAllowedMediaUrl('https://ton.twimg.com/fonts/foo.woff2'), true);
});

test('isAllowedMediaUrl rejects non-twimg and non-https', () => {
  assert.equal(isAllowedMediaUrl('https://example.com/x.jpg'), false);
  assert.equal(isAllowedMediaUrl('http://pbs.twimg.com/media/x.jpg'), false);
  assert.equal(isAllowedMediaUrl('not-a-url'), false);
});
