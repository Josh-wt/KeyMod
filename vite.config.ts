import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import type { QueueItem } from './src/shared';

function json(res: import('node:http').ServerResponse, body: unknown) {
  res.statusCode = 200;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

const subredditIcon = 'https://styles.redditmedia.com/t5_2qh1i/styles/communityIcon_9hz6t2r2zqb61.png';
const previewImage = 'https://styles.redditmedia.com/t5_2qh1i/styles/bannerBackgroundImage_5a4axis7cku61.png';

const crowdLevels = ['OFF', 'LENIENT', 'MEDIUM', 'STRICT'] as const;

const demoItemsSeed: QueueItem[] = [
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
    id: 't1_chain_1',
    type: 'comment',
    title: 'Chain Comment 1',
    body: 'Chain Comment 1',
    author: 'eyal282',
    authorId: 'u_eyal282',
    subreddit: 'teenagers',
    subredditIcon,
    postId: 't3_keyqueue_demo_1',
    parentId: 't3_keyqueue_demo_1',
    permalink: 'https://reddit.com/r/teenagers/comments/demo/chain1',
    createdAt: Date.now() - 5 * 60 * 60 * 1000,
    reportReasons: [],
    numReports: 0,
    score: 1,
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
    id: 't1_chain_2',
    type: 'comment',
    title: 'Chain Comment 2',
    body: 'Chain Comment 2',
    author: 'eyal282',
    authorId: 'u_eyal282',
    subreddit: 'teenagers',
    subredditIcon,
    postId: 't3_keyqueue_demo_1',
    parentId: 't1_chain_1',
    permalink: 'https://reddit.com/r/teenagers/comments/demo/chain2',
    createdAt: Date.now() - 4 * 60 * 60 * 1000,
    reportReasons: ['Harassment'],
    numReports: 1,
    score: 1,
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
  {
    id: 't1_keyqueue_demo_4',
    type: 'comment',
    title: 'Comment in image macro thread',
    body: 'Everyone here is overreacting. This is obviously fake and the OP should stop farming attention.',
    author: 'blunt_reply_22',
    authorId: 'u_blunt_reply_22',
    subreddit: 'teenagers',
    subredditIcon,
    postId: 't3_keyqueue_demo_5',
    permalink: 'https://reddit.com/r/teenagers/comments/demo5/comment1',
    createdAt: Date.now() - 34 * 60 * 1000,
    reportReasons: ['Incivility', 'Personal information'],
    numReports: 5,
    score: -18,
    numComments: 16,
    parentPostTitle: 'Found this posted with my school name visible',
    parentPostPermalink: 'https://reddit.com/r/teenagers/comments/demo5',
    parentPost: {
      id: 't3_keyqueue_demo_5',
      title: 'Found this posted with my school name visible',
      permalink: 'https://reddit.com/r/teenagers/comments/demo5',
      subreddit: 'teenagers',
      subredditIcon,
      author: 'privacy_throwaway',
      createdAt: Date.now() - 2 * 60 * 60 * 1000,
      previewUrl: previewImage,
      thumbnail: previewImage,
      score: 183,
      numComments: 16,
    },
  },
  {
    id: 't3_keyqueue_demo_5',
    type: 'post',
    title: 'Found this posted with my school name visible',
    body: 'Can someone help me get this removed? I blurred most of it but the comments are naming people.',
    author: 'privacy_throwaway',
    authorId: 'u_privacy_throwaway',
    subreddit: 'teenagers',
    subredditIcon,
    permalink: 'https://reddit.com/r/teenagers/comments/demo5',
    createdAt: Date.now() - 2 * 60 * 60 * 1000,
    reportReasons: ['Personal information', 'Rule 2'],
    numReports: 11,
    score: 183,
    numComments: 16,
    flairText: 'Serious',
    previewUrl: previewImage,
    thumbnail: previewImage,
    url: previewImage,
    domain: 'i.redd.it',
    spoiler: true,
  },
  {
    id: 't3_keyqueue_demo_6',
    type: 'post',
    title: 'Check out my new app for getting free gift cards',
    body: 'I made a site that totally works, just sign in and share it with friends.',
    author: 'promo_sprinter',
    authorId: 'u_promo_sprinter',
    subreddit: 'teenagers',
    subredditIcon,
    permalink: 'https://reddit.com/r/teenagers/comments/demo6',
    createdAt: Date.now() - 48 * 60 * 1000,
    reportReasons: ['Spam', 'Suspicious link', 'Self promotion'],
    numReports: 9,
    score: -12,
    numComments: 3,
    flairText: 'Question',
    url: 'https://gift-card-example.invalid/login',
    domain: 'gift-card-example.invalid',
    crowdControlLevel: 'STRICT',
  },
  {
    id: 't1_keyqueue_demo_7',
    type: 'comment',
    title: 'Possible ban evasion comment',
    body: 'New account because my last one got banned here, but the mods were wrong and I am back.',
    author: 'definitely_new_2026',
    authorId: 'u_definitely_new_2026',
    subreddit: 'teenagers',
    subredditIcon,
    postId: 't3_keyqueue_demo_8',
    permalink: 'https://reddit.com/r/teenagers/comments/demo8/comment1',
    createdAt: Date.now() - 7 * 60 * 60 * 1000,
    reportReasons: ['Ban evasion'],
    numReports: 2,
    score: 1,
    numComments: 64,
    parentPostTitle: 'Daily advice thread',
    parentPostPermalink: 'https://reddit.com/r/teenagers/comments/demo8',
    parentPost: {
      id: 't3_keyqueue_demo_8',
      title: 'Daily advice thread',
      permalink: 'https://reddit.com/r/teenagers/comments/demo8',
      subreddit: 'teenagers',
      subredditIcon,
      author: 'AutoModerator',
      createdAt: Date.now() - 9 * 60 * 60 * 1000,
      score: 74,
      numComments: 64,
    },
  },
  {
    id: 't3_keyqueue_demo_8',
    type: 'post',
    title: 'Daily advice thread',
    body: 'Use this thread for quick questions, school advice, and small updates.',
    author: 'AutoModerator',
    authorId: 'u_automoderator',
    subreddit: 'teenagers',
    subredditIcon,
    permalink: 'https://reddit.com/r/teenagers/comments/demo8',
    createdAt: Date.now() - 9 * 60 * 60 * 1000,
    reportReasons: [],
    numReports: 0,
    score: 74,
    numComments: 64,
    flairText: 'Megathread',
    stickied: true,
    distinguished: true,
    locked: true,
  },
  {
    id: 't3_keyqueue_demo_9',
    type: 'post',
    title: 'Is this concert ticket resale legit?',
    body: 'Someone in DMs offered two tickets and wants payment through a crypto wallet.',
    author: 'concert_help',
    authorId: 'u_concert_help',
    subreddit: 'teenagers',
    subredditIcon,
    permalink: 'https://reddit.com/r/teenagers/comments/demo9',
    createdAt: Date.now() - 17 * 60 * 60 * 1000,
    reportReasons: ['Scam', 'Transaction'],
    numReports: 4,
    score: 21,
    numComments: 19,
    flairText: 'Advice',
    url: 'https://reddit.com/r/teenagers/comments/demo9',
    domain: 'reddit.com',
    nsfw: true,
  },
  {
    id: 't1_keyqueue_demo_10',
    type: 'comment',
    title: 'Reported comment with ignored reports',
    body: 'This is a heated but policy-safe disagreement that has already been reviewed by another mod.',
    author: 'argument_regular',
    authorId: 'u_argument_regular',
    subreddit: 'teenagers',
    subredditIcon,
    postId: 't3_keyqueue_demo_9',
    permalink: 'https://reddit.com/r/teenagers/comments/demo9/comment2',
    createdAt: Date.now() - 13 * 60 * 1000,
    reportReasons: ['Harassment', 'Misinformation'],
    numReports: 7,
    score: 8,
    numComments: 19,
    parentPostTitle: 'Is this concert ticket resale legit?',
    parentPostPermalink: 'https://reddit.com/r/teenagers/comments/demo9',
    ignoringReports: true,
    parentPost: {
      id: 't3_keyqueue_demo_9',
      title: 'Is this concert ticket resale legit?',
      permalink: 'https://reddit.com/r/teenagers/comments/demo9',
      subreddit: 'teenagers',
      subredditIcon,
      author: 'concert_help',
      createdAt: Date.now() - 17 * 60 * 60 * 1000,
      score: 21,
      numComments: 19,
    },
  },
  {
    id: 't3_keyqueue_demo_11',
    type: 'post',
    title: 'Huge wall of text about school drama',
    body: [
      'This post is intentionally long so the queue preview has enough text to test wrapping and truncation.',
      'It includes multiple paragraphs, several names changed to initials, and a lot of context that moderators need to scan quickly.',
      'The reports disagree about whether it is gossip, bullying, or just a vent post.',
    ].join('\n\n'),
    author: 'longform_lurker',
    authorId: 'u_longform_lurker',
    subreddit: 'teenagers',
    subredditIcon,
    permalink: 'https://reddit.com/r/teenagers/comments/demo11',
    createdAt: Date.now() - 3 * 86_400_000,
    reportReasons: ['Drama', 'Rule 1', 'Potential bullying'],
    numReports: 6,
    score: 0,
    numComments: 27,
    flairText: 'Rant',
    url: 'https://reddit.com/r/teenagers/comments/demo11',
    domain: 'reddit.com',
    crowdControlLevel: 'MEDIUM',
  },
  {
    id: 't1_keyqueue_demo_12',
    type: 'comment',
    title: 'Short removed-looking comment',
    body: '[removed]',
    author: 'deleted_style_user',
    authorId: 'u_deleted_style_user',
    subreddit: 'teenagers',
    subredditIcon,
    postId: 't3_keyqueue_demo_11',
    permalink: 'https://reddit.com/r/teenagers/comments/demo11/comment4',
    createdAt: Date.now() - 4 * 86_400_000,
    reportReasons: [],
    numReports: 0,
    score: -1,
    numComments: 27,
    parentPostTitle: 'Huge wall of text about school drama',
    parentPostPermalink: 'https://reddit.com/r/teenagers/comments/demo11',
    locked: true,
  },
  {
    id: 't3_keyqueue_demo_13',
    type: 'post',
    title: 'External news article with misleading title',
    body: '',
    author: 'headline_checker',
    authorId: 'u_headline_checker',
    subreddit: 'teenagers',
    subredditIcon,
    permalink: 'https://reddit.com/r/teenagers/comments/demo13',
    createdAt: Date.now() - 6 * 86_400_000,
    reportReasons: ['Misinformation'],
    numReports: 1,
    score: 98,
    numComments: 41,
    flairText: 'News',
    thumbnail: previewImage,
    previewUrl: previewImage,
    url: 'https://example.org/news/local-school-policy',
    domain: 'example.org',
  },
  {
    id: 't1_keyqueue_demo_14',
    type: 'comment',
    title: 'Nested thread comment with high score',
    body: 'Leaving this up would make the thread easier to follow, but the wording is close to the line.',
    author: 'helpful_but_sharp',
    authorId: 'u_helpful_but_sharp',
    subreddit: 'teenagers',
    subredditIcon,
    postId: 't3_keyqueue_demo_13',
    permalink: 'https://reddit.com/r/teenagers/comments/demo13/comment7',
    createdAt: Date.now() - 43 * 60 * 60 * 1000,
    reportReasons: ['Rule 1'],
    numReports: 1,
    score: 212,
    numComments: 41,
    parentPostTitle: 'External news article with misleading title',
    parentPostPermalink: 'https://reddit.com/r/teenagers/comments/demo13',
    distinguished: true,
    parentPost: {
      id: 't3_keyqueue_demo_13',
      title: 'External news article with misleading title',
      permalink: 'https://reddit.com/r/teenagers/comments/demo13',
      subreddit: 'teenagers',
      subredditIcon,
      author: 'headline_checker',
      createdAt: Date.now() - 6 * 86_400_000,
      thumbnail: previewImage,
      previewUrl: previewImage,
      score: 98,
      numComments: 41,
      url: 'https://example.org/news/local-school-policy',
      domain: 'example.org',
    },
  },
  {
    id: 't3_keyqueue_demo_15',
    type: 'post',
    title: 'First post, please be nice',
    body: 'I am new here and wanted to introduce myself.',
    author: 'brand_new_voice',
    authorId: 'u_brand_new_voice',
    subreddit: 'teenagers',
    subredditIcon,
    permalink: 'https://reddit.com/r/teenagers/comments/demo15',
    createdAt: Date.now() - 19 * 60 * 1000,
    reportReasons: ['New account'],
    numReports: 1,
    score: 4,
    numComments: 0,
    flairText: 'Social',
    url: 'https://reddit.com/r/teenagers/comments/demo15',
    domain: 'reddit.com',
    crowdControlLevel: 'LENIENT',
  },
] satisfies QueueItem[];

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
const undoBatches = new Map<string, string[]>();

function mergeItem(item: DemoItem) {
  return { ...item, ...modPatches[item.id] };
}

function buildContextComments(item: QueueItem, byId: Map<string, QueueItem>): QueueItem[] {
  const chain: QueueItem[] = [];
  const seen = new Set<string>([item.id]);
  let parentId = item.parentId;

  while (parentId?.startsWith('t1_')) {
    if (seen.has(parentId)) break;
    seen.add(parentId);
    const parent = byId.get(parentId);
    if (!parent) break;
    chain.unshift(parent);
    parentId = parent.parentId;
  }

  return chain;
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
        if (url.startsWith('/subreddit-rules')) {
          json(res, {
            rules: [
              {
                id: 'local:0:spam',
                shortName: 'Spam',
                description: 'This content was removed for spam.',
                kind: 'all',
                violationReason: 'Spam',
                priority: 0,
              },
              {
                id: 'local:1:off-topic',
                shortName: 'Off topic',
                description: 'Posts and comments should stay relevant to the community.',
                kind: 'all',
                violationReason: 'Off topic',
                priority: 1,
              },
              {
                id: 'local:2:harassment',
                shortName: 'Harassment',
                description: 'Do not harass or bully other users.',
                kind: 'all',
                violationReason: 'Harassment',
                priority: 2,
              },
            ],
          });
          return;
        }
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
        const commentFeedMatch = url.match(/^\/feed\/([^/]+)\/comments$/);
        if (commentFeedMatch) {
          const postId = decodeURIComponent(commentFeedMatch[1]);
          json(res, {
            comments: [
              {
                id: 't1_feed_comment_1',
                type: 'comment',
                title: 'Comment about the opened feed post',
                body: 'Grades and prestige do not dictate a person\'s worth. Keep the pressure in perspective.',
                author: 'lecomton',
                authorId: 'u_lecomton',
                subreddit: 'teenagers',
                subredditIcon,
                permalink: `https://reddit.com/r/teenagers/comments/${postId}/comment1`,
                createdAt: Date.now() - 2 * 60 * 60 * 1000,
                reportReasons: [],
                numReports: 0,
                score: 10,
                postId,
              },
              {
                id: 't1_feed_comment_2',
                type: 'comment',
                title: 'Second comment about the opened feed post',
                body: 'That sounds stressful. Take a breath before you decide what conversation needs to happen next.',
                author: 'SabreLily',
                authorId: 'u_sabrelily',
                subreddit: 'teenagers',
                subredditIcon,
                permalink: `https://reddit.com/r/teenagers/comments/${postId}/comment2`,
                createdAt: Date.now() - 65 * 60 * 1000,
                reportReasons: [],
                numReports: 0,
                score: 6,
                postId,
              },
              {
                id: 't1_feed_comment_3',
                type: 'comment',
                title: 'Reported comment about the opened feed post',
                body: 'Preview comment selected for moderator review from the feed thread detail.',
                author: 'thread_watchlist',
                authorId: 'u_thread_watchlist',
                subreddit: 'teenagers',
                subredditIcon,
                permalink: `https://reddit.com/r/teenagers/comments/${postId}/comment3`,
                createdAt: Date.now() - 35 * 60 * 1000,
                reportReasons: ['Rule 1'],
                numReports: 1,
                score: -2,
                postId,
              },
            ].filter((comment) => !removedIds.has(comment.id)),
          });
          return;
        }
        if (url.startsWith('/feed')) {
          const sort = new URL(req.url ?? '/', 'http://localhost').searchParams.get('sort') ?? 'hot';
          const feedItems: QueueItem[] = [
            {
              id: 't3_feed_1',
              type: 'post',
              title: 'The cafeteria started serving decent food and nobody is talking about it',
              body: 'Like genuinely good. Actual seasoning. I had pasta today and it tasted like pasta.',
              author: 'lunchroom_prophet',
              authorId: 'u_lunchroom_prophet',
              subreddit: 'teenagers',
              subredditIcon,
              permalink: 'https://reddit.com/r/teenagers/comments/feed1',
              createdAt: Date.now() - 28 * 60 * 1000,
              reportReasons: [],
              numReports: 0,
              score: sort === 'top' ? 14200 : sort === 'hot' ? 3840 : 12,
              numComments: 412,
              flairText: 'Discussion',
              url: 'https://reddit.com/r/teenagers/comments/feed1',
              domain: 'reddit.com',
            },
            {
              id: 't3_feed_2',
              type: 'post',
              title: 'my dog learned to open doors and now nothing is safe',
              body: 'He figured out the lever handles. He just lets himself into every room. We put a round knob on the pantry. He sat in front of it for 20 minutes problem-solving.',
              author: 'doorless_in_ohio',
              authorId: 'u_doorless_in_ohio',
              subreddit: 'teenagers',
              subredditIcon,
              permalink: 'https://reddit.com/r/teenagers/comments/feed2',
              createdAt: Date.now() - 2 * 60 * 60 * 1000,
              reportReasons: [],
              numReports: 0,
              score: sort === 'top' ? 29400 : sort === 'hot' ? 8100 : 44,
              numComments: 881,
              previewUrl: previewImage,
              thumbnail: previewImage,
              url: 'https://reddit.com/r/teenagers/comments/feed2',
              domain: 'reddit.com',
            },
            {
              id: 't3_feed_3',
              type: 'post',
              title: 'PSA: you can forward your school email to gmail so you stop missing things',
              body: "Settings → Forwarding → Add a forwarding address. Took me until junior year to figure this out and I missed like six important emails.",
              author: 'inbox_actually_clean',
              authorId: 'u_inbox_actually_clean',
              subreddit: 'teenagers',
              subredditIcon,
              permalink: 'https://reddit.com/r/teenagers/comments/feed3',
              createdAt: Date.now() - 5 * 60 * 60 * 1000,
              reportReasons: [],
              numReports: 0,
              score: sort === 'top' ? 18700 : sort === 'hot' ? 5200 : 67,
              numComments: 294,
              flairText: 'Advice',
              url: 'https://reddit.com/r/teenagers/comments/feed3',
              domain: 'reddit.com',
            },
            {
              id: 't3_feed_4',
              type: 'post',
              title: 'What\'s something you genuinely like about your school?',
              body: 'Looking for optimism today. No wrong answers.',
              author: 'optimist_attempt_4',
              authorId: 'u_optimist_attempt_4',
              subreddit: 'teenagers',
              subredditIcon,
              permalink: 'https://reddit.com/r/teenagers/comments/feed4',
              createdAt: Date.now() - 9 * 60 * 60 * 1000,
              reportReasons: [],
              numReports: 0,
              score: sort === 'top' ? 6100 : sort === 'hot' ? 2200 : 8,
              numComments: 1042,
              flairText: 'Discussion',
              url: 'https://reddit.com/r/teenagers/comments/feed4',
              domain: 'reddit.com',
            },
            {
              id: 't3_feed_5',
              type: 'post',
              title: 'I got into my first choice college',
              body: "Four years of telling myself I wasn't good enough. Read the email three times. Still not sure it's real.",
              author: 'still_refreshing_portal',
              authorId: 'u_still_refreshing_portal',
              subreddit: 'teenagers',
              subredditIcon,
              permalink: 'https://reddit.com/r/teenagers/comments/feed5',
              createdAt: Date.now() - 14 * 60 * 60 * 1000,
              reportReasons: [],
              numReports: 0,
              score: sort === 'top' ? 47200 : sort === 'hot' ? 11300 : 201,
              numComments: 2104,
              flairText: 'Achievement',
              url: 'https://reddit.com/r/teenagers/comments/feed5',
              domain: 'reddit.com',
            },
            {
              id: 't3_feed_6',
              type: 'post',
              title: 'Study tip that actually works: set a timer for 25 min and do nothing else',
              body: "Pomodoro technique. Been doing it for three weeks. Went from barely finishing homework to finishing with time left. The key is you actually have to do nothing else during the 25 min.",
              author: 'finally_productive',
              authorId: 'u_finally_productive',
              subreddit: 'teenagers',
              subredditIcon,
              permalink: 'https://reddit.com/r/teenagers/comments/feed6',
              createdAt: Date.now() - 22 * 60 * 60 * 1000,
              reportReasons: [],
              numReports: 0,
              score: sort === 'top' ? 9800 : sort === 'hot' ? 1800 : 5,
              numComments: 318,
              flairText: 'Advice',
              url: 'https://reddit.com/r/teenagers/comments/feed6',
              domain: 'reddit.com',
            },
            {
              id: 't3_feed_7',
              type: 'post',
              title: 'Anyone else\'s parents completely clueless about AI?',
              body: 'My dad asked me to explain ChatGPT yesterday and now he wants me to show him how to use it for his work emails and I deeply regret opening that door.',
              author: 'tech_support_for_dad',
              authorId: 'u_tech_support_for_dad',
              subreddit: 'teenagers',
              subredditIcon,
              permalink: 'https://reddit.com/r/teenagers/comments/feed7',
              createdAt: Date.now() - 31 * 60 * 60 * 1000,
              reportReasons: [],
              numReports: 0,
              score: sort === 'top' ? 22100 : sort === 'hot' ? 4400 : 88,
              numComments: 671,
              flairText: 'Discussion',
              url: 'https://reddit.com/r/teenagers/comments/feed7',
              domain: 'reddit.com',
            },
            {
              id: 't3_feed_8',
              type: 'post',
              title: 'Hot take: homework on weekends should be illegal',
              body: '',
              author: 'weekend_rights_activist',
              authorId: 'u_weekend_rights_activist',
              subreddit: 'teenagers',
              subredditIcon,
              permalink: 'https://reddit.com/r/teenagers/comments/feed8',
              createdAt: Date.now() - 2 * 86400 * 1000,
              reportReasons: [],
              numReports: 0,
              score: sort === 'top' ? 31000 : sort === 'hot' ? 700 : 3,
              numComments: 1893,
              flairText: 'Rant',
              url: 'https://reddit.com/r/teenagers/comments/feed8',
              domain: 'reddit.com',
              locked: sort === 'top',
            },
          ];
          json(res, { items: feedItems, after: null });
          return;
        }
        if (url.startsWith('/queue')) {
          const visible = queueItems.filter((item) => !removedIds.has(item.id)).map(mergeItem);
          const byId = new Map(visible.map((item) => [item.id, item]));
          const enriched = visible.map((item) => {
            if (item.type !== 'comment') return item;
            const contextComments = buildContextComments(item, byId);
            return contextComments.length ? { ...item, contextComments } : item;
          });
          json(res, {
            items: enriched,
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
            {
              id: 'user_post_3',
              type: 'post',
              title: 'Photo dump from the last week',
              body: 'A small album with friends cropped out for privacy.',
              subreddit: 'teenagers',
              permalink: 'https://reddit.com/r/teenagers/comments/user_post_3',
              createdAt: Date.now() - 4 * 86_400_000,
            },
            {
              id: 'user_post_4',
              type: 'post',
              title: 'Can someone explain why my post was filtered?',
              body: 'I read the rules and am not sure which keyword triggered automod.',
              subreddit: 'teenagers',
              permalink: 'https://reddit.com/r/teenagers/comments/user_post_4',
              createdAt: Date.now() - 9 * 86_400_000,
            },
            {
              id: 'user_post_5',
              type: 'post',
              title: 'Study playlist recommendations',
              body: 'Looking for calm music that is not too distracting.',
              subreddit: 'teenagers',
              permalink: 'https://reddit.com/r/teenagers/comments/user_post_5',
              createdAt: Date.now() - 18 * 86_400_000,
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
            {
              id: 'user_comment_3',
              type: 'comment',
              title: 'Comment in homework thread',
              body: 'Try breaking the problem into the parts your teacher highlighted first.',
              subreddit: 'teenagers',
              permalink: 'https://reddit.com/r/teenagers/comments/user_comment_3',
              createdAt: Date.now() - 7 * 86_400_000,
            },
            {
              id: 'user_comment_4',
              type: 'comment',
              title: 'Comment in vent thread',
              body: 'That sounds rough, but posting screenshots with names visible will make it worse.',
              subreddit: 'teenagers',
              permalink: 'https://reddit.com/r/teenagers/comments/user_comment_4',
              createdAt: Date.now() - 13 * 86_400_000,
            },
            {
              id: 'user_comment_5',
              type: 'comment',
              title: 'Comment in music recommendation thread',
              body: 'The album has a clean version if you need something you can play around family.',
              subreddit: 'teenagers',
              permalink: 'https://reddit.com/r/teenagers/comments/user_comment_5',
              createdAt: Date.now() - 21 * 86_400_000,
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
              {
                id: 'note_2',
                note: 'Good faith appeal in modmail; explain removals clearly.',
                moderator: 'mod_beta',
                createdAt: Date.now() - 11 * 86_400_000,
                label: 'HELPFUL_USER',
              },
              {
                id: 'note_3',
                note: 'Watch for repeated links to personal storefront.',
                moderator: 'mod_delta',
                createdAt: Date.now() - 29 * 86_400_000,
                label: 'ABUSE_WARNING',
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
              {
                id: 'modlog_3',
                action: 'lock',
                moderator: 'mod_gamma',
                targetId: 't3_user_post_3',
                details: 'Locked after off-topic pile-on',
                createdAt: Date.now() - 17 * 86_400_000,
              },
              {
                id: 'modlog_4',
                action: 'removelink',
                moderator: 'mod_delta',
                targetId: 't3_user_post_4',
                details: 'Filtered by automod keyword rule',
                createdAt: Date.now() - 29 * 86_400_000,
              },
              {
                id: 'modlog_5',
                action: 'banuser',
                moderator: 'mod_alpha',
                targetId: username,
                details: 'Temporary 1 day ban, later expired',
                createdAt: Date.now() - 72 * 86_400_000,
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
              {
                id: 't3_auto_3',
                type: 'post',
                title: 'Referral code megathread bypass attempt',
                author: 'coupon_chaser',
                reason: 'Referral code',
                removedAt: Date.now() - 2 * 60 * 60 * 1000,
                permalink: 'https://reddit.com/r/modqueue/comments/auto3',
              },
              {
                id: 't1_auto_4',
                type: 'comment',
                title: 'Comment from account under age threshold',
                author: 'fresh_alt_19',
                reason: 'Account age',
                removedAt: Date.now() - 5 * 60 * 60 * 1000,
                permalink: 'https://reddit.com/r/modqueue/comments/auto4',
              },
              {
                id: 't3_auto_5',
                type: 'post',
                title: 'Title contains blocked slur pattern',
                author: 'edgy_throwaway',
                reason: 'Blocked keyword',
                removedAt: Date.now() - 19 * 60 * 60 * 1000,
                permalink: 'https://reddit.com/r/modqueue/comments/auto5',
              },
              {
                id: 't1_auto_6',
                type: 'comment',
                title: 'Repeated short comments in several threads',
                author: 'copy_paste_reply',
                reason: 'Flood control',
                removedAt: Date.now() - 31 * 60 * 60 * 1000,
                permalink: 'https://reddit.com/r/modqueue/comments/auto6',
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
              const payload = (body ?? {}) as {
                ids?: string[];
                level?: (typeof crowdLevels)[number];
                batchId?: string;
              };
              const ids = payload.ids ?? [];

              if (url.startsWith('/remove')) {
                for (const id of ids) removedIds.add(id);
                const batchId =
                  typeof payload.batchId === 'string' && payload.batchId.length > 0
                    ? payload.batchId
                    : crypto.randomUUID();
                undoBatches.set(batchId, ids);
                json(res, { batchId, ok: ids.length, failed: 0 });
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
          void readJsonBody(req)
            .then((body) => {
              const batchId = typeof (body as { batchId?: string })?.batchId === 'string' ? (body as { batchId: string }).batchId : '';
              const ids = undoBatches.get(batchId) ?? [];
              for (const id of ids) removedIds.delete(id);
              undoBatches.delete(batchId);
              json(res, { restored: ids.length, failed: 0 });
            })
            .catch(() => {
              res.statusCode = 400;
              json(res, { error: 'Invalid JSON body' });
            });
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
