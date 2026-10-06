import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseThreadLink } from '../src/threadLink';
import { readThread, ThreadError } from '../src/server/thread';
import type { QueueItem } from '../src/shared';

test('Reddit post URLs, old/mobile hosts, relative links and redd.it short links', () => {
  for (const link of [
    ' https://www.reddit.com/r/Example/comments/AbC123/a_title/?utm_source=share ',
    'https://old.reddit.com/r/Example/comments/abc123/a_title/',
    'http://m.reddit.com/comments/abc123/a_title/',
    'reddit.com/r/Example/comments/abc123',
    '/r/Example/comments/abc123/a_title/',
    'https://redd.it/AbC123',
    'https://reddit.com/comments/abc123.json',
  ]) assert.deepEqual(parseThreadLink(link), { postId: 't3_abc123' });
});

test('comment permalink retains the target and ignores tracking parameters', () => {
  assert.deepEqual(parseThreadLink('https://reddit.com/r/example/comments/abc123/title/Def456/?context=3#comment'),
    { postId: 't3_abc123', commentId: 't1_def456' });
});

test('reject unrelated URLs, deceptive hosts and non-thread paths', () => {
  for (const link of [
    '', 'https://example.com/comments/abc123', 'https://reddit.com.evil.test/comments/abc123',
    'https://reddit.com@evil.test/comments/abc123', 'https://evil.test@reddit.com/comments/abc123',
    'https://reddit.com:444/comments/abc123', 'javascript:alert(1)',
    'https://reddit.com/r/example', 'https://reddit.com/comments/abc123/title/comment/extra',
  ]) assert.throws(() => parseThreadLink(link), Error, link);
});

test('opaque share links explain which permalink is needed', () => {
  assert.throws(() => parseThreadLink('https://reddit.com/r/example/s/abcdef'), /\/comments\//);
});

const post = { id: 't3_abc123', type: 'post', subreddit: 'Example' } as QueueItem;
const root = { id: 't1_root', type: 'comment', subreddit: 'Example', postId: post.id, parentId: post.id } as QueueItem;
const parent = { ...root, id: 't1_parent', parentId: root.id };
const target = { ...root, id: 't1_def456', parentId: parent.id };
const link = 'https://reddit.com/r/Example/comments/abc123/title/def456/';

test('opens an arbitrary post independently of the feed and focuses its post', async () => {
  const data = await readThread('https://redd.it/abc123', 'example', {
    post: async (id) => { assert.equal(id, post.id); return post; },
    comments: async (id) => { assert.equal(id, post.id); return [root]; },
    comment: async () => { throw new Error('Unexpected individual lookup'); },
  });
  assert.equal(data.post, post);
  assert.deepEqual(data.comments, [root]);
  assert.equal(data.focusedId, post.id);
});

test('uses the actual post community, rejecting cross-community access before loading comments', async () => {
  let loadedComments = false;
  await assert.rejects(readThread(link, 'another', {
    post: async () => post,
    comments: async () => { loadedComments = true; return []; },
    comment: async () => target,
  }), (error: unknown) => error instanceof ThreadError && error.status === 403);
  assert.equal(loadedComments, false);
});

test('focuses an existing linked comment without duplicate lookups', async () => {
  const data = await readThread(link, 'example', {
    post: async () => post, comments: async () => [root, parent, target],
    comment: async () => { throw new Error('Unexpected individual lookup'); },
  });
  assert.equal(data.focusedId, target.id);
  assert.equal(data.comments.length, 3);
});

test('recovers a deep comment with ancestors missing from the initial listing', async () => {
  const data = await readThread(link, 'example', {
    post: async () => post, comments: async () => [root],
    comment: async (id) => {
      if (id === target.id) return target;
      if (id === parent.id) return parent;
      throw new Error('Unexpected comment lookup');
    },
  });
  assert.deepEqual(data.comments.map((item) => item.id), [root.id, parent.id, target.id]);
  assert.equal(data.focusedId, target.id);
});

test('rejects a comment belonging to a different post', async () => {
  await assert.rejects(readThread(link, 'example', {
    post: async () => post, comments: async () => [],
    comment: async () => ({ ...target, postId: 't3_other' }),
  }), /does not belong/);
});

test('unavailable posts and linked comments give a useful not-found response', async () => {
  await assert.rejects(readThread(link, 'example', {
    post: async () => { throw new Error('Reddit API error'); },
    comments: async () => [], comment: async () => target,
  }), (error: unknown) => error instanceof ThreadError && error.status === 404);
  await assert.rejects(readThread(link, 'example', {
    post: async () => post, comments: async () => [],
    comment: async () => { throw new Error('Deleted comment'); },
  }), (error: unknown) => error instanceof ThreadError && error.status === 404);
});

test('comment lookup cycles cannot loop indefinitely', async () => {
  let lookups = 0;
  const data = await readThread(link, 'example', {
    post: async () => post, comments: async () => [],
    comment: async (id) => { lookups++; return id === target.id ? target : { ...parent, parentId: target.id }; },
  });
  assert.equal(lookups, 2);
  assert.equal(data.comments.length, 2);
});

test('invalid URLs are rejected before accessing Reddit', async () => {
  let lookups = 0;
  await assert.rejects(readThread('https://evil.test/comments/abc123', 'example', {
    post: async () => { lookups++; return post; }, comments: async () => [], comment: async () => target,
  }), (error: unknown) => error instanceof ThreadError && error.status === 400);
  assert.equal(lookups, 0);
});
