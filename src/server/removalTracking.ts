import type { RedisClient } from '@devvit/redis';
import type { CommentRemovalEvent, RemovalLeaderboard } from '../shared';

// Every key is scoped explicitly, in addition to Devvit's installation isolation.
function keys(subredditId: string) {
  const prefix = `comment-removals:v1:${subredditId}`;
  return {
    scores: `${prefix}:scores`,
    recent: `${prefix}:recent`,
    active: (id: string) => `${prefix}:active:${id}`,
    event: (id: string) => `${prefix}:event:${id}`,
  };
}

export async function recordCommentRemoval(redis: RedisClient, subredditId: string, event: CommentRemovalEvent): Promise<void> {
  const k = keys(subredditId);
  const activeKey = k.active(event.commentId);
  const eventKey = k.event(event.id);
  for (let attempt = 0; attempt < 3; attempt++) {
    const tx = await redis.watch(activeKey, eventKey);
    try {
      // A repeated request or an already removed comment must not inflate the score.
      if (await redis.get(activeKey) || await redis.get(eventKey)) {
        await tx.unwatch();
        return;
      }
      await tx.multi();
      await tx.set(activeKey, event.id);
      await tx.set(eventKey, JSON.stringify(event));
      await tx.zAdd(k.recent, { member: event.id, score: event.removedAt });
      await tx.zIncrBy(k.scores, event.moderator.toLowerCase(), 1);
      const result = await tx.exec();
      if (result?.length) return;
    } catch (error) {
      await tx.discard().catch(() => undefined);
      if (attempt === 2) throw error;
    }
  }
  throw new Error('Comment removal tracking could not be saved.');
}

export async function restoreTrackedComment(
  redis: RedisClient,
  subredditId: string,
  commentId: string,
  restoredBy: string,
  batchId?: string,
): Promise<void> {
  const k = keys(subredditId);
  const activeKey = k.active(commentId);
  for (let attempt = 0; attempt < 3; attempt++) {
    const tx = await redis.watch(activeKey);
    try {
      const eventId = await redis.get(activeKey);
      const raw = eventId ? await redis.get(k.event(eventId)) : undefined;
      const event: CommentRemovalEvent | null = raw ? JSON.parse(raw) : null;
      if (!event || event.restoredAt || (batchId && event.batchId !== batchId)) {
        await tx.unwatch();
        return;
      }
      await tx.multi();
      await tx.del(activeKey);
      await tx.set(k.event(event.id), JSON.stringify({ ...event, restoredAt: Date.now(), restoredBy }));
      await tx.zIncrBy(k.scores, event.moderator.toLowerCase(), -1);
      const result = await tx.exec();
      if (result?.length) return;
    } catch (error) {
      await tx.discard().catch(() => undefined);
      if (attempt === 2) throw error;
    }
  }
  throw new Error('Comment restoration tracking could not be saved.');
}

export async function readRemovalLeaderboard(redis: RedisClient, subredditId: string, subreddit: string): Promise<RemovalLeaderboard> {
  const k = keys(subredditId);
  const [scores, recentIds] = await Promise.all([
    redis.zRange(k.scores, 0, 99, { by: 'rank', reverse: true }),
    redis.zRange(k.recent, 0, 49, { by: 'rank', reverse: true }),
  ]);
  const recentValues = recentIds.length ? await redis.mGet(recentIds.map(({ member }) => k.event(member))) : [];
  return {
    subreddit,
    rows: scores.filter(({ score }) => score > 0).map(({ member, score }) => ({ moderator: member, removals: score })),
    recent: recentValues.flatMap((value) => value ? [JSON.parse(value) as CommentRemovalEvent] : []),
  };
}
