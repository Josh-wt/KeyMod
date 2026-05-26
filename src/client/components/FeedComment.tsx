import { useRef, type MouseEvent } from 'react';
import { ArrowBigDown, ArrowBigUp } from 'lucide-react';
import type { QueueItem } from '../../shared';
import { compactNumber, feedAge, subredditInitials } from '../feedUtils';
import type { ModItemHandlers } from '../modActions';
import { reportCount } from '../queueReports';
import { ModActions } from './ModActions';
import { QueueMeta } from './QueueMeta';
import { QueueReportTags } from './QueueReportTags';

type Props = {
  item: QueueItem;
  highlighted?: boolean;
  /** This row is the reported mod-queue item (show REPORTED badge). */
  isQueueTarget?: boolean;
  showReportTags?: boolean;
  modHandlers?: ModItemHandlers;
  menuOpen?: boolean;
  onMenuOpenChange?: (open: boolean) => void;
  onStop?: (event: MouseEvent) => void;
};

export function FeedComment({
  item,
  highlighted = false,
  isQueueTarget = false,
  showReportTags = true,
  modHandlers,
  menuOpen = false,
  onMenuOpenChange,
  onStop,
}: Props) {
  const hostRef = useRef<HTMLElement>(null);
  const showModActions = Boolean(modHandlers && onMenuOpenChange);
  const hasReports = reportCount(item) > 0;
  const showTags = showReportTags && hasReports;

  return (
    <article
      ref={hostRef}
      className={`feed-comment-card${hasReports || isQueueTarget ? ' feed-comment-reported' : ''}${showModActions ? ' feed-comment-with-mod' : ''}${highlighted ? ' feed-comment-highlighted' : ''}${isQueueTarget ? ' feed-comment-queue-target' : ''}`}
    >
      {showTags ? (
        <QueueReportTags item={item} variant="inline" showReportedLabel={isQueueTarget && hasReports} />
      ) : null}
      <header className="feed-comment-header">
        <div className="comment-avatar">{subredditInitials(item.author)}</div>
        <div className="feed-comment-meta">
          <strong>u/{item.author}</strong>
          <span>{feedAge(item.createdAt)} ago</span>
          <QueueMeta item={item} />
        </div>
      </header>

      <p className="feed-comment-text">{item.body || item.title}</p>

      <footer className="feed-comment-actions">
        <span className="vote-pill vote-pill-compact">
          <ArrowBigUp size={16} />
          {compactNumber(item.score)}
          <ArrowBigDown size={16} />
        </span>
        {showModActions ? (
          <ModActions
            item={item}
            menuOpen={menuOpen}
            onMenuOpenChange={onMenuOpenChange!}
            handlers={modHandlers!}
            hostRef={hostRef}
            onStop={onStop}
          />
        ) : null}
      </footer>
    </article>
  );
}
