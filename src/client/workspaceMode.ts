import { context, getWebViewMode, requestExpandedMode } from '@devvit/web/client';

export function isRedditHost() {
  return Boolean(context);
}

export function isWorkspaceExpanded() {
  return isRedditHost() ? getWebViewMode() === 'expanded' : new URLSearchParams(window.location.search).has('popup');
}

export function openWorkspace(event: MouseEvent) {
  if (isRedditHost()) {
    requestExpandedMode(event, 'workspace');
    return;
  }
  const url = new URL('./index.html', window.location.href);
  url.searchParams.set('popup', '1');
  const popup = window.open(url, 'keymoderator-workspace', 'popup,width=1280,height=900,resizable=yes,scrollbars=yes');
  if (!popup) throw new Error('Allow popups for this site to open KeyModerator.');
  popup.focus();
}
