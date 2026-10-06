import { useEffect, useMemo, useState } from 'react';
import { Bell, FileText, ListChecks, NotebookPen, Search, ShieldCheck, Table2, Wrench, Trophy } from 'lucide-react';

export type Command = {
  id: string;
  title: string;
  subtitle: string;
  section: 'User Notes' | 'Removal Reasons' | 'Queue Tools' | 'Notifications' | 'Mod Log Matrix' | 'AutoMod' | 'Removal Leaderboard';
  keywords: string[];
  run: () => void;
};

const iconBySection = {
  'User Notes': NotebookPen,
  'Removal Reasons': FileText,
  'Queue Tools': ListChecks,
  Notifications: Bell,
  'Mod Log Matrix': Table2,
  AutoMod: ShieldCheck,
  'Removal Leaderboard': Trophy,
} as const;

type Props = {
  commands: Command[];
  onClose: () => void;
};

export function CommandPalette({ commands, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return commands;
    return commands.filter((command) => {
      const haystack = [command.title, command.subtitle, command.section, ...command.keywords].join(' ').toLowerCase();
      return haystack.includes(normalized);
    });
  }, [commands, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowDown' || (event.ctrlKey && event.key === 'j')) {
        event.preventDefault();
        setActiveIndex((index) => Math.min(filtered.length - 1, index + 1));
      }
      if (event.key === 'ArrowUp' || (event.ctrlKey && event.key === 'k')) {
        event.preventDefault();
        setActiveIndex((index) => Math.max(0, index - 1));
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const command = filtered[activeIndex];
        if (command) {
          command.run();
          onClose();
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, filtered, onClose]);

  return (
    <div className="command-backdrop">
      <section className="command-palette" role="dialog" aria-label="Global actions">
        <div className="command-input">
          <Search size={18} />
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search actions" />
          <kbd>Esc</kbd>
        </div>
        <div className="command-list">
          {filtered.map((command, index) => {
            const Icon = iconBySection[command.section] ?? Wrench;
            return (
              <button
                key={command.id}
                className={index === activeIndex ? 'active' : ''}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => {
                  command.run();
                  onClose();
                }}
              >
                <Icon size={17} />
                <span>
                  <strong>{command.title}</strong>
                  <small>{command.subtitle}</small>
                </span>
                <em>{command.section}</em>
              </button>
            );
          })}
          {!filtered.length ? <p>No actions match</p> : null}
        </div>
      </section>
    </div>
  );
}
