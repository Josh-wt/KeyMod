import { test } from 'node:test';
import assert from 'node:assert/strict';
import { visibleModMenuEntries } from '../src/client/modActionLabels';
import { createModHandlers } from '../src/client/createModHandlers';
import type { QueueItem } from '../src/shared';

const comment: QueueItem = { id: 't1_comment', type: 'comment', title: '', body: 'Comment', author: 'author',
  authorId: 't2_author', subreddit: 'example', permalink: '/r/example/comments/post/title/comment',
  createdAt: 0, reportReasons: ['Spam'], numReports: 1 };

test('comment menus contain working comment actions and omit post-only and app-account actions', () => {
  const ids = visibleModMenuEntries(comment).map((entry) => entry.id);
  assert.deepEqual(ids, ['view', 'spam', 'lock', 'ignoreReports', 'user', 'note', 'ban']);
  const postIds = visibleModMenuEntries({ ...comment, type: 'post' }).map((entry) => entry.id);
  assert.ok(postIds.includes('flair'));
  assert.ok(postIds.includes('crowdControl'));
  assert.ok(!postIds.includes('distinguish'));
  assert.ok(!postIds.includes('mute'));
});

test('irrelevant report and deleted-author actions disappear', () => {
  const ids = visibleModMenuEntries({ ...comment, author: '[deleted]', numReports: 0, reportReasons: [] }).map((entry) => entry.id);
  assert.deepEqual(ids, ['view', 'spam', 'lock']);
  assert.ok(visibleModMenuEntries({ ...comment, numReports: 0, reportReasons: [], ignoringReports: true }).some((entry) => entry.id === 'ignoreReports'));
});

test('ignore reports on a comment reaches the server and applies its result', async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  const messages: string[] = [];
  let item = { ...comment };
  globalThis.fetch = async (input) => {
    calls.push(String(input));
    return new Response(JSON.stringify({ ok: 1, failed: 0, updates: [{ id: item.id, ignoringReports: true }] }),
      { headers: { 'content-type': 'application/json' } });
  };
  try {
    const handlers = createModHandlers({ removalReasons: [], findItem: () => item,
      refresh: () => {}, focusItem: () => {}, setOpenMenuId: () => {}, removeIds: () => {}, markApproved: () => {},
      patchItem: (_id, patch) => { item = { ...item, ...patch }; }, openModalForItem: () => {},
      openRemovalModal: () => {}, setUserPanel: () => {}, addToast: (message) => { messages.push(message); } });
    await handlers.menu(item, 'ignoreReports');
    assert.deepEqual(calls, ['/api/ignore-reports']);
    assert.equal(item.ignoringReports, true);
    assert.deepEqual(messages, ['Reports ignored.']);
  } finally { globalThis.fetch = originalFetch; }
});
