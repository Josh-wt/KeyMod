import { api } from './api';
import { applyModUpdates } from './optimisticApply';
import { runDistinguish, runIgnoreReports, runLock, runNsfw, runSpoiler, runHighlight } from './modDispatch';
import { redditPermalinkUrl } from './permalink';
import type { ModItemHandlers, ModMenuAction } from './modActions';
import type { ItemLookup } from './optimisticMod';
import type { QueueItem, RemovalReason } from '../shared';

const crowdLevels = ['OFF', 'LENIENT', 'MEDIUM', 'STRICT'] as const;

type Deps = {
  removalReasons: RemovalReason[];
  findItem: ItemLookup;
  refresh: () => void;
  focusItem: (item: QueueItem) => void;
  setOpenMenuId: (id: string | null) => void;
  removeIds: (ids: string[], reasonIndex: number, asSpam?: boolean, removalReason?: { id?: string; title?: string }) => void;
  markApproved: (ids: string[]) => void;
  patchItem: (id: string, patch: Partial<QueueItem>) => void;
  openModalForItem: (item: QueueItem, modal: 'ban' | 'flair' | 'note') => void;
  openRemovalModal: (item: QueueItem, asSpam?: boolean) => void;
  setUserPanel: (username: string | null) => void;
  addToast: (message: string, kind?: 'info' | 'warning' | 'error' | 'success') => void;
};

export function createModHandlers({
  removalReasons,
  findItem,
  refresh,
  focusItem,
  setOpenMenuId,
  removeIds,
  markApproved,
  patchItem,
  openModalForItem,
  openRemovalModal,
  setUserPanel,
  addToast,
}: Deps): ModItemHandlers {
  return {
    approve: (item) => {
      focusItem(item);
      setOpenMenuId(null);
      markApproved([item.id]);
      void api
        .approve([item.id])
        .then((response) => {
          if (response.failed) {
            refresh();
            addToast(response.errors?.[0] ?? 'Approve failed.', 'error');
          }
        })
        .catch((error) => {
          refresh();
          addToast(error instanceof Error ? error.message : 'Approve failed', 'error');
        });
    },

    remove: (item) => {
      openRemovalModal(item);
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
          openRemovalModal(item, true);
          return;
        }

        if (action === 'lock') {
          const response = await runLock([item.id], patchItem, findItem);
          if (response.failed) {
            addToast(response.errors?.[0] ?? 'Lock action failed.', 'error');
            return;
          }
          const locked = findItem(item.id)?.locked;
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
          const response = await runNsfw([item.id], patchItem, findItem);
          if (response.failed) {
            addToast(response.errors?.[0] ?? 'NSFW update failed.', 'error');
            return;
          }
          const nsfw = findItem(item.id)?.nsfw;
          addToast(nsfw ? 'NSFW tag added.' : 'NSFW tag removed.', 'success');
          return;
        }

        if (action === 'spoiler') {
          const response = await runSpoiler([item.id], patchItem, findItem);
          if (response.failed) {
            addToast(response.errors?.[0] ?? 'Spoiler update failed.', 'error');
            return;
          }
          const spoiler = findItem(item.id)?.spoiler;
          addToast(spoiler ? 'Spoiler tag added.' : 'Spoiler tag removed.', 'success');
          return;
        }

        if (action === 'highlight') {
          const response = await runHighlight([item.id], patchItem, findItem);
          if (response.failed) {
            addToast(response.errors?.[0] ?? 'Highlight update failed.', 'error');
            return;
          }
          const stickied = findItem(item.id)?.stickied;
          addToast(stickied ? 'Added to highlights.' : 'Removed from highlights.', 'success');
          return;
        }

        if (action === 'distinguish') {
          const response = await runDistinguish([item.id], patchItem, findItem);
          if (response.failed) {
            addToast(response.errors?.[0] ?? 'Distinguish failed.', 'error');
            return;
          }
          const distinguished = findItem(item.id)?.distinguished;
          addToast(distinguished ? 'Distinguished.' : 'Undistinguished.', 'success');
          return;
        }

        if (action === 'ignoreReports') {
          const response = await runIgnoreReports([item.id], patchItem, findItem);
          if (response.failed) {
            addToast(response.errors?.[0] ?? 'Ignore reports failed.', 'error');
            return;
          }
          const ignoring = findItem(item.id)?.ignoringReports;
          addToast(ignoring ? 'Reports ignored.' : 'Reports unignored.', 'success');
          return;
        }

        if (action === 'mute') {
          void api
            .mute(item.author, `Muted from KeyModerator (${item.id})`)
            .then(() => addToast(`Muted u/${item.author}.`, 'success'))
            .catch((error) => addToast(error instanceof Error ? error.message : 'Mute failed', 'error'));
          return;
        }

        if (action === 'crowdControl') {
          const current = item.crowdControlLevel ?? 'OFF';
          const index = crowdLevels.indexOf(current as (typeof crowdLevels)[number]);
          const next = crowdLevels[(index + 1) % crowdLevels.length];
          patchItem(item.id, { crowdControlLevel: next });
          void api
            .crowdControl([item.id], next)
            .then((response) => {
              if (response.failed) {
                patchItem(item.id, { crowdControlLevel: current });
                addToast(response.errors?.[0] ?? 'Crowd control update failed.', 'error');
                return;
              }
              applyModUpdates(response.updates, patchItem);
              const level = response.updates?.[0]?.crowdControlLevel ?? next;
              addToast(`Crowd control: ${level}.`, 'success');
            })
            .catch((error) => {
              patchItem(item.id, { crowdControlLevel: current });
              addToast(error instanceof Error ? error.message : 'Crowd control update failed', 'error');
            });
        }
      } catch (error) {
        addToast(error instanceof Error ? error.message : 'Mod action failed', 'error');
      }
    },
  };
}
