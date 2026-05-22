import type {
  AppSettings,
  AutomodPanelData,
  AutomodValidation,
  CrowdControlLevel,
  FeedSort,
  ModLogMatrix,
  NotificationCounts,
  QueueItem,
  UserInfo,
} from '../shared';
import type { ModActionResult } from './modActions';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...init?.headers,
    },
  });
  const text = await response.text();
  const contentType = response.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json') && text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(body?.error ?? `Request failed: ${response.status}`);
  }

  if (!body) {
    throw new Error(`Expected JSON from ${path}, received ${contentType || 'unknown content type'}`);
  }

  return body as T;
}

export const api = {
  settings: () => request<AppSettings>('/api/settings'),
  queue: (after?: string | null) =>
    request<{ items: QueueItem[]; after: string | null }>(`/api/queue${after ? `?after=${encodeURIComponent(after)}` : ''}`),
  feed: (sort: FeedSort = 'hot', after?: string | null) => {
    const params = new URLSearchParams({ sort });
    if (after) params.set('after', after);
    return request<{ items: QueueItem[]; after: string | null }>(`/api/feed?${params}`);
  },
  feedComments: (postId: string) =>
    request<{ comments: QueueItem[] }>(`/api/feed/${encodeURIComponent(postId)}/comments`),
  remove: (ids: string[], removalReasonIndex: number, asSpam = false) =>
    request<{ batchId: string; ok: number; failed: number }>('/api/remove', {
      method: 'POST',
      body: JSON.stringify({ ids, removalReasonIndex, asSpam }),
    }),
  undo: (batchId: string) =>
    request<{ restored: number; failed: number }>('/api/undo', {
      method: 'POST',
      body: JSON.stringify({ batchId }),
    }),
  approve: (ids: string[]) =>
    request<ModActionResult>('/api/approve', { method: 'POST', body: JSON.stringify({ ids }) }),
  lock: (ids: string[]) =>
    request<ModActionResult>('/api/lock', { method: 'POST', body: JSON.stringify({ ids }) }),
  nsfw: (ids: string[]) => request<ModActionResult>('/api/nsfw', { method: 'POST', body: JSON.stringify({ ids }) }),
  spoiler: (ids: string[]) => request<ModActionResult>('/api/spoiler', { method: 'POST', body: JSON.stringify({ ids }) }),
  highlight: (ids: string[]) => request<ModActionResult>('/api/highlight', { method: 'POST', body: JSON.stringify({ ids }) }),
  crowdControl: (ids: string[], level: CrowdControlLevel = 'MEDIUM') =>
    request<ModActionResult>('/api/crowd-control', { method: 'POST', body: JSON.stringify({ ids, level }) }),
  distinguish: (ids: string[]) =>
    request<ModActionResult>('/api/distinguish', { method: 'POST', body: JSON.stringify({ ids }) }),
  ignoreReports: (ids: string[]) =>
    request<ModActionResult>('/api/ignore-reports', { method: 'POST', body: JSON.stringify({ ids }) }),
  mute: (username: string, note = '', unmute = false) =>
    request<{ ok: true; muted: boolean }>('/api/mute', {
      method: 'POST',
      body: JSON.stringify({ username, note, unmute }),
    }),
  ban: (username: string, duration: number | 'permanent', reason: string, message = '', note = '', context?: string) =>
    request<{ ok: true }>('/api/ban', { method: 'POST', body: JSON.stringify({ username, duration, reason, message, note, context }) }),
  flairs: () => request<{ flairs: Array<{ id: string; text?: string; name?: string }> }>('/api/flairs'),
  flair: (postId: string, flairId: string) =>
    request<{ ok: true; flairText?: string }>('/api/flair', { method: 'POST', body: JSON.stringify({ postId, flairId }) }),
  note: (username: string, note: string, redditId?: string) =>
    request<{ ok: true }>('/api/note', { method: 'POST', body: JSON.stringify({ username, note, redditId }) }),
  user: (username: string) => request<UserInfo>(`/api/user/${encodeURIComponent(username)}`),
  notifications: () => request<NotificationCounts>('/api/notifications'),
  modLog: () => request<ModLogMatrix>('/api/mod-log'),
  automod: () => request<AutomodPanelData>('/api/automod'),
  validateAutomod: (config: string) =>
    request<AutomodValidation>('/api/automod/validate', { method: 'POST', body: JSON.stringify({ config }) }),
  saveAutomod: (config: string, previousRevisionId?: string) =>
    request<{ ok: true; revisionId?: string }>('/api/automod/config', {
      method: 'POST',
      body: JSON.stringify({ config, previousRevisionId }),
    }),
};
