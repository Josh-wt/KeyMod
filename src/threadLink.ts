export type ThreadLink = { postId: string; commentId?: string };

/** Parse a Reddit permalink without fetching a user-supplied URL. */
export function parseThreadLink(input: string): ThreadLink {
  const value = input.trim();
  let url: URL;
  try {
    url = new URL(value.startsWith('/') ? `https://www.reddit.com${value}` : /^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    throw new Error('Paste a Reddit thread link, such as https://www.reddit.com/r/community/comments/abc123/title/.');
  }
  const host = url.hostname.toLowerCase();
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port ||
      !(host === 'reddit.com' || host.endsWith('.reddit.com') || host === 'redd.it')) {
    throw new Error('Use a reddit.com thread link or a redd.it short link.');
  }
  const path = url.pathname.replace(/\/$/, '').replace(/\.json$/i, '');
  if (/^\/r\/[^/]+\/s\//i.test(path)) {
    throw new Error('Use the thread permalink containing /comments/ instead of a /s/ share link.');
  }
  const match = host === 'redd.it'
    ? path.match(/^\/([a-z0-9]+)$/i)
    : path.match(/^\/(?:r\/[^/]+\/)?comments\/([a-z0-9]+)(?:\/[^/]+(?:\/([a-z0-9]+))?)?$/i);
  if (!match) throw new Error('This is not a Reddit thread link. Open the post and copy its /comments/ permalink.');
  return { postId: `t3_${match[1].toLowerCase()}`, ...(match[2] ? { commentId: `t1_${match[2].toLowerCase()}` } : {}) };
}
