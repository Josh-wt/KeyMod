import { useEffect, useState } from 'react';
import { api } from '../api';
import type { ModNoteEntry, UserActivityItem, UserInfo, UserModLogEntry } from '../../shared';

type Props = {
  username: string;
  onClose: () => void;
};

export function UserPanel({ username, onClose }: Props) {
  const [info, setInfo] = useState<UserInfo | null>(null);
  const [tab, setTab] = useState<'posts' | 'comments' | 'modlog' | 'notes'>('posts');

  useEffect(() => {
    api.user(username).then(setInfo).catch(() => undefined);
  }, [username]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <aside className="user-panel">
      <button className="panel-close" onClick={onClose} aria-label="Close user panel">
        x
      </button>
      <h2>u/{username}</h2>
      {info ? (
        <>
          <dl>
            <dt>Account age</dt>
            <dd>{info.accountAgeDays} days</dd>
            <dt>Karma</dt>
            <dd>{info.combinedKarma}</dd>
            <dt>Recent in sub</dt>
            <dd>{info.recentInSub}</dd>
            <dt>Prior removals</dt>
            <dd>{info.priorRemovals}</dd>
          </dl>
          <div className="user-tabs" role="tablist" aria-label="User history">
            <button className={tab === 'posts' ? 'active' : ''} onClick={() => setTab('posts')}>
              Posts
            </button>
            <button className={tab === 'comments' ? 'active' : ''} onClick={() => setTab('comments')}>
              Comments
            </button>
            <button className={tab === 'modlog' ? 'active' : ''} onClick={() => setTab('modlog')}>
              Mod log
            </button>
            <button className={tab === 'notes' ? 'active' : ''} onClick={() => setTab('notes')}>
              Notes
            </button>
          </div>
          {tab === 'posts' ? <ActivityList items={info.recentPosts} empty="No recent posts found." /> : null}
          {tab === 'comments' ? <ActivityList items={info.recentComments} empty="No recent comments found." /> : null}
          {tab === 'modlog' ? <ModLogList items={info.modLog} /> : null}
          {tab === 'notes' ? <ModNotesList notes={info.modNotes ?? []} /> : null}
        </>
      ) : (
        <p>Loading</p>
      )}
    </aside>
  );
}

function age(createdAt: number) {
  const seconds = Math.max(1, Math.floor((Date.now() - createdAt) / 1000));
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86_400)}d`;
}

function ActivityList({ items, empty }: { items: UserActivityItem[]; empty: string }) {
  if (!items.length) return <p className="panel-empty">{empty}</p>;
  return (
    <div className="activity-list">
      {items.map((item) => (
        <a key={item.id} href={item.permalink} target="_blank" rel="noreferrer">
          <span>
            r/{item.subreddit} · {age(item.createdAt)}
          </span>
          <strong>{item.title}</strong>
          {item.body ? <small>{item.body}</small> : null}
        </a>
      ))}
    </div>
  );
}

function ModNotesList({ notes }: { notes: ModNoteEntry[] }) {
  if (!notes.length) return <p className="panel-empty">No mod notes for this user.</p>;
  return (
    <div className="activity-list mod-notes-list">
      {notes.map((entry) => (
        <div key={entry.id}>
          <span>
            {entry.moderator} · {age(entry.createdAt)}
            {entry.label ? ` · ${entry.label}` : ''}
          </span>
          <p>{entry.note}</p>
        </div>
      ))}
    </div>
  );
}

function ModLogList({ items }: { items: UserModLogEntry[] }) {
  if (!items.length) return <p className="panel-empty">No matching mod log entries found.</p>;
  return (
    <div className="activity-list modlog-list">
      {items.map((entry) => (
        <div key={entry.id}>
          <span>
            {entry.action} · {age(entry.createdAt)}
          </span>
          <strong>{entry.moderator}</strong>
          <small>{entry.details || entry.targetId || 'No details'}</small>
        </div>
      ))}
    </div>
  );
}
