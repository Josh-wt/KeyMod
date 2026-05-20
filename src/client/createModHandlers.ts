import { api } from './api';
import { runDistinguish, runIgnoreReports } from './modDispatch';
import { redditPermalinkUrl } from './permalink';
import type { ModItemHandlers, ModMenuAction } from './modActions';
import type { QueueItem, RemovalReason } from '../shared';

const crowdLevels = ['OFF', 'LENIENT', 'MEDIUM', 'STRICT'] as const;

type Deps = {
  removalReasons: RemovalReason[];
  focusItem: (item: QueueItem) => void;
  setOpenMenuId: (id: string | null) => void;
  removeIds: (ids: string[], reasonIndex: number, asSpam?: boolean) => Promise<void>;
  markApproved: (ids: string[]) => void;
  patchItem: (id: string, patch: Partial<QueueItem>) => void;
  openModalForItem: (item: QueueItem, modal: 'ban' | 'flair' | 'note') => void;
  setUserPanel: (username: string | null) => void;
  addToast: (message: string, kind?: 'info' | 'warning' | 'error' | 'success') => void;
};

function defaultRemovalIndex(reasons: RemovalReason[]) {
  return reasons.find((reason) => reason.text.trim())?.index ?? 1;
}

function applyUpdates(updates: Array<{ id: string } & Partial<QueueItem>>, patchItem: Deps['patchItem']) {
  for (const update of updates) {
    const { id, ...patch } = update;
    if (Object.keys(patch).length) patchItem(id, patch);
  }
}

export function createModHandlers({
  removalReasons,
  focusItem,
  setOpenMenuId,
  removeIds,
  markApproved,
  patchItem,
  openModalForItem,
  setUserPanel,
  addToast,
}: Deps): ModItemHandlers {
  const removalIndex = defaultRemovalIndex(removalReasons);

  return {
    approve: async (item) => {
      focusItem(item);
      setOpenMenuId(null);
      try {
        const response = await api.approve([item.id]);
        if (response.failed) {
          addToast(response.errors?.[0] ?? 'Approve failed.', 'error');
          return;
        }
        markApproved([item.id]);
        addToast('Approved.', 'success');
      } catch (error) {
        addToast(error instanceof Error ? error.message : 'Approve failed', 'error');
      }
    },

    remove: async (item) => {
      focusItem(item);
      setOpenMenuId(null);
      await removeIds([item.id], removalIndex);
    },

    menu: async (item, action: ModMenuAction) => {
      focusItem(item);
      setOpenMenuId(null);

      try {
        if (action === 'view') {
          window.open(redditPermalinkUrl(item.permalink), '_blank', 'noopener,noreferrer');
          return;
        }

        if (action === 'user') {
          setUserPanel(item.author);
          return;
        }

        if (action === 'ban') {
          openModalForItem(item, 'ban');
          return;
        }

        if (action === 'note') {
          openModalForItem(item, 'note');
          return;
        }

        if (action === 'spam') {
          await removeIds([item.id], removalIndex, true);
          return;
        }

        if (action === 'lock') {
          const response = await api.lock([item.id]);
          if (response.failed) {
            addToast(response.errors?.[0] ?? 'Lock action failed.', 'error');
            return;
          }
          applyUpdates(response.updates ?? [], patchItem);
          const locked = response.updates?.[0]?.locked;
          addToast(locked ? 'Locked.' : 'Unlocked.', 'success');
          return;
        }

        if (action === 'flair') {
          if (item.type !== 'post') {
            addToast('Flair is only available on posts.', 'warning');
            return;
          }
          openModalForItem(item, 'flair');
          return;
        }

        if (item.type !== 'post') {
          addToast('This action only applies to posts.', 'warning');
          return;
        }

        if (action === 'nsfw') {
          const response = await api.nsfw([item.id]);
          if (response.failed) {
            addToast(response.errors?.[0] ?? 'NSFW update failed.', 'error');
            return;
          }
          applyUpdates(response.updates ?? [], patchItem);
          const nsfw = response.updates?.[0]?.nsfw;
          addToast(nsfw ? 'NSFW tag added.' : 'NSFW tag removed.', 'success');
          return;
        }

        if (action === 'spoiler') {
          const response = await api.spoiler([item.id]);
          if (response.failed) {
            addToast(response.errors?.[0] ?? 'Spoiler update failed.', 'error');
            return;
          }
          applyUpdates(response.updates ?? [], patchItem);
          const spoiler = response.updates?.[0]?.spoiler;
          addToast(spoiler ? 'Spoiler tag added.' : 'Spoiler tag removed.', 'success');
          return;
        }

        if (action === 'highlight') {
          const response = await api.highlight([item.id]);
          if (response.failed) {
            addToast(response.errors?.[0] ?? 'Highlight update failed.', 'error');
            return;
          }
          applyUpdates(response.updates ?? [], patchItem);
          const stickied = response.updates?.[0]?.stickied;
          addToast(stickied ? 'Added to highlights.' : 'Removed from highlights.', 'success');
          return;
        }

        if (action === 'distinguish') {
          const response = await runDistinguish([item.id], patchItem);
          if (response.failed) {
            addToast(response.errors?.[0] ?? 'Distinguish failed.', 'error');
            return;
          }
          const distinguished = response.updates?.[0]?.distinguished;
          addToast(distinguished ? 'Distinguished.' : 'Undistinguished.', 'success');
          return;
        }

        if (action === 'ignoreReports') {
          const response = await runIgnoreReports([item.id], patchItem);
          if (response.failed) {
            addToast(response.errors?.[0] ?? 'Ignore reports failed.', 'error');
            return;
          }
          const ignoring = response.updates?.[0]?.ignoringReports;
          addToast(ignoring ? 'Reports ignored.' : 'Reports unignored.', 'success');
          return;
        }

        if (action === 'mute') {
          try {
            await api.mute(item.author, `Muted from KeyModerator (${item.id})`);
            addToast(`Muted u/${item.author}.`, 'success');
          } catch (error) {
            addToast(error instanceof Error ? error.message : 'Mute failed', 'error');
          }
          return;
        }

        if (action === 'crowdControl') {
          const current = item.crowdControlLevel ?? 'OFF';
          const index = crowdLevels.indexOf(current as (typeof crowdLevels)[number]);
          const next = crowdLevels[(index + 1) % crowdLevels.length];
          const response = await api.crowdControl([item.id], next);
          if (response.failed) {
            addToast(response.errors?.[0] ?? 'Crowd control update failed.', 'error');
            return;
          }
          applyUpdates(response.updates ?? [], patchItem);
          const level = response.updates?.[0]?.crowdControlLevel ?? next;
          addToast(`Crowd control: ${level}.`, 'success');
        }
      } catch (error) {
        addToast(error instanceof Error ? error.message : 'Mod action failed', 'error');
      }
    },
  };
}
