import { Devvit } from '@devvit/public-api';
import { resolveSettings, settingDefinitions } from './settings';

Devvit.configure({
  redditAPI: true,
  redis: true,
});

for (const definition of settingDefinitions) {
  Devvit.addSettings?.([definition as never]);
}

Devvit.addMenuItem({
  label: 'Open KeyQueue',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    await context.ui.showToast('Opening KeyQueue');
    await context.ui.navigateTo?.('/keyqueue');
  },
});

Devvit.addSchedulerJob({
  name: 'finalize_removal',
  onRun: async (event, context) => {
    const { batchId, ids, removalReasonIndex } = event.data as {
      batchId: string;
      ids: string[];
      removalReasonIndex: number;
    };
    const key = `undo:batch:${batchId}`;
    const pending = await context.redis.get(key);
    if (!pending) return;

    const settings = await resolveSettings(context.settings);
    const reason = settings.removalReasons.find((item) => item.index === removalReasonIndex);
    const message = reason?.text?.trim();
    const flairId = reason?.flairId?.trim();

    await Promise.allSettled(
      ids.map(async (id) => {
        if (message) {
          await context.reddit.sendPrivateMessage?.({
            to: id,
            subject: 'Your post or comment was removed',
            text: message,
          });
        }
        if (flairId) {
          await context.reddit.setPostFlair?.({
            postId: id,
            flairTemplateId: flairId,
            subredditName: context.subredditName ?? '',
          });
        }
      }),
    );
    await context.redis.del(key);
  },
});

async function recordAutomodFilter(event: unknown, context: Parameters<NonNullable<typeof Devvit.addTrigger>>[0] extends never ? never : any) {
  const data = event as Record<string, any>;
  const thing = data.post ?? data.comment ?? data;
  const subredditId = context.subredditId ?? thing.subredditId ?? 'unknown';
  const key = `automod:filters:${subredditId}`;
  const existing = await context.redis.get(key).catch(() => null);
  const events = existing ? JSON.parse(existing) : [];
  events.unshift({
    id: thing.id ?? data.id,
    type: data.comment ? 'comment' : 'post',
    title: thing.title ?? String(thing.body ?? '').slice(0, 90),
    author: thing.authorName ?? thing.author ?? '[deleted]',
    reason: data.reason ?? '',
    removedAt: Date.now(),
    permalink: thing.permalink ?? '',
  });
  await context.redis.set(key, JSON.stringify(events.slice(0, 50)));
}

Devvit.addTrigger?.({
  event: 'AutomoderatorFilterPost',
  onEvent: recordAutomodFilter,
});

Devvit.addTrigger?.({
  event: 'AutomoderatorFilterComment',
  onEvent: recordAutomodFilter,
});

export default Devvit;
