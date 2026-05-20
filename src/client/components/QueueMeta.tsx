import type { QueueItem } from '../../shared';

type Props = {
  item: QueueItem;
};

function reportCount(item: QueueItem): number {
  return Math.max(item.numReports, item.reportReasons.length);
}

function uniqueReasons(reasons: string[]): string[] {
  return [...new Set(reasons.map((reason) => reason.trim()).filter(Boolean))];
}

export function QueueMeta({ item }: Props) {
  const reasons = uniqueReasons(item.reportReasons);
  const count = reportCount(item);
  const hasReports = count > 0;
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

  if (!hasReports && !status.length) return null;

  return (
    <div className="queue-meta" aria-label="Moderation metadata">
      {hasReports ? (
        <div className="queue-meta-reports">
          <span className="queue-report-indicator" aria-hidden="true" />
          <span className="queue-report-summary">
            {count} {count === 1 ? 'report' : 'reports'}
          </span>
          {reasons.length ? (
            <span className="queue-report-reasons">
              {reasons.map((reason) => (
                <span key={reason} className="queue-report-reason">
                  {reason}
                </span>
              ))}
            </span>
          ) : null}
        </div>
      ) : null}
      {status.length ? (
        <div className="queue-meta-status">
          {status.map((entry) => (
            <span key={entry.key} className="queue-status-tag">
              {entry.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
