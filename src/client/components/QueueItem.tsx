import { memo, type MouseEvent } from 'react';
import { Check } from 'lucide-react';
import type { QueueItem as QueueItemType } from '../../shared';
import type { ModItemHandlers } from '../modActions';
import { reportCount } from '../queueReports';
import { FeedComment } from './FeedComment';
import { FeedPostCard, feedPostFromItem, feedPostFromParent } from './FeedPostCard';
import { QueueReportTags } from './QueueReportTags';

type Props = {
  item: QueueItemType;
  index: number;
  focused: boolean;
  selected: boolean;
  dragPreviewed: boolean;
  modHandlers: ModItemHandlers;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onToggle: (id: string) => void;
  onFocusIndex: (index: number) => void;
  onDragStart: (index: number) => void;
  onDragUpdate: (index: number) => void;
};

function stop(event: MouseEvent) {
  event.stopPropagation();
}

export const QueueItem = memo(function QueueItem({
  item,
  index,
  focused,
  selected,
  dragPreviewed,
  modHandlers,
  menuOpen,
  onMenuOpenChange,
  onToggle,
  onFocusIndex,
  onDragStart,
  onDragUpdate,
}: Props) {
  const isComment = item.type === 'comment';
  const parentPost = item.parentPost;
  const hasReports = reportCount(item) > 0;
  const showPostReports = !isComment && hasReports;

  return (
    <article
      className={`queue-row${showPostReports ? ' queue-row-reported' : ''}${focused ? ' focused' : ''}${selected ? ' selected' : ''}${dragPreviewed ? ' drag-previewed' : ''}${isComment ? ' queue-row-comment' : ''}`}
      data-queue-id={item.id}
      onMouseDown={(event) => {
        if ((event.target as Element).closest('[data-mod-trigger], .check-button, .mod-actions-menu-portal')) return;
        onDragStart(index);
      }}
      onMouseEnter={() => onFocusIndex(index)}
      onMouseOver={() => onDragUpdate(index)}
    >
      {showPostReports ? <QueueReportTags item={item} /> : null}
      <button
        className={`check-button${selected || dragPreviewed ? ' checked' : ''}${dragPreviewed && !selected ? ' preview' : ''}`}
        aria-label={selected ? 'Deselect item' : 'Select item'}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onToggle(item.id);
        }}
      >
        {selected || dragPreviewed ? <Check size={14} /> : null}
      </button>

      {isComment ? (
        <div className={`comment-queue-stack${parentPost ? ' comment-queue-stack-threaded' : ''}`}>
          {parentPost ? (
            <div className="comment-thread-parent">
              <div className="comment-thread-gutter" aria-hidden="true" />
              <div className="crosspost-shell">
                <span className="crosspost-label">Comment in thread</span>
                <FeedPostCard post={feedPostFromParent(parentPost)} variant="embedded" onStop={stop} />
              </div>
            </div>
          ) : null}
          <div className="comment-thread-reply">
            {parentPost ? <div className="comment-thread-gutter" aria-hidden="true" /> : null}
            <FeedComment
              item={item}
              modHandlers={modHandlers}
              menuOpen={menuOpen}
              onMenuOpenChange={onMenuOpenChange}
              onStop={stop}
            />
          </div>
        </div>
      ) : (
        <FeedPostCard
          post={feedPostFromItem(item)}
          item={item}
          modHandlers={modHandlers}
          menuOpen={menuOpen}
          onMenuOpenChange={onMenuOpenChange}
          onStop={stop}
        />
      )}
    </article>
  );
});
