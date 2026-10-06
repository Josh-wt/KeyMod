import { AlertCircle, Check, CheckCheck, CornerDownRight, EyeOff, Lock, Trash2, X } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Keymap } from '../../shared';

type Props = {
  selectedCount: number;
  /** Replies to the selected comments that are not selected yet. */
  replyCount: number;
  keymap: Keymap;
  onApprove: () => void;
  onRemove: () => void;
  onSpam: () => void;
  onLock: () => void;
  onIgnoreReports: () => void;
  onAddReplies: () => void;
  onSelectAll: () => void;
  onClear: () => void;
};

function keyLabel(key: string | undefined) {
  if (!key) return '';
  if (key === ' ') return 'Space';
  return key.length === 1 ? key.toUpperCase() : key;
}

function Action({ className, icon, label, hint, onClick }: {
  className: string;
  icon: ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`selection-action ${className}`} onClick={onClick}>
      {icon}
      <span>{label}</span>
      {hint ? <kbd>{hint}</kbd> : null}
    </button>
  );
}

export function SelectionBar({
  selectedCount,
  replyCount,
  keymap,
  onApprove,
  onRemove,
  onSpam,
  onLock,
  onIgnoreReports,
  onAddReplies,
  onSelectAll,
  onClear,
}: Props) {
  return (
    <footer className="selection-bar" role="toolbar" aria-label="Actions for selected items">
      <div className="selection-bar-summary">
        <button type="button" className="selection-bar-clear" onClick={onClear} aria-label="Clear selection" title="Clear selection (Esc)">
          <X size={18} />
        </button>
        <strong aria-live="polite">{selectedCount} selected</strong>
        {replyCount > 0 ? (
          <button type="button" className="selection-chip" onClick={onAddReplies}>
            <CornerDownRight size={14} />+ {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
          </button>
        ) : null}
        <button type="button" className="selection-chip" onClick={onSelectAll}>
          <CheckCheck size={14} />All
        </button>
      </div>
      <div className="selection-bar-actions">
        <Action className="approve" icon={<Check size={18} />} label="Approve" hint={keyLabel(keymap.approve)} onClick={onApprove} />
        <Action className="remove" icon={<Trash2 size={18} />} label="Remove" hint="Ctrl+1-9" onClick={onRemove} />
        <Action className="spam" icon={<AlertCircle size={18} />} label="Spam" hint={keyLabel(keymap.spam)} onClick={onSpam} />
        <Action className="lock" icon={<Lock size={18} />} label="Lock" hint={keyLabel(keymap.lock)} onClick={onLock} />
        <Action className="ignore" icon={<EyeOff size={18} />} label="Ignore" hint={keyLabel(keymap.ignoreReports)} onClick={onIgnoreReports} />
      </div>
      <p className="selection-bar-hint">Tap items to add them. Hold a comment to select it with its replies.</p>
    </footer>
  );
}
