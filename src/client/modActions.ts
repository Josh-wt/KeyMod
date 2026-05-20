import type { CrowdControlLevel, QueueItem } from '../shared';

export type ModMenuAction =
  | 'view'
  | 'spam'
  | 'highlight'
  | 'lock'
  | 'flair'
  | 'nsfw'
  | 'spoiler'
  | 'crowdControl'
  | 'ban'
  | 'note'
  | 'user';

export type ModActionUpdate = {
  id: string;
  locked?: boolean;
  nsfw?: boolean;
  spoiler?: boolean;
  stickied?: boolean;
  crowdControlLevel?: CrowdControlLevel;
};

export type ModActionResult = {
  ok: number;
  failed: number;
  updates?: ModActionUpdate[];
  errors?: string[];
};

export type ModItemHandlers = {
  approve: (item: QueueItem) => void | Promise<void>;
  remove: (item: QueueItem) => void | Promise<void>;
  menu: (item: QueueItem, action: ModMenuAction) => void | Promise<void>;
};
