import type { QueueFilter, QueueItem } from '../shared';

export function filterQueueItems(items: QueueItem[], filter: QueueFilter): QueueItem[] {
  if (filter === 'posts') return items.filter((item) => item.type === 'post');
  if (filter === 'comments') return items.filter((item) => item.type === 'comment');
  if (filter === 'reported') {
    return items.filter((item) => item.numReports > 0 || item.reportReasons.length > 0);
  }
  return items;
}

export function queueStats(items: QueueItem[]) {
  const posts = items.filter((item) => item.type === 'post').length;
  const comments = items.length - posts;
  const reported = items.filter((item) => item.numReports > 0 || item.reportReasons.length > 0).length;
  return { total: items.length, posts, comments, reported };
}
