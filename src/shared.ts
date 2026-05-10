export type QueueKind = 'post' | 'comment';

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
};

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
  | 'help';

export type Keymap = Record<KeyAction, string>;

export type RemovalReason = {
  index: number;
  text: string;
  flairId: string;
};

export type AppSettings = {
  keymap: Keymap;
  removalReasons: RemovalReason[];
  conflicts: Array<{ key: string; actions: string[] }>;
};

export type UserInfo = {
  username: string;
  accountAgeDays: number;
  combinedKarma: number;
  recentInSub: number;
  priorRemovals: number;
  recentActivity: Array<{ id: string; title: string; permalink: string; createdAt: number }>;
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
