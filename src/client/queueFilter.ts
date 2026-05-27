import { inferPostMediaKind } from '../postKind';
import type { PostMediaKind, QueueFilter, QueueItem, QueuePostKindFilter } from '../shared';

export function filterQueueItems(
  items: QueueItem[],
  filter: QueueFilter,
  postKindFilter: QueuePostKindFilter = 'all',
): QueueItem[] {
  let result = items;
  if (filter === 'posts') result = result.filter((item) => item.type === 'post');
  else if (filter === 'comments') result = result.filter((item) => item.type === 'comment');
  else if (filter === 'reported') {
    result = result.filter((item) => item.numReports > 0 || item.reportReasons.length > 0);
  }

  if (postKindFilter !== 'all') {
    result = result.filter((item) => item.type === 'post' && inferPostMediaKind(item) === postKindFilter);
  }

  return result;
}

export function queueStats(items: QueueItem[]) {
  const posts = items.filter((item) => item.type === 'post');
  const comments = items.length - posts.length;
  const reported = items.filter((item) => item.numReports > 0 || item.reportReasons.length > 0).length;
  return { total: items.length, posts: posts.length, comments, reported };
}

export function queuePostKindStats(items: QueueItem[]) {
  const posts = items.filter((item) => item.type === 'post');
  const counts: Record<PostMediaKind, number> = { text: 0, image: 0, video: 0 };
  for (const post of posts) {
    counts[inferPostMediaKind(post)] += 1;
  }
  return counts;
}
