export type QueueKind = 'post' | 'comment';

export type CrowdControlLevel = 'OFF' | 'LENIENT' | 'MEDIUM' | 'STRICT';

export type ParentPostContext = {
  id: string;
  title: string;
  permalink: string;
  subreddit: string;
  author?: string;
  createdAt?: number;
  body?: string;
  score?: number;
  numComments?: number;
  thumbnail?: string;
  previewUrl?: string;
  url?: string;
  domain?: string;
  subredditIcon?: string;
};

export type QueueItem = {
  id: string;
  type: QueueKind;
  title: string;
  body: string;
  author: string;
  authorId: string;
  subreddit: string;
  permalink: string;
  createdAt: number;
  reportReasons: string[];
  numReports: number;
  score?: number;
  numComments?: number;
  flairText?: string;
  thumbnail?: string;
  previewUrl?: string;
  url?: string;
  domain?: string;
  subredditIcon?: string;
  postId?: string;
  parentPostTitle?: string;
  parentPostPermalink?: string;
  parentPost?: ParentPostContext;
  locked?: boolean;
  nsfw?: boolean;
  spoiler?: boolean;
  stickied?: boolean;
  crowdControlLevel?: CrowdControlLevel;
  distinguished?: boolean;
  ignoringReports?: boolean;
};

export type QueueFilter = 'all' | 'posts' | 'comments' | 'reported';

export type FeedSort = 'hot' | 'new' | 'top';

export type KeyAction =
  | 'approve'
  | 'ban'
  | 'lock'
  | 'flair'
  | 'note'
  | 'user'
  | 'next'
  | 'prev'
  | 'select'
  | 'undo'
  | 'help'
  | 'spam'
  | 'view'
  | 'nsfw'
  | 'spoiler'
  | 'sticky'
  | 'distinguish'
  | 'ignoreReports'
  | 'refresh'
  | 'selectAll'
  | 'mute';

export type Keymap = Record<KeyAction, string>;

export type RemovalReason = {
  index: number;
  text: string;
  flairId: string;
};

export type SubredditRule = {
  id: string;
  removalReasonId?: string;
  shortName: string;
  description: string;
  kind: 'all' | 'link' | 'comment';
  violationReason: string;
  priority: number;
};

export type BanReason = {
  index: number;
  reason: string;
  message: string;
  note: string;
  duration: number;
};

export type AppSettings = {
  keymap: Keymap;
  removalReasons: RemovalReason[];
  banReasons: BanReason[];
  conflicts: Array<{ key: string; actions: string[] }>;
};

export type ModNoteEntry = {
  id: string;
  note: string;
  moderator: string;
  createdAt: number;
  label?: string;
};

export type UserInfo = {
  username: string;
  accountAgeDays: number;
  combinedKarma: number;
  recentInSub: number;
  priorRemovals: number;
  recentActivity: UserActivityItem[];
  recentPosts: UserActivityItem[];
  recentComments: UserActivityItem[];
  modLog: UserModLogEntry[];
  modNotes: ModNoteEntry[];
};

export type UserActivityItem = {
  id: string;
  type: QueueKind;
  title: string;
  body: string;
  subreddit: string;
  permalink: string;
  createdAt: number;
};

export type UserModLogEntry = {
  id: string;
  action: string;
  moderator: string;
  targetId: string;
  details: string;
  createdAt: number;
};

export type Toast = {
  id: string;
  kind: 'info' | 'warning' | 'error' | 'success';
  message: string;
  persistent?: boolean;
};

export type NotificationCounts = {
  modqueue: number;
  modmail: number;
  messages: number;
  unmoderated: number;
};

export type ModLogMatrix = {
  rows: Array<{
    action: string;
    today: number;
    sevenDays: number;
    thirtyDays: number;
  }>;
};

export type AutomodFilterEvent = {
  id: string;
  type: QueueKind;
  title: string;
  author: string;
  reason: string;
  removedAt: number;
  permalink: string;
};

export type AutomodPanelData = {
  status: 'available' | 'unavailable';
  config: string;
  revisionId?: string;
  recentFilters: AutomodFilterEvent[];
};

export type AutomodValidation = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};
