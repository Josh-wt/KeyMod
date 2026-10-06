import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { RedisClient } from '@devvit/redis';
import type { CommentRemovalEvent } from '../src/shared';
import { recordCommentRemoval, restoreTrackedComment, readRemovalLeaderboard } from '../src/server/removalTracking';

function memoryRedis() {
  const strings = new Map<string, string>();
  const sets = new Map<string, Map<string, number>>();
  const versions = new Map<string, number>();
  let aborts = 0;
  const change = (key: string) => versions.set(key, (versions.get(key) ?? 0) + 1);
  const store = {
    get: async (key: string) => strings.get(key),
    mGet: async (keys: string[]) => keys.map((key) => strings.get(key) ?? null),
    zRange: async (key: string, start: number, stop: number) => [...(sets.get(key) ?? [])]
      .map(([member, score]) => ({ member, score })).sort((a, b) => b.score - a.score).slice(start, stop + 1),
    watch: async (...keys: string[]) => {
      const watched = keys.map((key) => [key, versions.get(key) ?? 0] as const);
      const commands: Array<() => unknown> = [];
      const tx = {
        multi: async () => {},
        unwatch: async () => tx,
        discard: async () => { commands.length = 0; },
        set: async (key: string, value: string) => { commands.push(() => { strings.set(key, value); change(key); }); return tx; },
        del: async (key: string) => { commands.push(() => { strings.delete(key); change(key); }); return tx; },
        zAdd: async (key: string, entry: { member: string; score: number }) => {
          commands.push(() => { const set = sets.get(key) ?? new Map(); set.set(entry.member, entry.score); sets.set(key, set); change(key); }); return tx;
        },
        zIncrBy: async (key: string, member: string, amount: number) => {
          commands.push(() => { const set = sets.get(key) ?? new Map(); set.set(member, (set.get(member) ?? 0) + amount); sets.set(key, set); change(key); }); return tx;
        },
        exec: async () => {
          if (aborts > 0) { aborts--; return []; }
          if (watched.some(([key, version]) => version !== (versions.get(key) ?? 0))) return [];
          return commands.map((command) => { command(); return 'OK'; });
        },
      };
      return tx;
    },
  };
  return { client: store as unknown as RedisClient, abortNext: (count = 1) => { aborts = count; } };
}

function removal(overrides: Partial<CommentRemovalEvent> = {}): CommentRemovalEvent {
  return { id: 'batch1:t1_comment', batchId: 'batch1', commentId: 't1_comment', author: 'author',
    moderator: 'HumanMod', permalink: '/r/example/comments/post/title/comment',
    removedAt: 100, reason: 'Rule 1', asSpam: false, ...overrides };
}

test('stores the human initiator and audit details with a per-subreddit score', async () => {
  const { client } = memoryRedis();
  await recordCommentRemoval(client, 't5_one', removal());
  const board = await readRemovalLeaderboard(client, 't5_one', 'example');
  assert.deepEqual(board.rows, [{ moderator: 'humanmod', removals: 1 }]);
  assert.equal(board.recent[0]?.moderator, 'HumanMod');
  assert.equal(board.recent[0]?.reason, 'Rule 1');
  assert.deepEqual((await readRemovalLeaderboard(client, 't5_other', 'other')).rows, []);
});

test('duplicate and concurrent removals of the same comment count once', async () => {
  const { client } = memoryRedis();
  await Promise.all([
    recordCommentRemoval(client, 'sub', removal()),
    recordCommentRemoval(client, 'sub', removal({ id: 'batch2:t1_comment', batchId: 'batch2' })),
  ]);
  await recordCommentRemoval(client, 'sub', removal());
  const board = await readRemovalLeaderboard(client, 'sub', 'example');
  assert.equal(board.rows[0]?.removals, 1);
  assert.equal(board.recent.length, 1);
});

test('undo subtracts only once, keeps attribution, and a later removal counts again', async () => {
  const { client } = memoryRedis();
  await recordCommentRemoval(client, 'sub', removal());
  await Promise.all([
    restoreTrackedComment(client, 'sub', 't1_comment', 'OtherMod', 'batch1'),
    restoreTrackedComment(client, 'sub', 't1_comment', 'OtherMod', 'batch1'),
  ]);
  let board = await readRemovalLeaderboard(client, 'sub', 'example');
  assert.deepEqual(board.rows, []);
  assert.equal(board.recent[0]?.restoredBy, 'OtherMod');
  assert.equal(board.recent[0]?.moderator, 'HumanMod');
  await recordCommentRemoval(client, 'sub', removal({ id: 'batch2:t1_comment', batchId: 'batch2', removedAt: 200 }));
  // An old batch must never undo a newer removal's score.
  await restoreTrackedComment(client, 'sub', 't1_comment', 'OtherMod', 'batch1');
  board = await readRemovalLeaderboard(client, 'sub', 'example');
  assert.equal(board.rows[0]?.removals, 1);
  assert.equal(board.recent.length, 2);
});

test('approval clears a tracked removal and does not affect another subreddit', async () => {
  const { client } = memoryRedis();
  await recordCommentRemoval(client, 'one', removal());
  await recordCommentRemoval(client, 'two', removal());
  await restoreTrackedComment(client, 'one', 't1_comment', 'ApprovingMod');
  assert.deepEqual((await readRemovalLeaderboard(client, 'one', 'one')).rows, []);
  assert.equal((await readRemovalLeaderboard(client, 'two', 'two')).rows[0]?.removals, 1);
});

test('retries aborted transactions and surfaces persistent storage failure', async () => {
  const { client, abortNext } = memoryRedis();
  abortNext();
  await recordCommentRemoval(client, 'sub', removal());
  assert.equal((await readRemovalLeaderboard(client, 'sub', 'example')).rows[0]?.removals, 1);
  abortNext(3);
  await assert.rejects(restoreTrackedComment(client, 'sub', 't1_comment', 'OtherMod'), /could not be saved/);
  assert.equal((await readRemovalLeaderboard(client, 'sub', 'example')).rows[0]?.removals, 1);
});

test('leaderboard orders multiple human moderators by successful comment removals', async () => {
  const { client } = memoryRedis();
  await recordCommentRemoval(client, 'sub', removal());
  await recordCommentRemoval(client, 'sub', removal({ id: 'batch:t1_two', commentId: 't1_two', moderator: 'SecondMod' }));
  await recordCommentRemoval(client, 'sub', removal({ id: 'batch:t1_three', commentId: 't1_three', moderator: 'SecondMod' }));
  assert.deepEqual((await readRemovalLeaderboard(client, 'sub', 'example')).rows,
    [{ moderator: 'secondmod', removals: 2 }, { moderator: 'humanmod', removals: 1 }]);
});
