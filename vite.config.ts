import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

function json(res: import('node:http').ServerResponse, body: unknown) {
  res.statusCode = 200;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

const subredditIcon = 'https://styles.redditmedia.com/t5_2qh1i/styles/communityIcon_9hz6t2r2zqb61.png';
const previewImage = 'https://styles.redditmedia.com/t5_2qh1i/styles/bannerBackgroundImage_5a4axis7cku61.png';

const crowdLevels = ['OFF', 'LENIENT', 'MEDIUM', 'STRICT'] as const;

const demoItemsSeed = [
  {
    id: 't3_keyqueue_demo_1',
    type: 'post',
    title: "I'm crine, how'd they score negative on their global freedom score",
    body: 'Moderator queue preview data shown by the local Vite dev server.',
    author: 'sample_author',
    authorId: 'u_sample_author',
    subreddit: 'teenagers',
    subredditIcon,
    permalink: 'https://reddit.com/r/teenagers/comments/demo',
    createdAt: Date.now() - 11 * 60 * 60 * 1000,
    reportReasons: ['Spam', 'Rule 1'],
    numReports: 3,
    score: 46,
    numComments: 8,
    flairText: 'Growth',
    previewUrl: previewImage,
    thumbnail: previewImage,
    url: 'https://reddit.com/r/teenagers/comments/demo',
    domain: 'reddit.com',
  },
  {
    id: 't1_keyqueue_demo_2',
    type: 'comment',
    title: 'Another queued comment that needs review',
    body: 'This comment preview demonstrates the crosspost-style thread layout for mod queue comments.',
    author: 'queue_regular',
    authorId: 'u_queue_regular',
    subreddit: 'teenagers',
    subredditIcon,
    postId: 't3_keyqueue_demo_1',
    permalink: 'https://reddit.com/r/teenagers/comments/demo/comment',
    createdAt: Date.now() - 5 * 60 * 60 * 1000,
    reportReasons: ['Harassment'],
    numReports: 1,
    score: -4,
    numComments: 42,
    parentPostTitle: "I'm crine, how'd they score negative on their global freedom score",
    parentPostPermalink: 'https://reddit.com/r/teenagers/comments/demo',
    parentPost: {
      id: 't3_keyqueue_demo_1',
      title: "I'm crine, how'd they score negative on their global freedom score",
      permalink: 'https://reddit.com/r/teenagers/comments/demo',
      subreddit: 'teenagers',
      subredditIcon,
      author: 'sample_author',
      createdAt: Date.now() - 11 * 60 * 60 * 1000,
      previewUrl: previewImage,
      thumbnail: previewImage,
      score: 46,
      numComments: 8,
    },
  },
  {
    id: 't3_keyqueue_demo_3',
    type: 'post',
    title: 'Low signal self-promo post',
    body: 'Repeated submission from a new account.',
    author: 'new_account',
    authorId: 'u_new_account',
    subreddit: 'teenagers',
    subredditIcon,
    permalink: 'https://reddit.com/r/teenagers/comments/demo3',
    createdAt: Date.now() - 26 * 60 * 60 * 1000,
    reportReasons: [],
    numReports: 0,
    score: 12,
    numComments: 7,
    flairText: 'Self Promo',
    url: 'https://example.com/repeated-submission',
    domain: 'example.com',
  },
] as const;

type DemoItem = (typeof demoItemsSeed)[number];
type ModPatch = {
  locked?: boolean;
  nsfw?: boolean;
  spoiler?: boolean;
  stickied?: boolean;
  crowdControlLevel?: (typeof crowdLevels)[number];
  distinguished?: boolean;
  ignoringReports?: boolean;
};

let queueItems: DemoItem[] = [...demoItemsSeed];
const modPatches: Record<string, ModPatch> = {};
const removedIds = new Set<string>();

function mergeItem(item: DemoItem) {
  return { ...item, ...modPatches[item.id] };
}

function readJsonBody(req: import('node:http').IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function localApiPlugin(): Plugin {
  return {
    name: 'keyqueue-local-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
        if (!pathname.startsWith('/api/')) {
          next();
          return;
        }

        const url = pathname.slice('/api'.length);
        if (url.startsWith('/settings')) {
          json(res, {
            keymap: {
              approve: 's',
              ban: 'b',
              lock: 'l',
              flair: 'f',
              note: 'm',
              user: 'u',
              next: 'j',
              prev: 'k',
              select: ' ',
              undo: 'Backspace',
              help: '?',
            },
            removalReasons: Array.from({ length: 9 }, (_, index) => ({
              index: index + 1,
              text: index === 0 ? 'Rule 1' : '',
              flairId: '',
            })),
            banReasons: Array.from({ length: 9 }, (_, index) => ({
              index: index + 1,
              reason: index === 0 ? 'Spam / repeated rule-breaking' : '',
              message: index === 0 ? 'You have been banned for repeated rule-breaking.' : '',
              note: index === 0 ? 'KeyQueue ban reason 1' : '',
              duration: index === 0 ? 7 : 0,
            })),
            conflicts: [],
          });
          return;
        }
        if (url.startsWith('/queue')) {
          json(res, {
            items: queueItems.filter((item) => !removedIds.has(item.id)).map(mergeItem),
            after: null,
          });
          return;
        }
        if (url.startsWith('/user/')) {
          const username = decodeURIComponent(url.split('/').pop() ?? 'user');
          const recentPosts = [
            {
              id: 'user_post_1',
              type: 'post',
              title: 'Question about recurring link removals',
              body: 'I keep seeing this domain filtered and wanted to understand the rule.',
              subreddit: 'modqueue',
              permalink: 'https://reddit.com/r/modqueue/comments/user_post_1',
              createdAt: Date.now() - 3 * 60 * 60 * 1000,
            },
            {
              id: 'user_post_2',
              type: 'post',
              title: 'Weekly discussion thread reply follow-up',
              body: '',
              subreddit: 'modqueue',
              permalink: 'https://reddit.com/r/modqueue/comments/user_post_2',
              createdAt: Date.now() - 2 * 86_400_000,
            },
          ];
          const recentComments = [
            {
              id: 'user_comment_1',
              type: 'comment',
              title: 'Comment in suspicious link thread',
              body: 'This is a preview of the user comment body from recent history.',
              subreddit: 'modqueue',
              permalink: 'https://reddit.com/r/modqueue/comments/user_comment_1',
              createdAt: Date.now() - 90 * 60 * 1000,
            },
            {
              id: 'user_comment_2',
              type: 'comment',
              title: 'Comment in rules clarification thread',
              body: 'Another recent comment in this subreddit for moderator context.',
              subreddit: 'modqueue',
              permalink: 'https://reddit.com/r/modqueue/comments/user_comment_2',
              createdAt: Date.now() - 5 * 86_400_000,
            },
          ];
          json(res, {
            username,
            accountAgeDays: 418,
            combinedKarma: 12420,
            recentInSub: 7,
            priorRemovals: 2,
            recentActivity: [...recentPosts, ...recentComments],
            recentPosts,
            recentComments,
            modNotes: [
              {
                id: 'note_1',
                note: 'Prior spam warnings in this subreddit.',
                moderator: 'mod_alpha',
                createdAt: Date.now() - 2 * 86_400_000,
                label: 'SPAM_WARNING',
              },
            ],
            modLog: [
              {
                id: 'modlog_1',
                action: 'removecomment',
                moderator: 'mod_alpha',
                targetId: 't1_user_comment_1',
                details: 'Removed for Rule 1',
                createdAt: Date.now() - 4 * 86_400_000,
              },
              {
                id: 'modlog_2',
                action: 'approvelink',
                moderator: 'mod_beta',
                targetId: 't3_user_post_2',
                details: 'Approved after appeal',
                createdAt: Date.now() - 12 * 86_400_000,
              },
            ],
          });
          return;
        }
        if (url.startsWith('/flairs')) {
          json(res, {
            flairs: [
              { id: 'flair_rule_1', text: 'Rule 1' },
              { id: 'flair_spam', text: 'Spam' },
              { id: 'flair_reviewed', text: 'Reviewed' },
            ],
          });
          return;
        }
        if (url.startsWith('/notifications')) {
          json(res, { modqueue: 4, modmail: 2, messages: 1, unmoderated: 8 });
          return;
        }
        if (url.startsWith('/mod-log')) {
          json(res, {
            rows: [
              { action: 'remove', today: 7, sevenDays: 22, thirtyDays: 91 },
              { action: 'approve', today: 5, sevenDays: 31, thirtyDays: 126 },
              { action: 'lock', today: 2, sevenDays: 8, thirtyDays: 19 },
              { action: 'ban', today: 1, sevenDays: 4, thirtyDays: 12 },
            ],
          });
          return;
        }
        if (url.startsWith('/automod/validate')) {
          json(res, { ok: true, errors: [], warnings: ['Preview validation checks syntax shape only.'] });
          return;
        }
        if (url.startsWith('/automod/config')) {
          json(res, { ok: true, revisionId: 'preview-rev-2' });
          return;
        }
        if (url.startsWith('/automod')) {
          json(res, {
            status: 'available',
            revisionId: 'preview-rev-1',
            config: [
              '---',
              'type: submission',
              'author:',
              '  account_age: "< 3 days"',
              'action: filter',
              'action_reason: "New account"',
            ].join('\n'),
            recentFilters: [
              {
                id: 't3_auto_1',
                type: 'post',
                title: 'Filtered new account submission',
                author: 'new_account',
                reason: 'New account',
                removedAt: Date.now() - 600000,
                permalink: 'https://reddit.com/r/modqueue/comments/auto1',
              },
              {
                id: 't1_auto_2',
                type: 'comment',
                title: 'Filtered comment with suspicious domain',
                author: 'link_dropper',
                reason: 'Domain filter',
                removedAt: Date.now() - 3600000,
                permalink: 'https://reddit.com/r/modqueue/comments/auto2',
              },
            ],
          });
          return;
        }
        const writeMod = (updates: Array<{ id: string } & ModPatch>) => {
          for (const update of updates) {
            const { id, ...patch } = update;
            modPatches[id] = { ...modPatches[id], ...patch };
          }
          json(res, { ok: updates.length, failed: 0, updates });
        };

        if (
          url.startsWith('/remove') ||
          url.startsWith('/approve') ||
          url.startsWith('/lock') ||
          url.startsWith('/nsfw') ||
          url.startsWith('/spoiler') ||
          url.startsWith('/highlight') ||
          url.startsWith('/crowd-control') ||
          url.startsWith('/distinguish') ||
          url.startsWith('/ignore-reports') ||
          url.startsWith('/mute') ||
          url.startsWith('/ban') ||
          url.startsWith('/flair') ||
          url.startsWith('/note')
        ) {
          void readJsonBody(req)
            .then((body) => {
              const payload = (body ?? {}) as { ids?: string[]; level?: (typeof crowdLevels)[number] };
              const ids = payload.ids ?? [];

              if (url.startsWith('/remove')) {
                for (const id of ids) removedIds.add(id);
                json(res, { batchId: crypto.randomUUID(), ok: ids.length, failed: 0 });
                return;
              }

              if (url.startsWith('/approve')) {
                for (const id of ids) removedIds.add(id);
                json(res, { ok: ids.length, failed: 0, updates: ids.map((id) => ({ id })) });
                return;
              }

              if (url.startsWith('/lock')) {
                writeMod(
                  ids.map((id) => {
                    const locked = !modPatches[id]?.locked;
                    return { id, locked };
                  }),
                );
                return;
              }

              if (url.startsWith('/nsfw')) {
                writeMod(
                  ids.filter((id) => id.startsWith('t3_')).map((id) => {
                    const nsfw = !modPatches[id]?.nsfw;
                    return { id, nsfw };
                  }),
                );
                return;
              }

              if (url.startsWith('/spoiler')) {
                writeMod(
                  ids.filter((id) => id.startsWith('t3_')).map((id) => {
                    const spoiler = !modPatches[id]?.spoiler;
                    return { id, spoiler };
                  }),
                );
                return;
              }

              if (url.startsWith('/highlight')) {
                writeMod(
                  ids.filter((id) => id.startsWith('t3_')).map((id) => {
                    const stickied = !modPatches[id]?.stickied;
                    return { id, stickied };
                  }),
                );
                return;
              }

              if (url.startsWith('/distinguish')) {
                writeMod(
                  ids.map((id) => {
                    const distinguished = !modPatches[id]?.distinguished;
                    return { id, distinguished };
                  }),
                );
                return;
              }

              if (url.startsWith('/ignore-reports')) {
                writeMod(
                  ids.map((id) => {
                    const ignoringReports = !modPatches[id]?.ignoringReports;
                    return { id, ignoringReports };
                  }),
                );
                return;
              }

              if (url.startsWith('/mute')) {
                json(res, { ok: true, muted: true });
                return;
              }

              if (url.startsWith('/crowd-control')) {
                writeMod(
                  ids.filter((id) => id.startsWith('t3_')).map((id) => {
                    const current = modPatches[id]?.crowdControlLevel ?? 'OFF';
                    const index = crowdLevels.indexOf(current);
                    const next = payload.level ?? crowdLevels[(index + 1) % crowdLevels.length];
                    return { id, crowdControlLevel: next };
                  }),
                );
                return;
              }

              json(res, { ok: true });
            })
            .catch(() => {
              res.statusCode = 400;
              json(res, { error: 'Invalid JSON body' });
            });
          return;
        }
        if (url.startsWith('/undo')) {
          removedIds.clear();
          json(res, { restored: queueItems.length, failed: 0 });
          return;
        }
        json(res, { ok: true });
      });
    },
  };
}

export default defineConfig({
  root: 'src/client',
  plugins: [react(), localApiPlugin()],
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
});
