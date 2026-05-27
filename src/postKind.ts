import type { PostMediaKind, QueueItem } from './shared';

function isRenderableMedia(url?: string) {
  if (!url) return false;
  return !['self', 'default', 'nsfw', 'spoiler', 'image'].includes(url);
}

function mediaUrl(previewUrl?: string, thumbnail?: string) {
  if (isRenderableMedia(previewUrl)) return previewUrl;
  if (isRenderableMedia(thumbnail)) return thumbnail;
  return '';
}

/** Classify a post for queue filtering (text / image / video). */
export function inferPostMediaKind(item: QueueItem): PostMediaKind {
  if (item.postMediaKind) return item.postMediaKind;
  if (item.type !== 'post') return 'text';

  const url = item.url ?? '';
  if (/v\.redd\.it/i.test(url) || item.domain === 'v.redd.it') return 'video';
  if (mediaUrl(item.previewUrl, item.thumbnail)) return 'image';
  return 'text';
}
