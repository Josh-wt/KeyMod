import type { QueueItem } from '../../shared';
import { reportCount, uniqueReportReasons } from '../queueReports';

type Props = {
  item: QueueItem;
};

export function QueueReportTags({ item }: Props) {
  const reasons = uniqueReportReasons(item.reportReasons);
  const count = reportCount(item);
  if (count === 0) return null;

  const tags = reasons.length ? reasons : [`${count} ${count === 1 ? 'report' : 'reports'}`];

  return (
    <div className="queue-report-tags" role="group" aria-label={`${count} ${count === 1 ? 'report' : 'reports'}`}>
      {tags.map((label) => (
        <span key={label} className="queue-report-tag">
          {label}
        </span>
      ))}
    </div>
  );
}
