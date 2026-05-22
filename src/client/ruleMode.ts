import type { RemovalReason, SubredditRule } from '../shared';

function normalizeLabel(value: string) {
  return value.trim().toLowerCase();
}

export function resolveRemovalReasonIndex(rule: SubredditRule, removalReasons: RemovalReason[]): number {
  const labels = [rule.shortName, rule.violationReason].map(normalizeLabel).filter(Boolean);

  for (const reason of removalReasons) {
    const text = normalizeLabel(reason.text);
    if (!text) continue;
    if (labels.some((label) => label.includes(text) || text.includes(label))) {
      return reason.index;
    }
  }

  const configured = removalReasons.filter((reason) => reason.text.trim());
  if (configured.length) {
    const slot = Math.min(Math.max(rule.priority, 0), configured.length - 1);
    return configured[slot]?.index ?? configured[0].index;
  }

  return Math.min(Math.max(rule.priority, 0) + 1, 9);
}
