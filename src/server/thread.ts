import type { QueueItem, ThreadData } from '../shared';
import { parseThreadLink } from '../threadLink';

export class ThreadError extends Error {
  constructor(message: string, readonly status: 400 | 403 | 404 = 400) { super(message); }
}

type ThreadReader = {
  post: (id: string) => Promise<QueueItem>;
  comments: (postId: string) => Promise<QueueItem[]>;
  comment: (id: string) => Promise<QueueItem>;
};

export async function readThread(link: string, subreddit: string, reader: ThreadReader): Promise<ThreadData> {
  let target;
  try { target = parseThreadLink(link); }
  catch (error) { throw new ThreadError(error instanceof Error ? error.message : 'Invalid thread link.'); }
  const post = await reader.post(target.postId).catch(() => {
    throw new ThreadError('This post could not be found or is unavailable.', 404);
  });
  if (post.subreddit.toLowerCase() !== subreddit.toLowerCase()) {
    throw new ThreadError(`Open a thread from r/${subreddit}. KeyModerator moderates the community where it is installed.`, 403);
  }
  const comments = await reader.comments(post.id);
  if (target.commentId && !comments.some((comment) => comment.id === target.commentId)) {
    const comment = await reader.comment(target.commentId).catch(() => {
      throw new ThreadError('The linked comment could not be found or is unavailable.', 404);
    });
    if (comment.postId !== post.id || comment.subreddit.toLowerCase() !== subreddit.toLowerCase()) {
      throw new ThreadError('The linked comment does not belong to this thread.');
    }
    // Deep comment permalinks can fall outside the initial comment listing.
    const chain = [comment];
    const seen = new Set([comment.id]);
    let parentId = comment.parentId;
    while (parentId?.startsWith('t1_') && !seen.has(parentId) && chain.length < 30) {
      seen.add(parentId);
      const existing = comments.find((item) => item.id === parentId);
      if (existing) break;
      const parent = await reader.comment(parentId).catch(() => null);
      if (!parent || parent.postId !== post.id) break;
      chain.unshift(parent);
      parentId = parent.parentId;
    }
    comments.push(...chain);
  }
  return { post, comments, focusedId: target.commentId ?? post.id };
}
