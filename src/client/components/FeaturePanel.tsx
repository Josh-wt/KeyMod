import { Bell, FileText, ListChecks, NotebookPen, ShieldCheck, Table2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api';
import type {
  AutomodPanelData,
  AutomodValidation,
  ModLogMatrix,
  NotificationCounts,
  QueueItem,
  RemovalReason,
  UserInfo,
} from '../../shared';

export type FeaturePanelKind = 'notes' | 'reasons' | 'queue-tools' | 'notifications' | 'mod-log' | 'automod';

type Props = {
  kind: FeaturePanelKind;
  focused: QueueItem | null;
  removalReasons: RemovalReason[];
  userInfo: UserInfo | null;
  selectedCount: number;
  onClose: () => void;
};

const titles: Record<FeaturePanelKind, string> = {
  notes: 'User Notes',
  reasons: 'Removal Reasons',
  'queue-tools': 'Queue Tools',
  notifications: 'Notifications',
  'mod-log': 'Mod Log Matrix',
  automod: 'AutoMod',
};

const icons = {
  notes: NotebookPen,
  reasons: FileText,
  'queue-tools': ListChecks,
  notifications: Bell,
  'mod-log': Table2,
  automod: ShieldCheck,
} as const;

export function FeaturePanel({ kind, focused, removalReasons, userInfo, selectedCount, onClose }: Props) {
  const Icon = icons[kind];
  const [notifications, setNotifications] = useState<NotificationCounts | null>(null);
  const [modLog, setModLog] = useState<ModLogMatrix | null>(null);
  const [automod, setAutomod] = useState<AutomodPanelData | null>(null);
  const [automodDraft, setAutomodDraft] = useState('');
  const [automodValidation, setAutomodValidation] = useState<AutomodValidation | null>(null);
  const [automodStatus, setAutomodStatus] = useState<string | null>(null);

  useEffect(() => {
    if (kind === 'notifications') api.notifications().then(setNotifications).catch(() => undefined);
    if (kind === 'mod-log') api.modLog().then(setModLog).catch(() => undefined);
    if (kind === 'automod') {
      api
        .automod()
        .then((data) => {
          setAutomod(data);
          setAutomodDraft(data.config);
        })
        .catch(() => setAutomodStatus('AutoMod data is unavailable in this context.'));
    }
  }, [kind]);

  return (
    <aside className="feature-panel">
      <header>
        <div>
          <Icon size={18} />
          <h2>{titles[kind]}</h2>
        </div>
        <button onClick={onClose} aria-label="Close feature panel">
          x
        </button>
      </header>

      {kind === 'notes' ? (
        <section>
          <h3>u/{focused?.author ?? 'focused user'}</h3>
          <p>{userInfo ? `${userInfo.priorRemovals} prior removals · ${userInfo.combinedKarma} karma` : 'Load a focused user to view notes.'}</p>
          <div className="note-card">No local note history in preview. Press <kbd>M</kbd> or run “Add mod note” to create one.</div>
        </section>
      ) : null}

      {kind === 'reasons' ? (
        <section className="reason-list">
          {removalReasons.map((reason) => (
            <div key={reason.index}>
              <kbd>Ctrl+{reason.index}</kbd>
              <span>{reason.text || `Removal reason ${reason.index}`}</span>
              <small>{reason.flairId || 'No flair'}</small>
            </div>
          ))}
        </section>
      ) : null}

      {kind === 'queue-tools' ? (
        <section className="tool-grid">
          <div>
            <strong>{selectedCount || 1}</strong>
            <span>Targeted items</span>
          </div>
          <div>
            <strong>{focused?.numReports ?? 0}</strong>
            <span>Focused reports</span>
          </div>
          <div>
            <strong>{focused?.type ?? 'none'}</strong>
            <span>Focused type</span>
          </div>
        </section>
      ) : null}

      {kind === 'notifications' ? (
        <section className="notification-grid">
          <div><strong>{notifications?.modqueue ?? 0}</strong><span>Modqueue</span></div>
          <div><strong>{notifications?.modmail ?? 0}</strong><span>Modmail</span></div>
          <div><strong>{notifications?.messages ?? 0}</strong><span>Messages</span></div>
          <div><strong>{notifications?.unmoderated ?? 0}</strong><span>Unmoderated</span></div>
        </section>
      ) : null}

      {kind === 'mod-log' ? (
        <section className="matrix">
          {(modLog?.rows ?? []).flatMap((row) => [
            <div key={`${row.action}-today`}>
              <span>{row.action}</span>
              <strong>{row.today}</strong>
              <small>today</small>
            </div>,
            <div key={`${row.action}-7d`}>
              <span>{row.action}</span>
              <strong>{row.sevenDays}</strong>
              <small>7d</small>
            </div>,
            <div key={`${row.action}-30d`}>
              <span>{row.action}</span>
              <strong>{row.thirtyDays}</strong>
              <small>30d</small>
            </div>,
          ])}
        </section>
      ) : null}

      {kind === 'automod' ? (
        <section className="automod-panel-body">
          <div className="automod-status">
            <strong>{automod?.status ?? 'loading'}</strong>
            <span>{automod?.revisionId ? `Revision ${automod.revisionId}` : 'Wiki-backed config'}</span>
          </div>

          <div className="automod-actions">
            <button
              onClick={async () => {
                const result = await api.validateAutomod(automodDraft);
                setAutomodValidation(result);
                setAutomodStatus(result.ok ? 'Config passed basic validation.' : 'Config needs changes before saving.');
              }}
            >
              Validate
            </button>
            <button
              disabled={!automodValidation?.ok}
              onClick={async () => {
                const result = await api.saveAutomod(automodDraft, automod?.revisionId);
                setAutomodStatus(`Saved AutoMod config${result.revisionId ? ` as ${result.revisionId}` : ''}.`);
              }}
            >
              Save
            </button>
          </div>

          <label className="automod-editor">
            <span>config/automoderator</span>
            <textarea value={automodDraft} onChange={(event) => setAutomodDraft(event.target.value)} spellCheck={false} />
          </label>

          {automodValidation ? (
            <div className={automodValidation.ok ? 'automod-result ok' : 'automod-result error'}>
              <strong>{automodValidation.ok ? 'Valid' : 'Invalid'}</strong>
              {[...automodValidation.errors, ...automodValidation.warnings].map((message) => (
                <span key={message}>{message}</span>
              ))}
            </div>
          ) : null}
          {automodStatus ? <p className="automod-message">{automodStatus}</p> : null}

          <h3>Recent filters</h3>
          <div className="automod-filter-list">
            {(automod?.recentFilters ?? []).map((event) => (
              <a key={event.id} href={event.permalink} target="_blank" rel="noreferrer">
                <span>{event.type}</span>
                <strong>{event.title}</strong>
                <small>u/{event.author} · {event.reason || 'No reason'}</small>
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </aside>
  );
}
