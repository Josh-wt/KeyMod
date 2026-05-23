import { getRequestListener } from '@hono/node-server';
import { context as requestContext, createServer, getServerPort, reddit, redis, scheduler, settings } from '@devvit/web/server';
import type { TaskRequest, TaskResponse } from '@devvit/scheduler';
import type { MenuItemRequest, TriggerResponse, UiResponse } from '@devvit/web/shared';
import { Hono } from 'hono';
import { attributeModAction, attributeUserModAction, removalAttributionSummary } from './actingModerator';
import { resolveSettings } from '../settings';
import type {
  AutomodPanelData,
  AutomodValidation,
  CrowdControlLevel,
  ModLogMatrix,
  NotificationCounts,
  ParentPostContext,
  QueueItem,
  SubredditRule,
  UserActivityItem,
  UserInfo,
  UserModLogEntry,
} from '../shared';

type JsonRecord = Record<string, unknown>;

type PendingRemovalItem = {
  id: string;
  author: string;
  type: 'post' | 'comment';
};

type PendingRemovalBatch = {
  items: PendingRemovalItem[];
  removalReasonIndex: number;
};

const app = new Hono();

function getSubredditName(): string {
  const subredditName = requestContext.subredditName;
  if (!subredditName) throw new Error('Subreddit context is unavailable.');
  return subredditName;
}

function getSubredditId(): string {
  const subredditId = requestContext.subredditId;
  if (!subredditId) throw new Error('Subreddit id is unavailable.');
  return subredditId;
}

function toTimestamp(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  const numeric = Number(value ?? Date.now() / 1000);
  if (!Number.isFinite(numeric)) return Date.now();
  return numeric > 10_000_000_000 ? numeric : numeric * 1000;
}

function reportReasonFromValue(report: unknown): string {
  if (Array.isArray(report)) return reportReasonFromValue(report[0]);
  if (report && typeof report === 'object') {
    const record = report as JsonRecord;
    return stringValue(record.reason ?? record.reportReason ?? record.category ?? record.title);
  }
  return typeof report === 'string' ? report.trim() : '';
}

function getReportReasons(raw: JsonRecord): string[] {
  const reports = [
    raw.modReports,
    raw.modReportReasons,
    raw.userReports,
    raw.userReportReasons,
    raw.reportReasons,
    raw.reports,
    raw.report_list,
  ].flat(2);

  const reasons = reports.map(reportReasonFromValue).filter(Boolean);
  const summary = stringValue(raw.reportReason ?? raw.topReportReason);
  if (summary) reasons.push(summary);

  return [...new Set(reasons)];
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function maybeUrl(value: unknown): string {
  const url = stringValue(value);
  if (!/^https?:\/\//i.test(url)) return '';
  return url;
}

function domainFromUrl(value: unknown): string {
  const url = maybeUrl(value);
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function flairText(raw: JsonRecord): string {
  const flair = raw.flair as JsonRecord | undefined;
  return stringValue(raw.flairText ?? raw.linkFlairText ?? raw.postFlairText ?? flair?.text);
}

function decodePreviewUrl(value: string): string {
  return value.replace(/&amp;/g, '&');
}

function previewUrlFromRaw(raw: JsonRecord): string {
  const preview = raw.preview as JsonRecord | undefined;
  const images = preview?.images as unknown[] | undefined;
  const first = images?.[0] as JsonRecord | undefined;
  const source = first?.source as JsonRecord | undefined;
  const previewSource = maybeUrl(source?.url);
  if (previewSource) return decodePreviewUrl(previewSource);

  const gallery = raw.gallery as JsonRecord | undefined;
  const galleryItems = gallery?.items as unknown[] | undefined;
  const galleryMedia = (galleryItems?.[0] as JsonRecord | undefined)?.media as JsonRecord | undefined;
  const galleryStill = galleryMedia?.s as JsonRecord | undefined;
  const galleryUrl = maybeUrl(galleryMedia?.url ?? galleryStill?.u);
  if (galleryUrl) return decodePreviewUrl(galleryUrl);

  const overridden = maybeUrl(raw.url_overridden_by_dest);
  if (overridden && /\.(gif|jpe?g|png|webp)$/i.test(overridden)) return overridden;

  const directUrl = maybeUrl(raw.url);
  if (directUrl && /\.(gif|jpe?g|png|webp)$/i.test(directUrl)) return directUrl;

  const thumb = maybeUrl(raw.thumbnailUrl ?? raw.thumbnail);
  if (thumb && !['self', 'default', 'nsfw', 'spoiler', 'image'].includes(thumb)) return thumb;

  return '';
}

function postIdFromRaw(raw: JsonRecord): string {
  const direct = stringValue(raw.postId ?? raw.linkId ?? raw.link_id);
  if (direct.startsWith('t3_')) return direct;
  if (direct) return `t3_${direct.replace(/^t3_/, '')}`;
  return '';
}

function normalizeParentPost(rawValue: unknown, fallbackSubreddit = '', subredditIcon = ''): ParentPostContext | undefined {
  const raw = ((rawValue as JsonRecord)?.data ?? rawValue) as JsonRecord;
  const id = String(raw.id ?? raw.name ?? '');
  if (!id.startsWith('t3_')) return undefined;

  const url = maybeUrl(raw.url);
  const previewUrl = previewUrlFromRaw(raw);
  const thumbnail = previewUrl || maybeUrl(raw.thumbnailUrl ?? raw.thumbnail);
  const subreddit = String(raw.subredditName ?? raw.subreddit ?? fallbackSubreddit);
  const author = raw.author as JsonRecord | string | undefined;

  return {
    id,
    title: String(raw.title ?? '(untitled)'),
    permalink: String(raw.permalink ?? raw.url ?? ''),
    subreddit,
    author: String(raw.authorName ?? (typeof author === 'object' ? author.username : author) ?? ''),
    createdAt: toTimestamp(raw.createdAt ?? raw.created_utc),
    body: String(raw.body ?? raw.selftext ?? ''),
    score: Number(raw.score ?? raw.ups ?? 0),
    numComments: Number(raw.numberOfComments ?? raw.numComments ?? raw.num_comments ?? 0),
    thumbnail: thumbnail || undefined,
    previewUrl: previewUrl || undefined,
    url: url || undefined,
    domain: domainFromUrl(url || raw.permalink),
    subredditIcon: subredditIcon || undefined,
  };
}

function normalizeThing(rawValue: unknown, fallbackSubreddit = ''): QueueItem {
  const raw = ((rawValue as JsonRecord)?.data ?? rawValue) as JsonRecord;
  const id = String(raw.id ?? raw.name ?? '');
  const body = String(raw.body ?? raw.selftext ?? '');
  const type = id.startsWith('t1_') || (body && !raw.title) ? 'comment' : 'post';
  const reportReasons = getReportReasons(raw);
  const url = maybeUrl(raw.url);
  const previewUrl = previewUrlFromRaw(raw);
  const thumbnail = previewUrl || maybeUrl(raw.thumbnailUrl ?? raw.thumbnail);
  const parentPostTitle = stringValue(raw.linkTitle ?? raw.postTitle ?? raw.parentPostTitle);
  const parentPostPermalink = stringValue(raw.linkPermalink ?? raw.postPermalink ?? raw.parentPostPermalink);
  const postId = type === 'comment' ? postIdFromRaw(raw) : id;
  const author = raw.author as JsonRecord | string | undefined;

  return {
    id,
    type,
    title: String((raw.title ?? body.slice(0, 120)) || '(untitled)'),
    body,
    author: String(raw.authorName ?? (typeof author === 'object' ? author.username : author) ?? '[deleted]'),
    authorId: String(raw.authorId ?? (typeof author === 'object' ? author.id : '') ?? ''),
    subreddit: String(raw.subredditName ?? raw.subreddit ?? fallbackSubreddit),
    permalink: String(raw.permalink ?? raw.url ?? ''),
    createdAt: toTimestamp(raw.createdAt ?? raw.created_utc),
    reportReasons,
    numReports: Number(
      raw.numReports ?? raw.num_reports ?? raw.numberOfReports ?? raw.report_count ?? raw.totalReports ?? reportReasons.length,
    ),
    score: Number(raw.score ?? raw.ups ?? 0),
    numComments: Number(raw.numberOfComments ?? raw.numComments ?? raw.num_comments ?? 0),
    flairText: flairText(raw),
    thumbnail: thumbnail || undefined,
    previewUrl: previewUrl || undefined,
    url,
    domain: domainFromUrl(url || raw.permalink),
    postId: postId || undefined,
    parentPostTitle,
    parentPostPermalink,
    locked: Boolean(raw.locked ?? raw.isLocked),
    nsfw: Boolean(raw.nsfw ?? raw.over_18 ?? raw.isNsfw),
    spoiler: Boolean(raw.spoiler ?? raw.isSpoiler),
    stickied: Boolean(raw.stickied ?? raw.isStickied),
    crowdControlLevel: stringValue(raw.crowdControlLevel ?? raw.crowd_control_level) as CrowdControlLevel | undefined,
    distinguished: Boolean(raw.distinguishedBy ?? raw.distinguished),
    ignoringReports: Boolean(raw.ignoringReports ?? raw.ignore_reports ?? raw.ignoreReports),
  };
}

const subredditIconCache = new Map<string, string>();

async function getSubredditIcon(subredditName: string): Promise<string> {
  const key = subredditName.toLowerCase();
  if (subredditIconCache.has(key)) return subredditIconCache.get(key) ?? '';

  try {
    const info = await reddit.getSubredditByName(subredditName);
    const icon = decodePreviewUrl(maybeUrl(info.settings.communityIcon));
    subredditIconCache.set(key, icon);
    return icon;
  } catch {
    subredditIconCache.set(key, '');
    return '';
  }
}

async function enrichQueueItems(items: QueueItem[], fallbackSubreddit: string): Promise<QueueItem[]> {
  const subredditNames = [...new Set(items.map((item) => item.subreddit).filter(Boolean))];
  await Promise.all(subredditNames.map((name) => getSubredditIcon(name)));

  const commentPostIds = [
    ...new Set(items.filter((item) => item.type === 'comment' && item.postId).map((item) => item.postId as string)),
  ];
  const parentPosts = new Map<string, ParentPostContext>();

  await Promise.all(
    commentPostIds.map(async (postId) => {
      try {
        const post = await reddit.getPostById(postId as never);
        const subreddit = String(post.subredditName ?? fallbackSubreddit);
        const icon = await getSubredditIcon(subreddit);
        const parent = normalizeParentPost(post, subreddit, icon);
        if (parent) parentPosts.set(postId, parent);
      } catch {
        // Parent post may be deleted; fall back to inline metadata.
      }
    }),
  );

  return items.map((item) => {
    const subredditIcon = subredditIconCache.get(item.subreddit.toLowerCase()) || undefined;
    const parentFromApi = item.postId ? parentPosts.get(item.postId) : undefined;
    const parentPost =
      parentFromApi ??
      (item.type === 'comment' && item.parentPostTitle
        ? ({
            id: item.postId ?? '',
            title: item.parentPostTitle,
            permalink: item.parentPostPermalink ?? '',
            subreddit: item.subreddit,
            subredditIcon,
          } satisfies ParentPostContext)
        : undefined);

    return {
      ...item,
      subredditIcon,
      parentPost,
    };
  });
}

async function listingItems<T>(listing: { all?: () => Promise<T[]>; get?: (count: number) => Promise<T[]> } | T[], limit = 100): Promise<T[]> {
  if (Array.isArray(listing)) return listing;
  if (typeof listing.get === 'function') return listing.get(limit);
  if (typeof listing.all === 'function') return listing.all();
  return [];
}

type CommentTreeItem = {
  id?: string;
  replies?: { all?: () => Promise<CommentTreeItem[]>; get?: (count: number) => Promise<CommentTreeItem[]> };
};

async function allCommentListingItems(listing: {
  all?: () => Promise<CommentTreeItem[]>;
  get?: (count: number) => Promise<CommentTreeItem[]>;
}): Promise<CommentTreeItem[]> {
  if (typeof listing.all === 'function') return listing.all();
  return listingItems(listing, 1000);
}

async function commentTreeItems(listing: {
  all?: () => Promise<CommentTreeItem[]>;
  get?: (count: number) => Promise<CommentTreeItem[]>;
}): Promise<CommentTreeItem[]> {
  const items: CommentTreeItem[] = [];
  const seen = new Set<string>();

  async function append(comments: CommentTreeItem[]): Promise<void> {
    for (const comment of comments) {
      const id = String(comment.id ?? '');
      if (id && seen.has(id)) continue;
      if (id) seen.add(id);
      items.push(comment);

      if (comment.replies) {
        await append(await allCommentListingItems(comment.replies));
      }
    }
  }

  await append(await allCommentListingItems(listing));
  return items;
}

async function listingPage<T extends { id?: string; name?: string }>(
  listing: { all?: () => Promise<T[]>; get?: (count: number) => Promise<T[]>; hasMore?: boolean },
  limit: number,
): Promise<{ items: T[]; after: string | null }> {
  const items = await listingItems(listing, limit);
  const last = items[items.length - 1];
  const cursor = String(last?.id ?? last?.name ?? '');
  return {
    items,
    after: listing.hasMore && cursor ? cursor : null,
  };
}

async function getThing(id: string) {
  return id.startsWith('t1_') ? reddit.getCommentById(id as never) : reddit.getPostById(id as never);
}

type ModActionUpdate = {
  id: string;
  locked?: boolean;
  nsfw?: boolean;
  spoiler?: boolean;
  stickied?: boolean;
  crowdControlLevel?: CrowdControlLevel;
  distinguished?: boolean;
  ignoringReports?: boolean;
};

type ModActionResponse = {
  ok: number;
  failed: number;
  updates?: ModActionUpdate[];
  errors?: string[];
};

function thingLocked(thing: { isLocked?: () => boolean; locked?: boolean }): boolean {
  if (typeof thing.isLocked === 'function') return thing.isLocked();
  return Boolean(thing.locked);
}

function thingStickied(thing: { isStickied?: () => boolean; stickied?: boolean }): boolean {
  if (typeof thing.isStickied === 'function') return thing.isStickied();
  return Boolean(thing.stickied);
}

async function runModActions(ids: string[], action: (id: string) => Promise<Partial<ModActionUpdate>>): Promise<ModActionResponse> {
  const updates: ModActionUpdate[] = [];
  const errors: string[] = [];
  let ok = 0;
  let failed = 0;

  await Promise.all(
    ids.map(async (id) => {
      try {
        const patch = await action(id);
        updates.push({ id, ...patch });
        ok += 1;
      } catch (error) {
        failed += 1;
        errors.push(errorMessage(error));
      }
    }),
  );

  return { ok, failed, updates, errors: errors.length ? errors : undefined };
}

async function toggleLock(id: string): Promise<Partial<ModActionUpdate>> {
  const thing = await getThing(id);
  if (thingLocked(thing)) {
    await thing.unlock();
    return { locked: false };
  }
  await thing.lock();
  return { locked: true };
}

async function assertModerator(): Promise<void> {
  const subredditName = getSubredditName();
  const currentUser = await reddit.getCurrentUser();
  if (!currentUser) throw new Error('Moderator access required.');

  const mods = await reddit.getModerators({ subredditName, limit: 100 }).all();
  const currentUsername = currentUser.username?.toLowerCase();
  const isModerator = mods.some((mod) => mod.id === currentUser.id || mod.username?.toLowerCase() === currentUsername);
  if (!isModerator) throw new Error('Moderator access required.');
}

async function allSettledAction<T>(items: T[], action: (item: T) => Promise<unknown>) {
  const results = await Promise.allSettled(items.map(action));
  return {
    ok: results.filter((result) => result.status === 'fulfilled').length,
    failed: results.filter((result) => result.status === 'rejected').length,
  };
}

async function redisSetJson(key: string, value: unknown, ttlMs?: number): Promise<void> {
  await redis.set(key, JSON.stringify(value), ttlMs ? { expiration: new Date(Date.now() + ttlMs) } : undefined);
}

async function redisGetJson<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  return raw ? (JSON.parse(raw) as T) : null;
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

  return { ok: errors.length === 0, errors, warnings };
}

async function finalizeRemoval(data: { batchId: string }): Promise<void> {
  const key = `undo:batch:${data.batchId}`;
  const pending = await redisGetJson<PendingRemovalBatch>(key);
  if (!pending) return;

  const appSettings = await resolveSettings(settings);
  const reason = appSettings.removalReasons.find((item) => item.index === pending.removalReasonIndex);
  const message = reason?.text?.trim();
  const flairId = reason?.flairId?.trim();
  const subredditName = getSubredditName();

  await Promise.allSettled(
    pending.items.map(async (item) => {
      if (message && item.author && item.author !== '[deleted]') {
        await reddit.sendPrivateMessage({
          to: item.author,
          subject: 'Your post or comment was removed',
          text: message,
        });
      }
      if (flairId && item.type === 'post') {
        await reddit.setPostFlair({
          postId: item.id as never,
          flairTemplateId: flairId,
          subredditName,
        });
      }
    }),
  );

  await redis.del(key);
}

async function recordAutomodFilter(event: unknown): Promise<void> {
  const data = event as JsonRecord;
  const thing = ((data.post ?? data.comment ?? data) as JsonRecord) || {};
  const subredditId = requestContext.subredditId ?? String(thing.subredditId ?? 'unknown');
  const key = `automod:filters:${subredditId}`;
  const existing = await redisGetJson<AutomodPanelData['recentFilters']>(key).catch(() => null);
  const events = existing ?? [];

  events.unshift({
    id: String(thing.id ?? data.id ?? crypto.randomUUID()),
    type: data.comment ? 'comment' : 'post',
    title: String((thing.title ?? String(thing.body ?? '').slice(0, 90)) || '(untitled)'),
    author: String(thing.authorName ?? thing.author ?? '[deleted]'),
    reason: String(data.reason ?? ''),
    removedAt: Date.now(),
    permalink: String(thing.permalink ?? ''),
  });

  await redis.set(key, JSON.stringify(events.slice(0, 50)));
}

function normalizeActivity(rawValue: unknown, fallbackSubreddit = ''): UserActivityItem {
  const item = ((rawValue as JsonRecord)?.data ?? rawValue) as JsonRecord;
  const body = String(item.body ?? '');
  const type = body && !item.title ? 'comment' : 'post';

  return {
    id: String(item.id ?? item.name ?? `${type}:${item.permalink ?? item.createdAt ?? 'unknown'}`),
    type,
    title: String((item.title ?? body.slice(0, 100)) || '(untitled)'),
    body,
    subreddit: String(item.subredditName ?? fallbackSubreddit),
    permalink: String(item.permalink ?? ''),
    createdAt: toTimestamp(item.createdAt),
  };
}

function normalizeModLogEntry(rawValue: unknown): UserModLogEntry {
  const entry = ((rawValue as JsonRecord)?.data ?? rawValue) as JsonRecord;
  const target = (entry.target ?? {}) as JsonRecord;

  return {
    id: String(entry.id ?? `${entry.action ?? entry.type ?? 'action'}:${entry.createdAt ?? Date.now()}`),
    action: String(entry.action ?? entry.type ?? 'unknown'),
    moderator: String(entry.moderatorName ?? entry.moderator ?? 'unknown'),
    targetId: String(target.id ?? entry.targetId ?? ''),
    details: String(entry.details ?? target.title ?? target.body ?? ''),
    createdAt: toTimestamp(entry.createdAt),
  };
}

const HOST_POST_TITLE = 'KeyModerator';
const HOST_POST_FALLBACK_TEXT = 'Open this post in the Reddit app or on new Reddit to use KeyModerator.';
const HOST_POST_USER_TEXT = 'KeyModerator moderator workspace.';

async function submitHostPost(subredditName: string, runAs: 'APP' | 'USER') {
  const baseOptions = {
    subredditName,
    title: HOST_POST_TITLE,
    entry: 'default',
    textFallback: {
      text: HOST_POST_FALLBACK_TEXT,
    },
  };

  if (runAs === 'USER') {
    return reddit.submitCustomPost({
      ...baseOptions,
      runAs,
      userGeneratedContent: {
        text: HOST_POST_USER_TEXT,
        imageUrls: [],
      },
    });
  }

  return reddit.submitCustomPost({
    ...baseOptions,
    runAs,
  });
}

function getPostUrl(post: Awaited<ReturnType<typeof reddit.submitCustomPost>>): string {
  const url = post.url ?? post.permalink;
  if (!url) throw new Error('Created KeyModerator host post did not include a URL.');
  return url;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function getOrCreateHostPost(): Promise<{ url: string }> {
  const subredditName = getSubredditName();
  const key = `host-post:${subredditName}`;
  const existingId = await redis.get(key).catch(() => null);

  if (existingId) {
    const existing = await reddit.getPostById(existingId as never).catch(() => null);
    const existingUrl = existing?.url ?? existing?.permalink;
    if (existingUrl) return { url: existingUrl };
  }

  let post: Awaited<ReturnType<typeof reddit.submitCustomPost>>;
  try {
    post = await submitHostPost(subredditName, 'APP');
  } catch (appError) {
    console.warn('[keymoderator] app-account host post failed; retrying as user', appError);
    try {
      post = await submitHostPost(subredditName, 'USER');
    } catch (userError) {
      console.error('[keymoderator] user-account host post failed', userError);
      throw new Error(
        `Could not create the KeyModerator host post. App submit failed: ${errorMessage(appError)}; user submit failed: ${errorMessage(userError)}`
      );
    }
  }

  if (post.id) await redis.set(key, post.id);
  return { url: getPostUrl(post) };
}

app.use('*', async (c, next) => {
  if (c.req.path.startsWith('/internal/')) {
    console.log(`[keymoderator] ${c.req.method} ${c.req.path}`);
  }
  await next();
});

app.get('/internal/health', (c) => c.json({ ok: true, app: 'keymoderator' }));

app.post('/internal/menu/open-keyqueue', async (c) => {
  try {
    const body = await c.req.json<MenuItemRequest>().catch(() => null);
    console.log('[keymoderator] menu request', body);

    try {
      getSubredditName();
    } catch {
      return c.json({
        showToast: {
          text: 'Open KeyModerator from the subreddit menu.',
          appearance: 'neutral',
        },
      } satisfies UiResponse);
    }

    return c.json({ navigateTo: await getOrCreateHostPost() } satisfies UiResponse);
  } catch (error) {
    console.error('[keymoderator] menu failed', error);
    return c.json({
      showToast: {
        text: error instanceof Error ? error.message : 'KeyModerator could not open.',
        appearance: 'neutral',
      },
    } satisfies UiResponse);
  }
});

app.post('/internal/scheduler/finalize-removal', async (c) => {
  const body = await c.req.json<TaskRequest<{ batchId: string }>>();
  await finalizeRemoval(body.data);
  return c.json({} satisfies TaskResponse);
});

app.post('/internal/triggers/automod-filter', async (c) => {
  await recordAutomodFilter(await c.req.json());
  return c.json({} satisfies TriggerResponse);
});

app.use('/api/*', async (c, next) => {
  try {
    await assertModerator();
    await next();
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unauthorized' }, 403);
  }
});

app.get('/api/settings', async (c) => c.json(await resolveSettings(settings)));

app.get('/api/feed', async (c) => {
  const subredditName = getSubredditName();
  const sort = (c.req.query('sort') ?? 'hot') as 'hot' | 'new' | 'top';
  const after = c.req.query('after') || undefined;

  let listing;
  if (sort === 'new') {
    listing = reddit.getNewPosts({ subredditName, limit: 25, after });
  } else if (sort === 'top') {
    listing = reddit.getTopPosts({ subredditName, limit: 25, after });
  } else {
    listing = reddit.getHotPosts({ subredditName, limit: 25, after });
  }

  const page = await listingPage(listing, 25);
  const icon = await getSubredditIcon(subredditName);
  const items = page.items.map((item) => ({ ...normalizeThing(item, subredditName), subredditIcon: icon }));

  return c.json({ items, after: page.after });
});

app.get('/api/feed/:postId/comments', async (c) => {
  const postId = c.req.param('postId');
  if (!postId.startsWith('t3_')) return c.json({ error: 'Post comments require a post id.' }, 400);

  const subredditName = getSubredditName();
  const icon = await getSubredditIcon(subredditName);
  const comments = await commentTreeItems(reddit.getComments({ postId: postId as never, pageSize: 100, depth: 10 }));

  return c.json({
    comments: comments.map((comment) => ({ ...normalizeThing(comment, subredditName), subredditIcon: icon })),
  });
});

app.get('/api/queue', async (c) => {
  const subredditName = getSubredditName();
  const after = c.req.query('after') || undefined;
  const listing = reddit.getModQueue({ subreddit: subredditName, type: 'all', limit: 20, after });
  const page = await listingPage(listing, 20);
  const items = await enrichQueueItems(page.items.map((item) => normalizeThing(item, subredditName)), subredditName);

  return c.json({
    items,
    after: page.after,
  });
});

app.post('/api/remove', async (c) => {
  const { ids, removalReasonIndex, asSpam = false } = await c.req.json<{
    ids: string[];
    removalReasonIndex: number;
    asSpam?: boolean;
  }>();
  const batchId = crypto.randomUUID();
  const items = (await Promise.all(ids.map((id) => getThing(id).then((thing) => normalizeThing(thing, getSubredditName()))))).map(
    (item) => ({ id: item.id, author: item.author, type: item.type }) satisfies PendingRemovalItem,
  );
  const result = await allSettledAction(ids, (id) => reddit.remove(id as never, Boolean(asSpam)));

  const appSettings = await resolveSettings(settings);
  await attributeModAction(items, removalAttributionSummary(removalReasonIndex, asSpam, appSettings.removalReasons), {
    label: asSpam ? 'SPAM_WARNING' : undefined,
  });

  await redisSetJson(`undo:batch:${batchId}`, { items, removalReasonIndex } satisfies PendingRemovalBatch, 12_000);
  await scheduler.runJob({
    name: 'finalize_removal',
    data: { batchId },
    runAt: new Date(Date.now() + 10_000),
  });

  const subredditId = getSubredditId();
  await Promise.allSettled(items.map((item) => redis.incrBy(`removals:${subredditId}:${item.author}`, 1)));

  return c.json({ batchId, ...result });
});

app.post('/api/undo', async (c) => {
  const { batchId } = await c.req.json<{ batchId: string }>();
  const pending = await redisGetJson<PendingRemovalBatch>(`undo:batch:${batchId}`);
  await redis.del(`undo:batch:${batchId}`);
  const result = await allSettledAction(pending?.items ?? [], (item) => reddit.approve(item.id as never));
  await attributeModAction(pending?.items ?? [], 'Restored (undo) via KeyModerator.');
  return c.json({ restored: result.ok, failed: result.failed });
});

app.post('/api/approve', async (c) => {
  const { ids } = await c.req.json<{ ids: string[] }>();
  const subredditName = getSubredditName();
  const attributionItems = (
    await Promise.all(
      ids.map(async (id) => {
        const thing = await getThing(id);
        const item = normalizeThing(thing, subredditName);
        return { id: item.id, author: item.author, type: item.type };
      }),
    )
  ).filter((item) => item.author && item.author !== '[deleted]');

  const response = await runModActions(ids, async (id) => {
    const thing = await getThing(id);
    await thing.approve();
    return {};
  });

  await attributeModAction(attributionItems, 'Approved via KeyModerator.');
  return c.json(response);
});

app.post('/api/lock', async (c) => {
  const { ids } = await c.req.json<{ ids: string[] }>();
  return c.json(await runModActions(ids, toggleLock));
});

app.post('/api/nsfw', async (c) => {
  const { ids } = await c.req.json<{ ids: string[] }>();
  return c.json(
    await runModActions(
      ids.filter((id) => id.startsWith('t3_')),
      async (id) => {
        const post = await reddit.getPostById(id as never);
        if (post.nsfw) {
          await post.unmarkAsNsfw();
          return { nsfw: false };
        }
        await post.markAsNsfw();
        return { nsfw: true };
      },
    ),
  );
});

app.post('/api/spoiler', async (c) => {
  const { ids } = await c.req.json<{ ids: string[] }>();
  return c.json(
    await runModActions(
      ids.filter((id) => id.startsWith('t3_')),
      async (id) => {
        const post = await reddit.getPostById(id as never);
        if (post.spoiler) {
          await post.unmarkAsSpoiler();
          return { spoiler: false };
        }
        await post.markAsSpoiler();
        return { spoiler: true };
      },
    ),
  );
});

app.post('/api/highlight', async (c) => {
  const { ids } = await c.req.json<{ ids: string[] }>();
  return c.json(
    await runModActions(
      ids.filter((id) => id.startsWith('t3_')),
      async (id) => {
        const post = await reddit.getPostById(id as never);
        if (thingStickied(post)) {
          await post.unsticky();
          return { stickied: false };
        }
        await post.sticky(1);
        return { stickied: true };
      },
    ),
  );
});

async function toggleDistinguish(id: string): Promise<Partial<ModActionUpdate>> {
  const thing = await getThing(id);
  const distinguished = Boolean((thing as { distinguishedBy?: string }).distinguishedBy);
  if (distinguished) {
    await thing.undistinguish();
    return { distinguished: false };
  }
  await thing.distinguish();
  return { distinguished: true };
}

async function toggleIgnoreReports(id: string): Promise<Partial<ModActionUpdate>> {
  const thing = await getThing(id);
  const ignoring = Boolean((thing as { ignoringReports?: boolean }).ignoringReports);
  if (ignoring) {
    await thing.unignoreReports();
    return { ignoringReports: false };
  }
  await thing.ignoreReports();
  return { ignoringReports: true };
}

app.post('/api/distinguish', async (c) => {
  const { ids } = await c.req.json<{ ids: string[] }>();
  return c.json(await runModActions(ids, toggleDistinguish));
});

app.post('/api/ignore-reports', async (c) => {
  const { ids } = await c.req.json<{ ids: string[] }>();
  return c.json(await runModActions(ids, toggleIgnoreReports));
});

app.post('/api/mute', async (c) => {
  const { username, note = '', unmute = false } = await c.req.json<{ username: string; note?: string; unmute?: boolean }>();
  const subreddit = await reddit.getSubredditByName(getSubredditName());
  if (unmute) {
    await subreddit.unmuteUser(username);
    await attributeUserModAction(username, 'Unmuted via KeyModerator.');
    return c.json({ ok: true, muted: false });
  }
  await subreddit.muteUser(username, note);
  await attributeUserModAction(username, 'Muted via KeyModerator.');
  return c.json({ ok: true, muted: true });
});

app.post('/api/crowd-control', async (c) => {
  const { ids, level = 'MEDIUM' } = await c.req.json<{ ids: string[]; level?: CrowdControlLevel }>();
  return c.json(
    await runModActions(
      ids.filter((id) => id.startsWith('t3_')),
      async (id) => {
        const post = await reddit.getPostById(id as never);
        await post.updateCrowdControlLevel(level);
        return { crowdControlLevel: level };
      },
    ),
  );
});

app.post('/api/ban', async (c) => {
  const body = await c.req.json<{
    username: string;
    duration: number | 'permanent';
    reason: string;
    message?: string;
    note?: string;
    context?: string;
  }>();
  await reddit.banUser({
    subredditName: getSubredditName(),
    username: body.username,
    ...(body.duration === 'permanent' ? {} : { duration: body.duration }),
    reason: body.reason,
    message: body.message,
    note: body.note,
    context: body.context,
  });
  await attributeUserModAction(body.username, `Banned via KeyModerator (${body.reason}).`, {
    label: body.duration === 'permanent' ? 'PERMA_BAN' : 'BAN',
    redditId: body.context,
  });
  return c.json({ ok: true });
});

app.get('/api/flairs', async (c) => {
  const flairs = await reddit.getPostFlairTemplates(getSubredditName());
  return c.json({ flairs: flairs.slice(0, 9).map((flair) => ({ id: flair.id, text: flair.text })) });
});

app.post('/api/flair', async (c) => {
  const body = await c.req.json<{ postId: string; flairId: string }>();
  if (body.postId.startsWith('t1_')) {
    return c.json({ error: 'Post flair cannot be applied to comments.' }, 400);
  }
  const templates = await reddit.getPostFlairTemplates(getSubredditName());
  const template = templates.find((entry) => entry.id === body.flairId);
  await reddit.setPostFlair({
    postId: body.postId as never,
    flairTemplateId: body.flairId,
    subredditName: getSubredditName(),
  });
  return c.json({ ok: true, flairText: template?.text ?? '' });
});

app.post('/api/note', async (c) => {
  const body = await c.req.json<{ username: string; note: string; redditId?: string }>();
  await reddit.addModNote({
    subreddit: getSubredditName(),
    user: body.username,
    note: body.note,
    redditId: body.redditId as never,
  });
  return c.json({ ok: true });
});

app.get('/api/user/:username', async (c) => {
  const subredditName = getSubredditName();
  const subredditId = getSubredditId();
  const username = c.req.param('username');
  const user = await reddit.getUserByUsername(username);
  if (!user) return c.json({ error: `User ${username} was not found.` }, 404);

  const [overviewItems, postItems, commentItems, modLogItems] = await Promise.all([
    listingItems(reddit.getCommentsAndPostsByUser({ username, limit: 25, pageSize: 25 }), 25).catch(() => []),
    listingItems(reddit.getPostsByUser({ username, limit: 10, pageSize: 10 }), 10).catch(() => []),
    listingItems(reddit.getCommentsByUser({ username, limit: 10, pageSize: 10 }), 10).catch(() => []),
    listingItems(reddit.getModerationLog({ subredditName, limit: 250, pageSize: 100 }), 250).catch(() => []),
  ]);

  const overview = overviewItems.map((item) => normalizeActivity(item, subredditName));
  const recentPosts = postItems.map((item) => normalizeActivity(item, subredditName)).filter((item) => item.type === 'post');
  const recentComments = commentItems.map((item) => normalizeActivity(item, subredditName)).filter((item) => item.type === 'comment');
  const modLog = modLogItems
    .map(normalizeModLogEntry)
    .filter((entry) => [entry.targetId, entry.details].join(' ').toLowerCase().includes(username.toLowerCase()))
    .slice(0, 20);
  const priorRemovalsFromRedis = Number((await redis.get(`removals:${subredditId}:${username}`).catch(() => '0')) ?? 0);
  const priorRemovalsFromLog = modLog.filter((entry) => entry.action.includes('remove')).length;

  let modNoteItems: unknown[] = [];
  try {
    modNoteItems = await listingItems(reddit.getModNotes({ subreddit: subredditName, user: username, limit: 25 }), 25);
  } catch {
    modNoteItems = [];
  }
  const modNotes = modNoteItems.map((entry) => {
    const raw = ((entry as JsonRecord)?.data ?? entry) as JsonRecord;
    return {
      id: String(raw.id ?? crypto.randomUUID()),
      note: String(raw.note ?? raw.body ?? ''),
      moderator: String(raw.moderatorName ?? raw.moderator ?? 'unknown'),
      createdAt: toTimestamp(raw.createdAt),
      label: stringValue(raw.label) || undefined,
    };
  });

  const info: UserInfo = {
    username,
    accountAgeDays: Math.max(0, Math.floor((Date.now() - toTimestamp(user.createdAt)) / 86_400_000)),
    combinedKarma: Number(user.linkKarma ?? 0) + Number(user.commentKarma ?? 0),
    recentInSub: overview.filter((item) => item.subreddit.toLowerCase() === subredditName.toLowerCase()).length,
    priorRemovals: Math.max(priorRemovalsFromRedis, priorRemovalsFromLog),
    recentActivity: overview.slice(0, 8),
    recentPosts: recentPosts.length ? recentPosts : overview.filter((item) => item.type === 'post').slice(0, 10),
    recentComments: recentComments.length ? recentComments : overview.filter((item) => item.type === 'comment').slice(0, 10),
    modLog,
    modNotes,
  };

  return c.json(info);
});

app.get('/api/notifications', async (c) => {
  const subredditName = getSubredditName();
  const [modqueue, unmoderated, messages, modmail] = await Promise.all([
    listingItems(reddit.getModQueue({ subreddit: subredditName, type: 'all', limit: 100 }), 100).catch(() => []),
    listingItems(reddit.getUnmoderated({ subreddit: subredditName, type: 'all', limit: 100 }), 100).catch(() => []),
    reddit.getMessages({ type: 'unread', limit: 100 }).then((listing) => listingItems(listing, 100)).catch(() => []),
    reddit.modMail.getUnreadCount().catch(() => null),
  ]);

  const counts: NotificationCounts = {
    modqueue: modqueue.length,
    unmoderated: unmoderated.length,
    messages: messages.length,
    modmail: modmail ? Object.values(modmail).reduce((sum, value) => sum + Number(value ?? 0), 0) : 0,
  };
  return c.json(counts);
});

app.get('/api/mod-log', async (c) => {
  const entries = await listingItems(reddit.getModerationLog({ subredditName: getSubredditName(), limit: 500, pageSize: 100 }), 500).catch(
    () => [],
  );
  const now = Date.now();
  const rows = ['remove', 'approve', 'lock', 'ban'].map((action) => {
    const matches = entries.map(normalizeModLogEntry).filter((entry) => entry.action.includes(action));
    const since = (days: number) => matches.filter((entry) => now - entry.createdAt <= days * 86_400_000).length;
    return {
      action,
      today: since(1),
      sevenDays: since(7),
      thirtyDays: since(30),
    };
  });
  return c.json({ rows } satisfies ModLogMatrix);
});

app.get('/api/automod', async (c) => {
  const subredditName = getSubredditName();
  const wiki = await reddit.getWikiPage(subredditName, 'config/automoderator').catch(() => null);
  const rawEvents = await redisGetJson<AutomodPanelData['recentFilters']>(`automod:filters:${getSubredditId()}`).catch(() => null);
  return c.json({
    status: wiki ? 'available' : 'unavailable',
    config: wiki?.content ?? '',
    revisionId: wiki?.revisionId,
    recentFilters: rawEvents ?? [],
  } satisfies AutomodPanelData);
});

app.post('/api/automod/validate', async (c) => {
  const { config } = await c.req.json<{ config: string }>();
  return c.json(validateAutomodConfig(config));
});

app.post('/api/automod/config', async (c) => {
  const { config, previousRevisionId } = await c.req.json<{ config: string; previousRevisionId?: string }>();
  const validation = validateAutomodConfig(config);
  if (!validation.ok) return c.json({ error: 'AutoMod config did not pass validation.', validation }, 400);

  const updated = await reddit.updateWikiPage({
    subredditName: getSubredditName(),
    page: 'config/automoderator',
    content: config,
    reason: previousRevisionId ? `KeyModerator update from ${previousRevisionId}` : 'KeyModerator update',
  });
  return c.json({ ok: true, revisionId: updated.revisionId });
});

const requestListener = getRequestListener(app.fetch);

createServer(requestListener).listen(getServerPort(), () => {
  console.log(`[keymoderator] server listening on ${getServerPort()}`);
});

export default app;
