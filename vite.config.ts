import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

function json(res: import('node:http').ServerResponse, body: unknown) {
  res.statusCode = 200;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

const demoItems = [
  {
    id: 't3_keyqueue_demo_1',
    type: 'post',
    title: 'Post title here with a suspicious link',
    body: 'Moderator queue preview data shown by the local Vite dev server.',
    author: 'sample_author',
    authorId: 'u_sample_author',
    subreddit: 'modqueue',
    permalink: 'https://reddit.com/r/modqueue/comments/demo',
    createdAt: Date.now() - 2 * 60 * 60 * 1000,
    reportReasons: ['Spam', 'Rule 1'],
    numReports: 3,
  },
  {
    id: 't1_keyqueue_demo_2',
    type: 'comment',
    title: 'Another queued comment that needs review',
    body: 'This comment preview demonstrates keyboard focus, selection, and user panel states.',
    author: 'queue_regular',
    authorId: 'u_queue_regular',
    subreddit: 'modqueue',
    permalink: 'https://reddit.com/r/modqueue/comments/demo/comment',
    createdAt: Date.now() - 5 * 60 * 60 * 1000,
    reportReasons: ['Harassment'],
    numReports: 1,
  },
  {
    id: 't3_keyqueue_demo_3',
    type: 'post',
    title: 'Low signal self-promo post',
    body: 'Repeated submission from a new account.',
    author: 'new_account',
    authorId: 'u_new_account',
    subreddit: 'modqueue',
    permalink: 'https://reddit.com/r/modqueue/comments/demo3',
    createdAt: Date.now() - 26 * 60 * 60 * 1000,
    reportReasons: [],
    numReports: 0,
  },
];

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
            conflicts: [],
          });
          return;
        }
        if (url.startsWith('/queue')) {
          json(res, { items: demoItems, after: null });
          return;
        }
        if (url.startsWith('/user/')) {
          const username = decodeURIComponent(url.split('/').pop() ?? 'user');
          json(res, {
            username,
            accountAgeDays: 418,
            combinedKarma: 12420,
            recentInSub: 7,
            priorRemovals: 2,
            recentActivity: demoItems.slice(0, 2).map((item) => ({
              id: item.id,
              title: item.title,
              permalink: item.permalink,
              createdAt: item.createdAt,
            })),
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
        if (url.startsWith('/remove')) {
          json(res, { batchId: crypto.randomUUID(), ok: 1, failed: 0 });
          return;
        }
        if (url.startsWith('/undo')) {
          json(res, { restored: 1, failed: 0 });
          return;
        }
        if (url.startsWith('/approve') || url.startsWith('/lock')) {
          json(res, { ok: 1, failed: 0 });
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
