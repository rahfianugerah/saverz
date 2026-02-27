import React from 'react';
import { useStore } from '@nanostores/react';
import { $activePage, $sidebarOpen, type ActivePage } from '../lib/stores';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineCommandLine, HiOutlineLink, HiOutlineDocumentText, HiOutlineBars3, HiOutlineXMark } from 'react-icons/hi2';
import clsx from 'clsx';

const navItems: { id: ActivePage; label: string; icon: React.ReactNode }[] = [
  { id: 'prompts', label: 'Prompts', icon: <HiOutlineCommandLine size={20} /> },
  { id: 'links', label: 'Links', icon: <HiOutlineLink size={20} /> },
  { id: 'notes', label: 'Notes', icon: <HiOutlineDocumentText size={20} /> },
];

export default function Sidebar() {
  const activePage = useStore($activePage);
  const sidebarOpen = useStore($sidebarOpen);

  const handleNav = (page: ActivePage) => {
    $activePage.set(page);
    $sidebarOpen.set(false);
  };

  return (
    <>
      {/* Mobile header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 glass px-4 py-3 flex items-center justify-between">
        <span className="text-lg font-bold tracking-widest text-foreground">SVRZ</span>
        <button
          onClick={() => $sidebarOpen.set(!sidebarOpen)}
          className="btn-ghost p-2"
          aria-label="Toggle menu"
        >
          {sidebarOpen ? <HiOutlineXMark size={22} /> : <HiOutlineBars3 size={22} />}
        </button>
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
        className={clsx(
          'fixed top-0 left-0 z-50 h-screen w-64 bg-surface border-r border-border flex flex-col transition-transform duration-300 ease-in-out',
          'md:translate-x-0 md:sticky md:top-0 md:z-auto md:shrink-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="px-6 py-6 border-b border-border">
          <h1 className="text-xl font-bold tracking-[0.3em] text-foreground">SAVERZ</h1>
          <p className="text-xs text-muted mt-0.5">Smart Archive Vault for Every Resource Zone</p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={clsx(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                activePage === item.id
                  ? 'bg-accent/15 text-accent border border-accent/20'
                  : 'text-muted hover:text-foreground hover:bg-surface-hover border border-transparent'
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border">
          <p className="text-xs text-muted/50">Local-first • No cloud</p>
        </div>
      </aside>
    </>
  );
}
