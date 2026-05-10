import type {
  AppSettings,
  AutomodPanelData,
  AutomodValidation,
  ModLogMatrix,
  NotificationCounts,
  QueueItem,
  UserInfo,
} from '../shared';

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
  remove: (ids: string[], removalReasonIndex: number) =>
    request<{ batchId: string; ok: number; failed: number }>('/api/remove', {
      method: 'POST',
      body: JSON.stringify({ ids, removalReasonIndex }),
    }),
  undo: (batchId: string) =>
    request<{ restored: number; failed: number }>('/api/undo', {
      method: 'POST',
      body: JSON.stringify({ batchId }),
    }),
  approve: (ids: string[]) =>
    request<{ ok: number; failed: number }>('/api/approve', { method: 'POST', body: JSON.stringify({ ids }) }),
  lock: (ids: string[]) =>
    request<{ ok: number; failed: number }>('/api/lock', { method: 'POST', body: JSON.stringify({ ids }) }),
  ban: (authorId: string, duration: number | 'permanent', reason: string) =>
    request<{ ok: true }>('/api/ban', { method: 'POST', body: JSON.stringify({ authorId, duration, reason }) }),
  flairs: () => request<{ flairs: Array<{ id: string; text?: string; name?: string }> }>('/api/flairs'),
  flair: (postId: string, flairId: string) =>
    request<{ ok: true }>('/api/flair', { method: 'POST', body: JSON.stringify({ postId, flairId }) }),
  note: (userId: string, note: string) =>
    request<{ ok: true }>('/api/note', { method: 'POST', body: JSON.stringify({ userId, note }) }),
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
