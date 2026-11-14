import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveTranslateArea,
  getTweetTextFromTranslateArea,
} from './translateArea.js';

function mockEl({ id, className, text, previousElementSibling } = {}) {
  return {
    id,
    className,
    textContent: text ?? '',
    previousElementSibling: previousElementSibling ?? null,
    closest(selector) {
      if (selector === '.tweet-translate-area' && className === 'tweet-translate-area') {
        return this;
      }
      return null;
    },
  };
}

test('resolveTranslateArea finds timeline translate-{id} container', () => {
  const area = mockEl({ id: 'translate-99', className: 'tweet-translate-area' });
  const map = new Map([[area.id, area]]);
  const found = resolveTranslateArea('99', {
    getElementById: (id) => map.get(id) ?? null,
  });
  assert.equal(found, area);
});

test('resolveTranslateArea finds tweet-detail translate-detail-{id} container', () => {
  const area = mockEl({ id: 'translate-detail-42', className: 'tweet-translate-area' });
  const map = new Map([[area.id, area]]);
  const found = resolveTranslateArea('42', {
    getElementById: (id) => map.get(id) ?? null,
  });
  assert.equal(found, area);
});

test('resolveTranslateArea prefers button.closest over id lookup', () => {
  const replyArea = mockEl({ id: 'translate-detail-7', className: 'tweet-translate-area' });
  const wrongArea = mockEl({ id: 'translate-7', className: 'tweet-translate-area' });
  const map = new Map([
    [replyArea.id, replyArea],
    [wrongArea.id, wrongArea],
  ]);
  const button = {
    closest(selector) {
      if (selector === '.tweet-translate-area') {
        return replyArea;
      }
      return null;
    },
  };
  const found = resolveTranslateArea('7', {
    getElementById: (id) => map.get(id) ?? null,
    buttonEl: button,
  });
  assert.equal(found, replyArea);
});

test('getTweetTextFromTranslateArea reads preceding sibling text', () => {
  const textEl = mockEl({ text: 'Hello from a reply' });
  const area = mockEl({ className: 'tweet-translate-area', previousElementSibling: textEl });
  assert.equal(getTweetTextFromTranslateArea(area), 'Hello from a reply');
});