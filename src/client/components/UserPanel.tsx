import { useEffect, useState } from 'react';
import { api } from '../api';
import type { UserInfo } from '../../shared';

type Props = {
  username: string;
  onClose: () => void;
};

export function UserPanel({ username, onClose }: Props) {
  const [info, setInfo] = useState<UserInfo | null>(null);

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
          <div className="activity-list">
            {info.recentActivity.map((item) => (
              <a key={item.id} href={item.permalink} target="_blank" rel="noreferrer">
                {item.title}
              </a>
            ))}
          </div>
        </>
      ) : (
        <p>Loading</p>
      )}
    </aside>
  );
}
