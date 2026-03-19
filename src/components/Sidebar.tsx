import React, { useMemo, useState } from 'react';
import { useStore } from '@nanostores/react';
import { $activePage, $sidebarOpen, type ActivePage } from '../lib/stores';
import {
  HiOutlineArrowTopRightOnSquare,
  HiOutlineBars3,
  HiOutlineCodeBracket,
  HiOutlineCommandLine,
  HiOutlineCubeTransparent,
  HiOutlineDocumentText,
  HiOutlineKey,
  HiOutlineLink,
  HiOutlineLockClosed,
  HiOutlineSparkles,
  HiOutlineXMark,
} from 'react-icons/hi2';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';

type SortMode = 'default' | 'az' | 'za';

const navItems: { id: ActivePage; label: string; icon: React.ReactNode }[] = [
  { id: 'api-endpoint-architect', label: 'API Endpoint Architect', icon: <HiOutlineArrowTopRightOnSquare size={20} /> },
  { id: 'schema-canvas', label: 'Schema Canvas (Experimental)', icon: <HiOutlineCubeTransparent size={20} /> },
  { id: 'command-vault', label: 'Command Vault', icon: <HiOutlineCommandLine size={20} /> },
  { id: 'hash-crypto-generator', label: 'Hash & Crypto', icon: <HiOutlineSparkles size={20} /> },
  { id: 'markdown-csv-converter', label: 'Markdown / CSV', icon: <HiOutlineCodeBracket size={20} /> },
  { id: 'jwt-debugger', label: 'JWT Debugger', icon: <HiOutlineKey size={20} /> },
  { id: 'base64-url-encoder-decoder', label: 'Base64 / URL', icon: <HiOutlineLink size={20} /> },
  { id: 'credential-vault', label: 'Credential Vault', icon: <HiOutlineKey size={20} /> },
  { id: 'data-formatter', label: 'Data Formatter', icon: <HiOutlineCodeBracket size={20} /> },
  { id: 'links', label: 'Links Saver', icon: <HiOutlineLink size={20} /> },
  { id: 'notes', label: 'Notes Taker', icon: <HiOutlineDocumentText size={20} /> },
  { id: 'password-vault', label: 'Password Vault', icon: <HiOutlineLockClosed size={20} /> },
  { id: 'prompts', label: 'Prompt Builder', icon: <HiOutlineCommandLine size={20} /> },
  { id: 'sql-formatter', label: 'SQL Formatter', icon: <HiOutlineCodeBracket size={20} /> },
  { id: 'toon-formatter', label: 'TOON Formatter', icon: <HiOutlineCubeTransparent size={20} /> },
  { id: 'tokenizer', label: 'Tokenizer', icon: <HiOutlineSparkles size={20} /> },
];

export default function Sidebar() {
  const activePage = useStore($activePage);
  const sidebarOpen = useStore($sidebarOpen);
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('default');

  const filteredNavItems = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    const base = lowered
      ? navItems.filter((item) => item.label.toLowerCase().includes(lowered))
      : navItems;

    if (sortMode === 'default') return base;

    const sorted = [...base].sort((a, b) => a.label.localeCompare(b.label));
    return sortMode === 'za' ? sorted.reverse() : sorted;
  }, [query, sortMode]);

  const handleNav = (page: ActivePage) => {
    $activePage.set(page);
    $sidebarOpen.set(false);
  };

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-border bg-card/95 px-4 py-3 md:hidden">
        <span className="text-lg font-bold tracking-[0.24em] text-foreground">SAVERZ</span>
        <Button
          onClick={() => $sidebarOpen.set(!sidebarOpen)}
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          aria-label="Toggle menu"
        >
          {sidebarOpen ? <HiOutlineXMark size={22} /> : <HiOutlineBars3 size={22} />}
        </Button>
      </header>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => $sidebarOpen.set(false)} />}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen w-64 flex-col overflow-hidden border-r border-border bg-card transition-transform duration-200',
          'md:sticky md:top-0 md:z-auto md:shrink-0 md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full w-64 min-h-0 flex-col">
          <div className="flex items-center justify-between border-b border-border px-6 py-6">
            <div className="flex w-full flex-col items-center justify-center text-center">
              <img src="/saverz-light.svg" alt="Saverz" height={50} width={50} />
              <h1 className="mt-2 text-xl font-bold tracking-[0.24em] text-foreground">SAVERZ</h1>
            </div>
          </div>

          <div className="shrink-0 space-y-2 border-b border-border px-3 py-3">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter tools..."
              className="h-9"
            />
            <div className="flex items-center gap-2">
              <label htmlFor="sidebar-sort" className="text-xs text-muted-foreground">
                Sort
              </label>
              <select
                id="sidebar-sort"
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="h-8 flex-1 rounded-lg border border-input bg-background px-2 text-xs"
              >
                <option value="default">Default</option>
                <option value="az">A to Z</option>
                <option value="za">Z to A</option>
              </select>
            </div>
          </div>

          <nav className="scrollbar-hidden flex-1 min-h-0 space-y-1 overflow-y-auto scroll-smooth px-3 py-4">
            {filteredNavItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <Button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  variant="ghost"
                  className={cn(
                    'h-auto w-full items-start justify-start gap-4 rounded-lg px-4 py-3 text-left text-sm font-medium',
                    isActive
                      ? 'bg-primary/15 text-foreground border border-primary/25'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                  )}
                >
                  <span>{item.icon}</span>
                  <span className="whitespace-normal break-words leading-snug">{item.label}</span>
                </Button>
              );
            })}

            {filteredNavItems.length === 0 && (
              <p className="px-2 py-3 text-xs text-muted-foreground">No tools matched your filter.</p>
            )}
          </nav>

          <div className="shrink-0 border-t border-border px-6 py-4">
            <p className="text-xs text-muted-foreground/70">&copy; 2026 Saverz. All Rights Reserved.</p>
          </div>
        </div>
      </aside>
    </>
  );
}
