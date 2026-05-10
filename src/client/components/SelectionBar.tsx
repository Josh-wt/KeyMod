type Props = {
  selectedCount: number;
  focusedCount: number;
};

export function SelectionBar({ selectedCount, focusedCount }: Props) {
  const count = selectedCount || focusedCount;
  return (
    <footer className="selection-bar">
      <strong>{count} selected</strong>
      <span>
        <kbd>Ctrl+1-9</kbd> remove
      </span>
      <span>
        <kbd>S</kbd> approve
      </span>
      <span>
        <kbd>L</kbd> lock
      </span>
      <span>
        <kbd>B</kbd> ban
      </span>
      <span>
        <kbd>?</kbd> help
      </span>
    </footer>
  );
}
