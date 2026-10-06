import type { ModMenuAction } from './modActions';
import type { QueueItem } from '../shared';

export type ModMenuEntry = {
  id: ModMenuAction;
  icon: 'default' | 'nsfw' | 'user' | 'ban' | 'note' | 'view';
  postOnly?: boolean;
  label: (item: QueueItem) => string;
};

export const modMenuEntries: ModMenuEntry[] = [
  { id: 'view', icon: 'view', label: () => 'View on Reddit' },
  { id: 'spam', icon: 'default', label: () => 'Mark as spam' },
  {
    id: 'highlight',
    icon: 'default',
    postOnly: true,
    label: (item) => (item.stickied ? 'Remove from highlights' : 'Add to highlights'),
  },
  {
    id: 'lock',
    icon: 'default',
    label: (item) => (item.locked ? 'Unlock comments' : 'Lock comments'),
  },
  { id: 'flair', icon: 'default', postOnly: true, label: () => 'Edit post flair' },
  {
    id: 'nsfw',
    icon: 'nsfw',
    postOnly: true,
    label: (item) => (item.nsfw ? 'Remove NSFW tag' : 'Add NSFW tag'),
  },
  {
    id: 'spoiler',
    icon: 'default',
    postOnly: true,
    label: (item) => (item.spoiler ? 'Remove spoiler tag' : 'Add spoiler tag'),
  },
  {
    id: 'crowdControl',
    icon: 'default',
    postOnly: true,
    label: (item) => `Adjust crowd control (${item.crowdControlLevel ?? 'OFF'})`,
  },
  {
    id: 'ignoreReports',
    icon: 'default',
    label: (item) => (item.ignoringReports ? 'Unignore reports' : 'Ignore reports'),
  },
  { id: 'user', icon: 'user', label: (item) => `View u/${item.author}` },
  { id: 'note', icon: 'note', label: () => 'Add mod note' },
  { id: 'ban', icon: 'ban', label: (item) => `Ban u/${item.author}` },
];

export function visibleModMenuEntries(item: QueueItem): ModMenuEntry[] {
  const hasAuthor = Boolean(item.author && !['[deleted]', '[removed]', 'AutoModerator'].includes(item.author));
  return modMenuEntries.filter((entry) => {
    if (entry.postOnly && item.type !== 'post') return false;
    if (entry.id === 'ignoreReports' && !item.numReports && !item.reportReasons.length && !item.ignoringReports) return false;
    if (['ban', 'note', 'user'].includes(entry.id) && !hasAuthor) return false;
    return true;
  });
}
