import type { QueueItem } from '../shared';

export function reportCount(item: QueueItem): number {
  return Math.max(item.numReports, item.reportReasons.length);
}

export function uniqueReportReasons(reasons: string[]): string[] {
  return [...new Set(reasons.map((reason) => reason.trim()).filter(Boolean))];
}
