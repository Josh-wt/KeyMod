import { context as requestContext, reddit } from '@devvit/web/server';
import type { RemovalReason } from '../shared';

type ModNoteLabel = 'BOT_BAN' | 'PERMA_BAN' | 'BAN' | 'ABUSE_WARNING' | 'SPAM_WARNING' | 'SPAM_WATCH' | 'SOLID_CONTRIBUTOR' | 'HELPFUL_USER';

const NOTE_MAX = 250;

type AttributionItem = {
  id: string;
  author: string;
};

type AttributionOptions = {
  label?: ModNoteLabel;
  redditId?: string;
};

export async function getActingModeratorUsername(): Promise<string | null> {
  if (requestContext.username) return requestContext.username;

  const userId = requestContext.userId;
  if (!userId) return null;

  try {
    const user = await reddit.getUserById(userId as never);
    return user?.username ?? null;
  } catch {
    return null;
  }
}

function buildNote(summary: string, modUsername: string) {
  const text = `${summary} Initiated by u/${modUsername}.`;
  return text.length > NOTE_MAX ? `${text.slice(0, NOTE_MAX - 3)}...` : text;
}

export function removalAttributionSummary(
  removalReasonIndex: number,
  asSpam: boolean,
  reasons: RemovalReason[],
): string {
  const configured = reasons.find((reason) => reason.index === removalReasonIndex);
  const label = configured?.text.trim()
    ? configured.text.trim().slice(0, 80)
    : `rule ${removalReasonIndex}`;
  if (asSpam) return `Spam-removed via KeyModerator (${label}).`;
  return `Removed via KeyModerator (${label}).`;
}

// Devvit moderation APIs run as the app account. Keep the human initiator attached to the target user.
export async function attributeModAction(
  items: AttributionItem[],
  summary: string,
  options?: AttributionOptions,
): Promise<void> {
  const modUsername = await getActingModeratorUsername();
  if (!modUsername) return;

  const subreddit = requestContext.subredditName;
  if (!subreddit) return;

  await Promise.allSettled(
    items.map(async (item) => {
      if (!item.author || item.author === '[deleted]') return;
      await reddit.addModNote({
        subreddit,
        user: item.author,
        note: buildNote(summary, modUsername),
        ...(item.id ? { redditId: item.id as never } : {}),
        label: options?.label,
      });
    }),
  );
}

export async function attributeUserModAction(username: string, summary: string, options?: AttributionOptions): Promise<void> {
  await attributeModAction(
    [
      {
        id: options?.redditId ?? '',
        author: username,
      },
    ],
    summary,
    options,
  );
}
