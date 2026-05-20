import type { QueueItem } from '../../shared';

type Props = {
  item: QueueItem;
};

export function QueueMeta({ item }: Props) {
  const status: Array<{ key: string; label: string }> = [];

  if (item.locked) status.push({ key: 'locked', label: 'Locked' });
  if (item.nsfw) status.push({ key: 'nsfw', label: 'NSFW' });
  if (item.spoiler) status.push({ key: 'spoiler', label: 'Spoiler' });
  if (item.stickied) status.push({ key: 'sticky', label: 'Pinned' });
  if (item.distinguished) status.push({ key: 'dist', label: 'Distinguished' });
  if (item.ignoringReports) status.push({ key: 'ignore', label: 'Reports ignored' });
  if (item.crowdControlLevel && item.crowdControlLevel !== 'OFF') {
    status.push({ key: 'cc', label: `Crowd ${item.crowdControlLevel.toLowerCase()}` });
  }

  if (!status.length) return null;

  return (
    <div className="queue-meta" aria-label="Moderation metadata">
      <div className="queue-meta-status">
        {status.map((entry) => (
          <span key={entry.key} className="queue-status-tag">
            {entry.label}
          </span>
        ))}
      </div>
    </div>
  );
}
