export function feedAge(createdAt?: number) {
  if (!createdAt) return '';
  const seconds = Math.max(1, Math.floor((Date.now() - createdAt) / 1000));
  if (seconds < 60) return 'a moment';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)} hr`;
  const days = seconds / 86_400;
  if (days < 30) return `${Math.floor(days)} d`;
  if (days < 365) return `${Math.round(days / 30)} mo`;
  return `${Math.floor(days / 365)} yr`;
}

export function compactNumber(value?: number) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return '0';
  if (Math.abs(number) >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}m`;
  if (Math.abs(number) >= 1_000) return `${(number / 1_000).toFixed(1)}k`;
  return String(number);
}

export function subredditInitials(value: string) {
  const normalized = value.replace(/^r\//, '').trim();
  return normalized.slice(0, 2).toUpperCase() || 'r/';
}

export function isRenderableMedia(url?: string) {
  if (!url) return false;
  return !['self', 'default', 'nsfw', 'spoiler', 'image'].includes(url);
}

export function mediaUrl(previewUrl?: string, thumbnail?: string) {
  if (isRenderableMedia(previewUrl)) return previewUrl;
  if (isRenderableMedia(thumbnail)) return thumbnail;
  return '';
}
