import { useRef, type MouseEvent } from 'react';
import { ArrowBigDown, ArrowBigUp, MessageCircle } from 'lucide-react';
import type { QueueItem } from '../../shared';
import { compactNumber, feedAge, subredditInitials } from '../feedUtils';
import type { ModItemHandlers } from '../modActions';
import { ModActions } from './ModActions';
import { QueueMeta } from './QueueMeta';

type Props = {
  item: QueueItem;
  modHandlers?: ModItemHandlers;
  menuOpen?: boolean;
  onMenuOpenChange?: (open: boolean) => void;
  onStop?: (event: MouseEvent) => void;
};

export function FeedComment({ item, modHandlers, menuOpen = false, onMenuOpenChange, onStop }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const showModActions = Boolean(modHandlers && onMenuOpenChange);

  return (
    <article ref={hostRef} className={`feed-comment${showModActions ? ' feed-comment-with-mod' : ''}`}>
      <div className="feed-comment-thread-line" aria-hidden="true" />
      <div className="feed-comment-body">
        <header className="feed-comment-header">
          <div className="comment-avatar">{subredditInitials(item.author)}</div>
          <div className="feed-comment-meta">
            <strong>u/{item.author}</strong>
            <span>{feedAge(item.createdAt)} ago</span>
          </div>
        </header>

        <QueueMeta item={item} />

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
      </div>
    </article>
  );
}
