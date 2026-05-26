import { memo, type MouseEvent } from 'react';
import { Check } from 'lucide-react';
import type { QueueItem as QueueItemType } from '../../shared';
import type { ModItemHandlers } from '../modActions';
import { reportCount } from '../queueReports';
import { FeedComment } from './FeedComment';
import { FeedPostCard, feedPostFromItem, feedPostFromParent, queueItemFromParentPost } from './FeedPostCard';
import { QueueReportTags } from './QueueReportTags';

type Props = {
  item: QueueItemType;
  index: number;
  previousItem?: QueueItemType;
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
  onFocusLeave: () => void;
  onOpenComments?: (item: QueueItemType) => void;
  expandPost?: boolean;
  isQueueView?: boolean;
  openContextMenuId?: string | null;
  onContextMenuOpenChange?: (id: string | null) => void;
};

function previousItemIsParentThread(previous: QueueItemType | undefined, comment: QueueItemType) {
  if (!previous || previous.type !== 'post' || comment.type !== 'comment') return false;
  const parentPostId = comment.postId ?? comment.parentPost?.id;
  return Boolean(parentPostId && previous.id === parentPostId);
}

function stop(event: MouseEvent) {
  event.stopPropagation();
}

export const QueueItem = memo(function QueueItem({
  item,
  index,
  previousItem,
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
  onFocusLeave,
  onOpenComments,
  expandPost = false,
  isQueueView = false,
  openContextMenuId,
  onContextMenuOpenChange,
}: Props) {
  const isComment = item.type === 'comment';
  const parentPost = item.parentPost;
  const continuesParentThreadAbove = previousItemIsParentThread(previousItem, item);
  const hasReports = reportCount(item) > 0;
  const showRowReports = isQueueView && hasReports;
  const showPostReports = !isComment && hasReports;
  const highlightReportedComment = isQueueView && isComment && hasReports;
  const contextComments = item.contextComments;
  const showCommentChain = isQueueView && isComment && contextComments && contextComments.length > 0;
  const parentPostItem = parentPost ? queueItemFromParentPost(parentPost, item) : null;
  const parentPostMenuOpen = Boolean(parentPostItem && openContextMenuId === parentPostItem.id);

  return (
    <article
      className={`queue-row${showRowReports ? ' queue-row-reported' : ''}${focused ? ' focused' : ''}${selected ? ' selected' : ''}${dragPreviewed ? ' drag-previewed' : ''}${isComment ? ' queue-row-comment' : ''}${showCommentChain ? ' queue-row-comment-expanded' : ''}`}
      data-queue-id={item.id}
      onMouseDown={(event) => {
        if (
          (event.target as Element).closest(
            '[data-mod-trigger], .check-button, .mod-actions-menu-portal, .context-comment-card, .comment-expanded-parent, .comment-thread-parent',
          )
        )
          return;
        onDragStart(index);
      }}
      onMouseEnter={() => onFocusIndex(index)}
      onMouseLeave={(e) => {
        const related = e.relatedTarget as Element | null;
        if (!related?.closest?.('.queue-row')) onFocusLeave();
      }}
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
        showCommentChain ? (
          <div className="comment-expanded-view">
            {parentPost && parentPostItem ? (
              <div className="comment-expanded-parent">
                <FeedPostCard
                  post={feedPostFromParent(parentPost)}
                  item={parentPostItem}
                  variant="embedded"
                  expanded
                  modHandlers={modHandlers}
                  menuOpen={parentPostMenuOpen}
                  onMenuOpenChange={(open) => onContextMenuOpenChange?.(open ? parentPostItem.id : null)}
                  onStop={stop}
                />
              </div>
            ) : null}
            <div className="comment-chain-section">
              <span className="comment-chain-label">
                Comment thread ({contextComments.length + 1} comments)
              </span>
              <div className="comment-chain-list">
                {contextComments.map((ctx) => {
                  const ctxMenuOpen = openContextMenuId === ctx.id;
                  return (
                    <div key={ctx.id} className="context-comment-card">
                      <FeedComment
                        item={ctx}
                        modHandlers={modHandlers}
                        menuOpen={ctxMenuOpen}
                        onMenuOpenChange={(open) => onContextMenuOpenChange?.(open ? ctx.id : null)}
                        onStop={stop}
                      />
                    </div>
                  );
                })}
                <div className="context-comment-card context-comment-reported">
                  <QueueReportTags item={item} />
                  <FeedComment
                    item={item}
                    highlighted
                    modHandlers={modHandlers}
                    menuOpen={menuOpen}
                    onMenuOpenChange={onMenuOpenChange}
                    onStop={stop}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`comment-queue-stack${parentPost ? ' comment-queue-stack-threaded' : ''}${parentPost && !continuesParentThreadAbove ? ' comment-queue-stack-detached' : ''}`}
          >
            {parentPost && parentPostItem ? (
              <div className="comment-thread-parent">
                <div className="comment-thread-gutter" aria-hidden="true" />
                <div className="crosspost-shell">
                  <span className="crosspost-label">Comment in thread</span>
                  <FeedPostCard
                    post={feedPostFromParent(parentPost)}
                    item={parentPostItem}
                    variant="embedded"
                    modHandlers={modHandlers}
                    menuOpen={parentPostMenuOpen}
                    onMenuOpenChange={(open) => onContextMenuOpenChange?.(open ? parentPostItem.id : null)}
                    onStop={stop}
                  />
                </div>
              </div>
            ) : null}
            <div className="comment-thread-reply">
              {parentPost ? <div className="comment-thread-gutter" aria-hidden="true" /> : null}
              <FeedComment
                item={item}
                highlighted={highlightReportedComment}
                modHandlers={modHandlers}
                menuOpen={menuOpen}
                onMenuOpenChange={onMenuOpenChange}
                onStop={stop}
              />
            </div>
          </div>
        )
      ) : (
        <FeedPostCard
          post={feedPostFromItem(item)}
          item={item}
          expanded={expandPost || isQueueView}
          modHandlers={modHandlers}
          menuOpen={menuOpen}
          onMenuOpenChange={onMenuOpenChange}
          onOpenComments={onOpenComments}
          onStop={stop}
        />
      )}
    </article>
  );
});
