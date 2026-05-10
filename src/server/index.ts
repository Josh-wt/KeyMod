import { Hono } from 'hono';
import { v4 as uuid } from 'uuid';
import { resolveSettings } from '../settings';
import type { AutomodPanelData, AutomodValidation, ModLogMatrix, NotificationCounts, QueueItem, UserInfo } from '../shared';

type DevvitContext = {
  reddit?: Record<string, any>;
  redis?: Record<string, any>;
  scheduler?: Record<string, any>;
  settings?: Record<string, any>;
  userId?: string;
  subredditId?: string;
  subredditName?: string;
};

type Env = {
  Variables: {
    devvit?: DevvitContext;
  };
};

const app = new Hono<Env>();

function context(c: { get: (key: string) => unknown }): DevvitContext {
  return (c.get('devvit') as DevvitContext | undefined) ?? {};
}

async function callFirst<T>(target: Record<string, any> | undefined, names: string[], ...args: unknown[]): Promise<T> {
  for (const name of names) {
    const fn = target?.[name];
    if (typeof fn === 'function') return fn.apply(target, args) as Promise<T>;
  }
  throw new Error(`Missing Reddit API method: ${names.join(' or ')}`);
}

async function assertModerator(ctx: DevvitContext) {
  const reddit = ctx.reddit;
  if (!reddit || !ctx.subredditName) return;

  const getCurrentUser = reddit.getCurrentUser ?? reddit.getMe;
  const currentUser = typeof getCurrentUser === 'function' ? await getCurrentUser.call(reddit) : undefined;
  const username = currentUser?.username ?? currentUser?.name;
  if (!username) return;

  const mods = await callFirst<any[]>(reddit, ['getModerators', 'getSubredditModerators'], {
    subredditName: ctx.subredditName,
  });
  const isMod = mods.some((mod) => (mod.username ?? mod.name) === username);
  if (!isMod) throw new Error('Moderator access required');
}

function normalizeThing(raw: any, subredditName = ''): QueueItem {
  const type = raw.body && !raw.title ? 'comment' : 'post';
  const reports = [
    ...(raw.modReports ?? raw.mod_reports ?? []),
    ...(raw.userReports ?? raw.user_reports ?? []),
    ...(raw.reportReasons ?? []),
  ].flat();
  const reportReasons = reports
    .map((report: any) => (Array.isArray(report) ? report[0] : report?.reason ?? String(report)))
    .filter(Boolean);

  return {
    id: raw.id ?? raw.name,
    type,
    title: raw.title ?? String(raw.body ?? '').slice(0, 120),
    body: raw.body ?? raw.selftext ?? raw.url ?? '',
    author: raw.authorName ?? raw.author ?? raw.author?.username ?? '[deleted]',
    authorId: raw.authorId ?? raw.author?.id ?? '',
    subreddit: raw.subredditName ?? raw.subreddit ?? subredditName,
    permalink: raw.permalink ?? raw.url ?? '',
    createdAt: Number(raw.createdAt ?? raw.created_utc ?? Date.now() / 1000) * 1000,
    reportReasons,
    numReports: Number(raw.numReports ?? raw.num_reports ?? reportReasons.length),
  };
}

async function getUndoIds(redis: Record<string, any> | undefined, batchId: string): Promise<string[]> {
  const raw = await callFirst<string | null>(redis, ['get'], `undo:batch:${batchId}`);
  if (!raw) return [];
  return JSON.parse(raw) as string[];
}

async function redisSetJson(redis: Record<string, any> | undefined, key: string, value: unknown, ttlSeconds?: number) {
  if (!redis) throw new Error('Redis is unavailable');
  if (typeof redis.set === 'function') {
    try {
      await redis.set(key, JSON.stringify(value), { expiration: ttlSeconds });
      return;
    } catch {
      await redis.set(key, JSON.stringify(value));
    }
  }
  if (ttlSeconds && typeof redis.expire === 'function') await redis.expire(key, ttlSeconds);
}

async function allSettledAction<T>(items: T[], action: (item: T) => Promise<unknown>) {
  const results = await Promise.allSettled(items.map(action));
  return {
    ok: results.filter((result) => result.status === 'fulfilled').length,
    failed: results.filter((result) => result.status === 'rejected').length,
  };
}

function validateAutomodConfig(config: string): AutomodValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lines = config.split('\n');

  if (!config.trim()) warnings.push('AutoMod config is empty.');
  lines.forEach((line, index) => {
    if (line.includes('\t')) errors.push(`Line ${index + 1}: tabs are not valid indentation in YAML.`);
    if (/^\s*action\s*:\s*$/.test(line)) errors.push(`Line ${index + 1}: action is missing a value.`);
  });
  if (config.includes('---') && !config.includes('type:')) {
    warnings.push('Multiple rule sections found, but no explicit type checks were detected.');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

async function getAutomodWiki(ctx: DevvitContext) {
  return callFirst<any>(ctx.reddit, ['getWikiPage', 'getSubredditWikiPage'], {
    subredditName: ctx.subredditName,
    page: 'config/automoderator',
  });
}

app.use('/api/*', async (c, next) => {
  try {
    await assertModerator(context(c));
    await next();
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unauthorized' }, 403);
  }
});

app.get('/api/settings', async (c) => {
  const ctx = context(c);
  const settings = await resolveSettings(ctx.settings);
  return c.json(settings);
});

app.get('/api/queue', async (c) => {
  const ctx = context(c);
  const after = c.req.query('after');
  const listing = await callFirst<any>(ctx.reddit, ['getModQueue', 'getModerationQueue', 'getModqueue'], {
    subredditName: ctx.subredditName,
    limit: 20,
    after,
  });
  const children = Array.isArray(listing) ? listing : listing?.children ?? listing?.data?.children ?? [];
  const items = children.map((child: any) => normalizeThing(child.data ?? child, ctx.subredditName));
  return c.json({ items, after: listing?.after ?? listing?.data?.after ?? null });
});

app.post('/api/remove', async (c) => {
  const ctx = context(c);
  const { ids, removalReasonIndex } = await c.req.json<{ ids: string[]; removalReasonIndex: number }>();
  const batchId = uuid();
  const result = await allSettledAction(ids, (id) => callFirst(ctx.reddit, ['remove', 'removeThing'], id));

  await redisSetJson(ctx.redis, `undo:batch:${batchId}`, ids, 12);
  await callFirst(ctx.scheduler, ['runJob', 'scheduleJob'], {
    name: 'finalize_removal',
    data: { batchId, ids, removalReasonIndex },
    runAt: new Date(Date.now() + 10_000),
  });

  if (ctx.redis && ctx.subredditId) {
    await Promise.allSettled(
      ids.map((id) => callFirst(ctx.redis, ['incrBy', 'incr'], `removals:${ctx.subredditId}:${id}`, 1)),
    );
  }

  return c.json({ batchId, ...result });
});

app.post('/api/undo', async (c) => {
  const ctx = context(c);
  const { batchId } = await c.req.json<{ batchId: string }>();
  const ids = await getUndoIds(ctx.redis, batchId);
  await callFirst(ctx.redis, ['del', 'delete'], `undo:batch:${batchId}`);
  const result = await allSettledAction(ids, (id) => callFirst(ctx.reddit, ['approve', 'approveThing'], id));
  return c.json({ restored: result.ok, failed: result.failed });
});

app.post('/api/approve', async (c) => {
  const ctx = context(c);
  const { ids } = await c.req.json<{ ids: string[] }>();
  return c.json(await allSettledAction(ids, (id) => callFirst(ctx.reddit, ['approve', 'approveThing'], id)));
});

app.post('/api/lock', async (c) => {
  const ctx = context(c);
  const { ids } = await c.req.json<{ ids: string[] }>();
  return c.json(await allSettledAction(ids, (id) => callFirst(ctx.reddit, ['lock', 'lockPost'], id)));
});

app.post('/api/ban', async (c) => {
  const ctx = context(c);
  const body = await c.req.json<{ authorId: string; duration: number | 'permanent'; reason: string }>();
  await callFirst(ctx.reddit, ['banUser', 'ban'], {
    subredditName: ctx.subredditName,
    userId: body.authorId,
    duration: body.duration === 'permanent' ? undefined : body.duration,
    reason: body.reason,
  });
  return c.json({ ok: true });
});

app.get('/api/flairs', async (c) => {
  const ctx = context(c);
  const flairs = await callFirst<any[]>(ctx.reddit, ['getPostFlairTemplates', 'getFlairTemplates'], {
    subredditName: ctx.subredditName,
  });
  return c.json({ flairs: flairs.slice(0, 9) });
});

app.post('/api/flair', async (c) => {
  const ctx = context(c);
  const body = await c.req.json<{ postId: string; flairId: string }>();
  await callFirst(ctx.reddit, ['setPostFlair', 'setFlair'], {
    postId: body.postId,
    flairTemplateId: body.flairId,
    subredditName: ctx.subredditName,
  });
  return c.json({ ok: true });
});

app.post('/api/note', async (c) => {
  const ctx = context(c);
  const body = await c.req.json<{ userId: string; note: string }>();
  await callFirst(ctx.reddit, ['addModNote', 'addUserNote'], {
    subredditName: ctx.subredditName,
    userId: body.userId,
    note: body.note,
  });
  return c.json({ ok: true });
});

app.get('/api/user/:username', async (c) => {
  const ctx = context(c);
  const username = c.req.param('username');
  const user = await callFirst<any>(ctx.reddit, ['getUserByUsername', 'getUser'], username);
  const recent = await callFirst<any[]>(ctx.reddit, ['getUserOverview', 'getUserPosts'], {
    username,
    subredditName: ctx.subredditName,
    limit: 5,
  }).catch(() => []);
  const priorRemovals = Number(
    (await callFirst<string | null>(ctx.redis, ['get'], `removals:${ctx.subredditId}:${user.id}`).catch(() => '0')) ?? 0,
  );

  const info: UserInfo = {
    username,
    accountAgeDays: Math.max(0, Math.floor((Date.now() - Number(user.createdAt ?? 0) * 1000) / 86_400_000)),
    combinedKarma: Number(user.linkKarma ?? 0) + Number(user.commentKarma ?? 0),
    recentInSub: recent.length,
    priorRemovals,
    recentActivity: recent.slice(0, 5).map((item: any) => ({
      id: item.id,
      title: item.title ?? String(item.body ?? '').slice(0, 80),
      permalink: item.permalink ?? '',
      createdAt: Number(item.createdAt ?? item.created_utc ?? Date.now() / 1000) * 1000,
    })),
  };

  return c.json(info);
});

app.get('/api/notifications', async (c) => {
  const ctx = context(c);
  const [modqueue, unmoderated, messages, modmail] = await Promise.all([
    callFirst<any>(ctx.reddit, ['getModQueue', 'getModerationQueue', 'getModqueue'], {
      subredditName: ctx.subredditName,
      limit: 100,
    }).catch(() => []),
    callFirst<any>(ctx.reddit, ['getUnmoderated', 'getUnmoderatedQueue'], {
      subredditName: ctx.subredditName,
      limit: 100,
    }).catch(() => []),
    callFirst<any>(ctx.reddit, ['getUnreadMessages', 'getInbox'], { limit: 100 }).catch(() => []),
    callFirst<any>(ctx.reddit, ['getModmailConversations', 'getModMail'], { limit: 100 }).catch(() => []),
  ]);
  const count = (value: any) => (Array.isArray(value) ? value.length : (value?.children ?? value?.data?.children ?? []).length);
  const counts: NotificationCounts = {
    modqueue: count(modqueue),
    unmoderated: count(unmoderated),
    messages: count(messages),
    modmail: count(modmail),
  };
  return c.json(counts);
});

app.get('/api/mod-log', async (c) => {
  const ctx = context(c);
  const log: any = await callFirst<any>(ctx.reddit, ['getModerationLog', 'getModLog'], {
    subredditName: ctx.subredditName,
    limit: 500,
  }).catch(() => []);
  const entries = Array.isArray(log) ? log : log?.children ?? log?.data?.children ?? [];
  const now = Date.now();
  const rows = ['remove', 'approve', 'lock', 'ban'].map((action) => {
    const matches = entries
      .map((entry: any) => entry.data ?? entry)
      .filter((entry: any) => String(entry.action ?? '').includes(action));
    const since = (days: number) =>
      matches.filter((entry: any) => now - Number(entry.createdAt ?? entry.created_utc ?? 0) * 1000 <= days * 86_400_000).length;
    return {
      action,
      today: since(1),
      sevenDays: since(7),
      thirtyDays: since(30),
    };
  });
  const matrix: ModLogMatrix = { rows };
  return c.json(matrix);
});

app.get('/api/automod', async (c) => {
  const ctx = context(c);
  const wiki = await getAutomodWiki(ctx).catch(() => null);
  const rawEvents = await callFirst<string | null>(ctx.redis, ['get'], `automod:filters:${ctx.subredditId}`).catch(() => null);
  const data: AutomodPanelData = {
    status: wiki ? 'available' : 'unavailable',
    config: wiki?.content ?? wiki?.markdown ?? '',
    revisionId: wiki?.revisionId ?? wiki?.revision_id,
    recentFilters: rawEvents ? JSON.parse(rawEvents) : [],
  };
  return c.json(data);
});

app.post('/api/automod/validate', async (c) => {
  const { config } = await c.req.json<{ config: string }>();
  return c.json(validateAutomodConfig(config));
});

app.post('/api/automod/config', async (c) => {
  const ctx = context(c);
  const { config, previousRevisionId } = await c.req.json<{ config: string; previousRevisionId?: string }>();
  const validation = validateAutomodConfig(config);
  if (!validation.ok) return c.json({ error: 'AutoMod config did not pass validation.', validation }, 400);

  const updated = await callFirst<any>(ctx.reddit, ['updateWikiPage', 'editWikiPage'], {
    subredditName: ctx.subredditName,
    page: 'config/automoderator',
    content: config,
    reason: previousRevisionId ? `KeyQueue update from ${previousRevisionId}` : 'KeyQueue update',
  });
  return c.json({ ok: true, revisionId: updated?.revisionId ?? updated?.revision_id });
});

export default app;
