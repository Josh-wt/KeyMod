import type { QueueItem } from '../../shared';

type Props = {
  item: QueueItem;
};

export function QueueMeta({ item }: Props) {
  const status: Array<{ key: string; label: string; tone?: 'warn' | 'mod' | 'neutral' }> = [];

  if (item.numReports > 0 || item.reportReasons.length) {
    status.push({ key: 'reports', label: `${item.numReports || item.reportReasons.length} report(s)`, tone: 'warn' });
  }
  if (item.locked) status.push({ key: 'locked', label: 'Locked', tone: 'mod' });
  if (item.nsfw) status.push({ key: 'nsfw', label: 'NSFW', tone: 'warn' });
  if (item.spoiler) status.push({ key: 'spoiler', label: 'Spoiler', tone: 'warn' });
  if (item.stickied) status.push({ key: 'sticky', label: 'Highlighted', tone: 'mod' });
  if (item.distinguished) status.push({ key: 'dist', label: 'Distinguished', tone: 'mod' });
  if (item.ignoringReports) status.push({ key: 'ignore', label: 'Reports ignored', tone: 'neutral' });
  if (item.crowdControlLevel && item.crowdControlLevel !== 'OFF') {
    status.push({ key: 'cc', label: `Crowd ${item.crowdControlLevel}`, tone: 'neutral' });
  }

  if (!status.length && !item.reportReasons.length) return null;

  return (
    <div className="queue-meta">
      {item.reportReasons.map((reason) => (
        <span key={reason} className="queue-report-chip">
          {reason}
        </span>
      ))}
      {status.map((entry) => (
        <span key={entry.key} className={`queue-status-chip${entry.tone ? ` tone-${entry.tone}` : ''}`}>
          {entry.label}
        </span>
      ))}
    </div>
  );
}
