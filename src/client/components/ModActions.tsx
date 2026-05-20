import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  Check,
  Construction,
  ExternalLink,
  EyeOff,
  FileText,
  Lock,
  MicOff,
  ShieldCheck,
  MoreHorizontal,
  Pin,
  Shield,
  Tag,
  User,
  X,
} from 'lucide-react';
import type { QueueItem } from '../../shared';
import { modMenuEntries, type ModMenuEntry } from '../modActionLabels';
import type { ModItemHandlers } from '../modActions';

type Props = {
  item: QueueItem;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  handlers: ModItemHandlers;
  hostRef: RefObject<HTMLElement | null>;
  onStop?: (event: MouseEvent) => void;
};

function stop(event: MouseEvent, onStop?: (event: MouseEvent) => void) {
  event.stopPropagation();
  onStop?.(event);
}

function NsfwIcon() {
  return <span className="mod-icon-badge">18</span>;
}

function entryIcon(entry: ModMenuEntry) {
  switch (entry.id) {
    case 'view':
      return <ExternalLink size={16} />;
    case 'spam':
      return <AlertCircle size={16} />;
    case 'highlight':
      return <Pin size={16} />;
    case 'lock':
      return <Lock size={16} />;
    case 'flair':
      return <Tag size={16} />;
    case 'nsfw':
      return <NsfwIcon />;
    case 'spoiler':
      return <AlertTriangle size={16} />;
    case 'crowdControl':
      return <Construction size={16} />;
    case 'distinguish':
      return <ShieldCheck size={16} />;
    case 'ignoreReports':
      return <EyeOff size={16} />;
    case 'mute':
      return <MicOff size={16} />;
    case 'user':
      return <User size={16} />;
    case 'note':
      return <FileText size={16} />;
    case 'ban':
      return <Ban size={16} />;
    default:
      return null;
  }
}

function ModActionsMenu({
  item,
  handlers,
  anchorRect,
  onClose,
  onStop,
}: {
  item: QueueItem;
  handlers: ModItemHandlers;
  anchorRect: DOMRect;
  onClose: () => void;
  onStop?: (event: MouseEvent) => void;
}) {
  const isPost = item.type === 'post';
  const visibleEntries = modMenuEntries.filter((entry) => !entry.postOnly || isPost);
  const top = anchorRect.bottom + 6;
  const right = Math.max(8, window.innerWidth - anchorRect.right);

  return createPortal(
    <div
      className="mod-actions-menu mod-actions-menu-portal"
      role="menu"
      style={{ top, right }}
      onMouseDown={(event) => stop(event, onStop)}
    >
      {visibleEntries.map((entry) => (
        <button
          key={entry.id}
          type="button"
          role="menuitem"
          className="mod-actions-menu-item"
          onClick={(event) => {
            stop(event, onStop);
            onClose();
            void handlers.menu(item, entry.id);
          }}
        >
          {entryIcon(entry)}
          <span>{entry.label(item)}</span>
        </button>
      ))}
    </div>,
    document.body,
  );
}

export function ModActions({ item, menuOpen, onMenuOpenChange, handlers, hostRef, onStop }: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const headerButtonRef = useRef<HTMLButtonElement>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const openMenu = (anchor: HTMLElement | null) => {
    if (!anchor) return;
    setAnchorRect(anchor.getBoundingClientRect());
    onMenuOpenChange(true);
  };

  useLayoutEffect(() => {
    if (!menuOpen) return;
    const anchor = headerButtonRef.current ?? barRef.current;
    if (anchor) setAnchorRect(anchor.getBoundingClientRect());
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (hostRef.current?.contains(target)) return;
      if ((target as Element).closest('.mod-actions-menu-portal')) return;
      onMenuOpenChange(false);
    }

    function onReposition() {
      const anchor = headerButtonRef.current ?? barRef.current;
      if (anchor) setAnchorRect(anchor.getBoundingClientRect());
    }

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [hostRef, menuOpen, onMenuOpenChange]);

  return (
    <>
      <div ref={barRef} className="mod-actions">
        <div className="mod-actions-bar" role="toolbar" aria-label="Moderation actions">
          <button
            type="button"
            className="mod-action-icon approve"
            aria-label="Approve"
            data-mod-trigger
            onMouseDown={(e) => stop(e, onStop)}
            onClick={(e) => {
              stop(e, onStop);
              void handlers.approve(item);
            }}
          >
            <Check size={18} />
          </button>
          <button
            type="button"
            className="mod-action-icon remove"
            aria-label="Remove"
            data-mod-trigger
            onMouseDown={(e) => stop(e, onStop)}
            onClick={(e) => {
              stop(e, onStop);
              void handlers.remove(item);
            }}
          >
            <X size={18} />
          </button>
          <button
            type="button"
            className="mod-action-icon shield"
            aria-label="More mod actions"
            aria-expanded={menuOpen}
            data-mod-trigger
            onMouseDown={(e) => stop(e, onStop)}
            onClick={(e) => {
              stop(e, onStop);
              if (menuOpen) onMenuOpenChange(false);
              else openMenu(barRef.current);
            }}
          >
            <Shield size={18} />
          </button>
        </div>
      </div>

      {menuOpen && anchorRect ? (
        <ModActionsMenu
          item={item}
          handlers={handlers}
          anchorRect={anchorRect}
          onClose={() => onMenuOpenChange(false)}
          onStop={onStop}
        />
      ) : null}

      <button
        ref={headerButtonRef}
        type="button"
        className="feed-menu-button mod-actions-header-trigger"
        aria-label="More mod actions"
        aria-expanded={menuOpen}
        data-mod-trigger
        onMouseDown={(e) => stop(e, onStop)}
        onClick={(e) => {
          stop(e, onStop);
          if (menuOpen) onMenuOpenChange(false);
          else openMenu(headerButtonRef.current);
        }}
      >
        <MoreHorizontal size={18} />
      </button>
    </>
  );
}