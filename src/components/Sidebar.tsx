import React from 'react';
import { useStore } from '@nanostores/react';
import { $activePage, $desktopSidebarOpen, $sidebarOpen, type ActivePage } from '../lib/stores';
import {
  HiOutlineBars3,
  HiOutlineCodeBracket,
  HiOutlineCommandLine,
  HiOutlineCubeTransparent,
  HiOutlineDocumentText,
  HiOutlineLink,
  HiOutlineLockClosed,
  HiOutlineSparkles,
} from 'react-icons/hi2';
import { cn } from '../lib/utils';
import { Button } from './ui/button';

const navItems: { id: ActivePage; label: string; icon: React.ReactNode }[] = [
  { id: 'data-formatter', label: 'Data Formatter', icon: <HiOutlineCodeBracket size={20} /> },
  { id: 'links', label: 'Links', icon: <HiOutlineLink size={20} /> },
  { id: 'notes', label: 'Notes', icon: <HiOutlineDocumentText size={20} /> },
  { id: 'password-vault', label: 'Password Vault', icon: <HiOutlineLockClosed size={20} /> },
  { id: 'prompts', label: 'Prompts', icon: <HiOutlineCommandLine size={20} /> },
  { id: 'toon-formatter', label: 'TOON Formatter', icon: <HiOutlineCubeTransparent size={20} /> },
  { id: 'tokenizer', label: 'Tokenizer', icon: <HiOutlineSparkles size={20} /> },
];

function HamburgerIcon({ open, className }: { open: boolean; className?: string }) {
  return (
    <span className={cn('relative block h-4 w-5', className)} aria-hidden="true">
      <span
        className={cn(
          'absolute left-0 top-0 block h-0.5 w-5 rounded-full bg-current transition-transform duration-200',
          open && 'translate-y-[7px] rotate-45'
        )}
      />
      <span
        className={cn(
          'absolute left-0 top-[7px] block h-0.5 w-5 rounded-full bg-current transition-opacity duration-200',
          open ? 'opacity-0' : 'opacity-100'
        )}
      />
      <span
        className={cn(
          'absolute bottom-0 left-0 block h-0.5 w-5 rounded-full bg-current transition-transform duration-200',
          open && '-translate-y-[7px] -rotate-45'
        )}
      />
    </span>
  );
}

export default function Sidebar() {
  const activePage = useStore($activePage);
  const sidebarOpen = useStore($sidebarOpen);
  const desktopSidebarOpen = useStore($desktopSidebarOpen);

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
          <HamburgerIcon open={sidebarOpen} />
        </Button>
      </header>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => $sidebarOpen.set(false)} />}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen flex-col overflow-hidden border-border bg-card transition-transform duration-200',
          'md:sticky md:top-0 md:z-auto md:shrink-0',
          sidebarOpen ? 'translate-x-0 w-64 border-r' : '-translate-x-full w-64 md:translate-x-0',
          desktopSidebarOpen ? 'md:w-64 md:border-r md:pointer-events-auto' : 'md:w-0 md:border-transparent md:pointer-events-none'
        )}
      >
        <div className="w-64 h-full flex flex-col">
          <div className="flex items-center justify-between border-b border-border px-6 py-6">
            <div>
              <h1 className="text-xl font-bold tracking-[0.24em] text-foreground">SAVERZ</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">Smart Archive Vault for Every Resource Zone</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => $desktopSidebarOpen.set(false)}
              className="hidden h-8 w-8 text-muted-foreground hover:text-foreground md:flex"
              aria-label="Close Sidebar"
            >
              <HamburgerIcon open={desktopSidebarOpen} className="h-3.5 w-4" />
            </Button>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <Button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  variant="ghost"
                  className={cn(
                    'h-auto w-full justify-start gap-4 rounded-lg px-4 py-3 text-sm font-medium',
                    isActive
                      ? 'bg-primary/15 text-foreground border border-primary/25'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                  )}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Button>
              );
            })}
          </nav>

          <div className="border-t border-border px-6 py-4">
            <p className="text-xs text-muted-foreground/70">&copy; 2026 Saverz. All Rights Reserved.</p>
          </div>
        </div>
      </aside>
    </>
  );
}
