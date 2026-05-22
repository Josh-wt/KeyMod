import { useRef, type MouseEvent, type ReactNode } from 'react';
import { ArrowBigDown, ArrowBigUp, MessageCircle } from 'lucide-react';
import type { ParentPostContext, QueueItem } from '../../shared';
import { compactNumber, feedAge, mediaUrl, subredditInitials } from '../feedUtils';
import type { ModItemHandlers } from '../modActions';
import { ModActions } from './ModActions';
import { QueueMeta } from './QueueMeta';

export type FeedPostSource = {
  subreddit: string;
  title: string;
  permalink: string;
  subredditIcon?: string;
  author?: string;
  createdAt?: number;
  body?: string;
  previewUrl?: string;
  thumbnail?: string;
  url?: string;
  domain?: string;
  score?: number;
  numComments?: number;
};

type Props = {
  post: FeedPostSource;
  item?: QueueItem;
  variant?: 'feed' | 'embedded';
  expanded?: boolean;
  headerExtra?: ReactNode;
  modHandlers?: ModItemHandlers;
  menuOpen?: boolean;
  onMenuOpenChange?: (open: boolean) => void;
  onOpenComments?: (item: QueueItem) => void;
  onStop?: (event: MouseEvent) => void;
};

function stop(event: MouseEvent, onStop?: (event: MouseEvent) => void) {
  event.stopPropagation();
  onStop?.(event);
}

export function feedPostFromItem(item: QueueItem): FeedPostSource {
  return {
    subreddit: item.subreddit,
    subredditIcon: item.subredditIcon,
    author: item.author,
    createdAt: item.createdAt,
    title: item.title,
    body: item.body,
    previewUrl: item.previewUrl,
    thumbnail: item.thumbnail,
    url: item.url,
    domain: item.domain,
    permalink: item.permalink,
    score: item.score,
    numComments: item.numComments,
  };
}

export function feedPostFromParent(parent: ParentPostContext): FeedPostSource {
  return {
    subreddit: parent.subreddit,
    subredditIcon: parent.subredditIcon,
    author: parent.author,
    createdAt: parent.createdAt,
    title: parent.title,
    body: parent.body,
    previewUrl: parent.previewUrl,
    thumbnail: parent.thumbnail,
    url: parent.url,
    domain: parent.domain,
    permalink: parent.permalink,
    score: parent.score,
    numComments: parent.numComments,
  };
}

export function FeedPostCard({
  post,
  item,
  variant = 'feed',
  expanded = false,
  headerExtra,
  modHandlers,
  menuOpen = false,
  onMenuOpenChange,
  onOpenComments,
  onStop,
}: Props) {
  const hostRef = useRef<HTMLElement>(null);
  const embedded = variant === 'embedded';
  const showModActions = !embedded && item && modHandlers && onMenuOpenChange;
  const image = mediaUrl(post.previewUrl, post.thumbnail);
  const shouldShowLink =
    !image && Boolean(post.url && post.domain && post.url !== post.permalink && !post.url.includes('/comments/'));

  return (
    <article
      ref={hostRef}
      className={`feed-post${embedded ? ' feed-post-embedded' : ''}${expanded ? ' feed-post-expanded' : ''}${showModActions ? ' feed-post-with-mod' : ''}`}
    >
      <header className="feed-post-header">
        <div className="subreddit-avatar" data-has-icon={Boolean(post.subredditIcon)}>
          {post.subredditIcon ? <img src={post.subredditIcon} alt="" /> : subredditInitials(post.subreddit)}
        </div>
        <div className="feed-post-meta">
          <strong>r/{post.subreddit}</strong>
          {post.createdAt ? <span className="feed-post-time">{feedAge(post.createdAt)} ago</span> : null}
          {item && !embedded ? <QueueMeta item={item} /> : null}
          {headerExtra}
        </div>
      </header>

      <h2 className="feed-post-title">
        {!embedded && item && onOpenComments ? (
          <button
            type="button"
            onMouseDown={(event) => stop(event, onStop)}
            onClick={(event) => {
              stop(event, onStop);
              onOpenComments(item);
            }}
          >
            {post.title}
          </button>
        ) : (
          post.title
        )}
      </h2>

      {image ? (
        <div className={`feed-post-media${embedded ? ' feed-post-media-compact' : ''}`}>
          <img src={image} alt="" loading="lazy" />
        </div>
      ) : null}

      {shouldShowLink ? (
        <a className="link-preview" href={post.url} target="_blank" rel="noreferrer" onMouseDown={(e) => stop(e, onStop)} onClick={(e) => stop(e, onStop)}>
          <span>{post.domain}</span>
          <strong>{post.url}</strong>
        </a>
      ) : null}

      {!embedded && post.body ? <p className="feed-post-body">{post.body}</p> : null}

      {!embedded ? (
        <footer className="feed-post-actions">
          <div className="public-actions" aria-label="Post engagement">
            <span className="vote-pill">
              <ArrowBigUp size={18} />
              {compactNumber(post.score)}
              <ArrowBigDown size={18} />
            </span>
            <button
              type="button"
              className="public-action-button"
              onMouseDown={(event) => stop(event, onStop)}
              onClick={(event) => {
                stop(event, onStop);
                if (item) onOpenComments?.(item);
              }}
              disabled={!item || !onOpenComments}
            >
              <MessageCircle size={16} />
              {compactNumber(post.numComments)}
            </button>
          </div>
          {showModActions ? (
            <ModActions
              item={item}
              menuOpen={menuOpen}
              onMenuOpenChange={onMenuOpenChange}
              handlers={modHandlers}
              hostRef={hostRef}
              onStop={onStop}
            />
          ) : null}
        </footer>
      ) : null}
    </article>
  );
}
