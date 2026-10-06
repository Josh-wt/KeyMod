import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hostPostFallback, hostPostWebUrl } from '../src/server/hostPostFallback';

test('host post navigation opens current Reddit for old-Reddit users', () => {
  assert.equal(hostPostWebUrl('t3_abc123'), 'https://sh.reddit.com/comments/abc123/');
  assert.equal(hostPostWebUrl('abc123'), 'https://sh.reddit.com/comments/abc123/');
  for (const id of ['', 't1_abc123', '../abc', 'abc?redirect=old', 'https://evil.test']) {
    assert.throws(() => hostPostWebUrl(id));
  }
});

test('existing host fallback contains a direct link to that workspace post', () => {
  const text = hostPostFallback('example', 't3_abc123');
  assert.ok(text.includes('[Open KeyModerator](https://sh.reddit.com/comments/abc123/)'));
  assert.ok(text.includes('moderator account'));
  assert.ok(!text.includes('content not supported'));
});

test('fallback before post creation provides a community link', () => {
  const text = hostPostFallback('example');
  assert.ok(text.includes('[Open KeyModerator](https://sh.reddit.com/r/example/)'));
});
