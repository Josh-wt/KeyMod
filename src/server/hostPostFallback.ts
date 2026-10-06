export function hostPostWebUrl(postId: string): string {
  const id = postId.replace(/^t3_/, '');
  if (!/^[a-z0-9]+$/i.test(id)) throw new Error('Invalid KeyModerator host post id.');
  // This host opens the current Reddit UI even for people who prefer old Reddit.
  return `https://sh.reddit.com/comments/${id}/`;
}

export function hostPostFallback(subredditName: string, postId?: string): string {
  const destination = postId
    ? hostPostWebUrl(postId)
    : `https://sh.reddit.com/r/${encodeURIComponent(subredditName)}/`;
  return [
    '**KeyModerator**',
    '',
    'Review your moderation queue, open comment threads, and moderate with your keyboard.',
    '',
    `[Open KeyModerator](${destination})`,
    '',
    'The workspace opens on current Reddit or in the Reddit app. Sign in with a moderator account for this community, then choose **Open KeyModerator**.',
  ].join('\n');
}
