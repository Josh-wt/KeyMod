/** Scroll a queue row to the top of its `.queue-list` scroll container. */
export function scrollFocusedRowIntoView(itemId: string) {
  const row = document.querySelector<HTMLElement>(`.queue-row[data-queue-id="${CSS.escape(itemId)}"]`);
  if (!row) return;

  const list = row.closest<HTMLElement>('.queue-list');
  if (!list) {
    row.scrollIntoView({ block: 'start' });
    return;
  }

  const listTop = list.getBoundingClientRect().top;
  const rowTop = row.getBoundingClientRect().top;
  list.scrollTop += rowTop - listTop;
}
