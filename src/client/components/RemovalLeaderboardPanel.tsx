import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { api } from '../api';
import { redditPermalinkUrl } from '../permalink';
import type { RemovalLeaderboard } from '../../shared';

export function RemovalLeaderboardPanel({ subreddit }: { subreddit: string }) {
  const [data, setData] = useState<RemovalLeaderboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setData(await api.removalLeaderboard()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load removal tracking.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load, subreddit]);
  return <section className="removal-leaderboard" aria-busy={loading}>
    <div className="leaderboard-heading">
      <h3>r/{data?.subreddit ?? subreddit}</h3>
      <button type="button" onClick={() => void load()} disabled={loading} aria-label="Refresh leaderboard">
        <RefreshCw size={15} className={loading ? 'spin' : ''} />
      </button>
    </div>
    <p>Comments removed through KeyModerator, credited to the person who clicked remove. Tracking starts with this version; undo and approval subtract from the count.</p>
    {error ? <p role="alert">{error}</p> : loading && !data ? <p role="status">Loading removals…</p> : !data?.rows.length ?
      <p className="leaderboard-empty">No tracked comment removals yet.</p> :
      <table>
        <caption className="sr-only">Comment removal leaderboard for r/{data.subreddit}</caption>
        <thead><tr><th scope="col">Rank</th><th scope="col">Moderator</th><th scope="col">Removals</th></tr></thead>
        <tbody>{data.rows.map((row, index) => <tr key={row.moderator}>
          <td>{index + 1}</td><th scope="row">u/{row.moderator}</th><td>{row.removals.toLocaleString()}</td>
        </tr>)}</tbody>
      </table>}
    {data?.recent.length ? <div className="removal-audit">
      <h3>Recent removals</h3>
      <ol>{data.recent.map((event) => <li key={event.id}>
        <div><strong>u/{event.moderator}</strong><time dateTime={new Date(event.removedAt).toISOString()}>
          {new Date(event.removedAt).toLocaleString()}
        </time></div>
        <a href={redditPermalinkUrl(event.permalink)} target="_blank" rel="noreferrer">Comment by u/{event.author}</a>
        <p>{event.asSpam ? 'Spam · ' : ''}{event.reason}</p>
        {event.restoredAt ? <small>Restored by u/{event.restoredBy} · {new Date(event.restoredAt).toLocaleString()}</small> : null}
      </li>)}</ol>
    </div> : null}
  </section>;
}
