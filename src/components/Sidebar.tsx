import React from 'react';
import { useStore } from '@nanostores/react';
import { $activePage, $sidebarOpen, $desktopSidebarOpen, type ActivePage } from '../lib/stores';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineCommandLine, HiOutlineLink, HiOutlineDocumentText, HiOutlineBars3, HiOutlineXMark, HiOutlineSparkles, HiOutlineChevronDoubleLeft } from 'react-icons/hi2';
import { cn } from '../lib/utils';
import { Button } from './ui/button';

const navItems: { id: ActivePage; label: string; icon: React.ReactNode }[] = [
  { id: 'prompts', label: 'Prompts', icon: <HiOutlineCommandLine size={20} /> },
  { id: 'links', label: 'Links', icon: <HiOutlineLink size={20} /> },
  { id: 'notes', label: 'Notes', icon: <HiOutlineDocumentText size={20} /> },
  { id: 'tokenizer', label: 'Tokenizer', icon: <HiOutlineSparkles size={20} /> },
];

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
      {/* Mobile header */}
      <header className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-border bg-card/90 px-4 py-3 backdrop-blur md:hidden">
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

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => $sidebarOpen.set(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-border bg-card transition-all duration-300 ease-in-out',
          'md:sticky md:top-0 md:z-auto md:shrink-0 overflow-hidden',
          sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64 md:translate-x-0',
          desktopSidebarOpen ? 'md:w-64' : 'md:w-0 md:border-none md:opacity-0'
        )}
      >
        <div className="w-64 flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between border-b border-border px-6 py-6 shrink-0">
            <div>
              <h1 className="text-xl font-bold tracking-[0.24em] text-foreground">SAVERZ</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">Smart Archive Vault for Every Resource Zone</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => $desktopSidebarOpen.set(false)}
              className="hidden md:flex h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Close Sidebar"
            >
              <HiOutlineChevronDoubleLeft size={18} />
            </Button>
          </div>

          {/* Nav items */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => (
              <Button
                key={item.id}
                onClick={() => handleNav(item.id)}
                variant="ghost"
                className={cn(
                  'relative h-auto w-full justify-start gap-4 rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:bg-accent/70',
                  activePage === item.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {activePage === item.id && (
                  <motion.span
                    layoutId="active-nav-pill"
                    className="absolute inset-0 rounded-lg border border-primary/20 bg-primary/15"
                    transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{item.icon}</span>
                <span className="relative z-10">{item.label}</span>
              </Button>
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t border-border px-6 py-4 shrink-0">
            <p className="text-xs text-muted-foreground/70"> &copy; 2026 Saverz. All Rights Reserved.</p>
          </div>
        </div>
      </aside>
    </>
  );
}
