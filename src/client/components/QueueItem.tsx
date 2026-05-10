import { useEffect, useState } from 'react';
import { Check, UserCircle } from 'lucide-react';
import { api } from '../api';
import type { QueueItem as QueueItemType, UserInfo } from '../../shared';

type Props = {
  item: QueueItemType;
  index: number;
  focused: boolean;
  selected: boolean;
  dragPreviewed: boolean;
  onToggle: (id: string) => void;
  onDragStart: (index: number) => void;
  onDragUpdate: (index: number) => void;
};

function age(createdAt: number) {
  const seconds = Math.max(1, Math.floor((Date.now() - createdAt) / 1000));
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86_400)}d`;
}

export function QueueItem({ item, index, focused, selected, dragPreviewed, onToggle, onDragStart, onDragUpdate }: Props) {
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    if (!focused) return;
    const controller = new AbortController();
    api.user(item.author).then(setUser).catch(() => undefined);
    return () => controller.abort();
  }, [focused, item.author]);

  return (
    <article
      className={`queue-row${focused ? ' focused' : ''}${selected ? ' selected' : ''}${dragPreviewed ? ' drag-previewed' : ''}`}
      data-queue-id={item.id}
      onMouseDown={() => onDragStart(index)}
      onMouseOver={() => onDragUpdate(index)}
    >
      <button
        className={`check-button${selected || dragPreviewed ? ' checked' : ''}${dragPreviewed && !selected ? ' preview' : ''}`}
        aria-label={selected ? 'Deselect item' : 'Select item'}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={() => onToggle(item.id)}
      >
        {selected || dragPreviewed ? <Check size={14} /> : null}
      </button>
      <div className="row-content">
        <div className="row-meta">
          <span>u/{item.author}</span>
          <span>{age(item.createdAt)}</span>
          <span>{item.numReports} reports</span>
          <span>{item.type}</span>
        </div>
        <h2>{item.title}</h2>
        {item.body ? <p>{item.body}</p> : null}
        {item.reportReasons.length ? <div className="reports">{item.reportReasons.join(' · ')}</div> : null}
      </div>
      {focused ? (
        <aside className="quick-stats">
          <UserCircle size={16} />
          <span>{user ? `${user.accountAgeDays}d acct` : 'loading'}</span>
          <span>{user ? `${user.combinedKarma} karma` : ''}</span>
          <strong>{item.numReports}</strong>
        </aside>
      ) : null}
    </article>
  );
}
