export function redditPermalinkUrl(permalink: string) {
  if (!permalink) return 'https://www.reddit.com';
  if (/^https?:\/\//i.test(permalink)) return permalink;
  const path = permalink.startsWith('/') ? permalink : `/${permalink}`;
  return `https://www.reddit.com${path}`;
}
