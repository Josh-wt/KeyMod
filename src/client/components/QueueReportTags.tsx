import type { QueueItem } from '../../shared';
import { reportCount, uniqueReportReasons } from '../queueReports';

type Props = {
  item: QueueItem;
  /** Prominent label on the mod-queue target comment in a thread. */
  showReportedLabel?: boolean;
  /** `floating` for posts; `inline` for comments inside cards. */
  variant?: 'floating' | 'inline';
};

export function QueueReportTags({ item, showReportedLabel = false, variant = 'floating' }: Props) {
  const reasons = uniqueReportReasons(item.reportReasons);
  const count = reportCount(item);
  if (count === 0 && !showReportedLabel) return null;

  const tags = reasons.length
    ? reasons.map((reason) => `Report: ${reason}`)
    : count > 0
      ? [`Report: ${count} ${count === 1 ? 'report' : 'reports'}`]
      : [];

  return (
    <div
      className={`queue-report-tags${variant === 'inline' ? ' queue-report-tags-inline' : ''}`}
      role="group"
      aria-label={showReportedLabel ? 'Reported comment' : `${count} ${count === 1 ? 'report' : 'reports'}`}
    >
      {showReportedLabel ? (
        <span className="queue-report-tag queue-report-tag-reported">Reported</span>
      ) : null}
      {tags.map((label) => (
        <span key={label} className="queue-report-tag">
          {label}
        </span>
      ))}
    </div>
  );
}
