import React from 'react';
import { useStore } from '@nanostores/react';
import { $activePage, $desktopSidebarOpen } from '../lib/stores';
import Sidebar from './Sidebar';
import PromptBuilder from './PromptBuilder';
import LinkManager from './LinkManager';
import NoteManager from './NoteManager';
import Tokenizer from './Tokenizer';
import DataFormatter from './DataFormatter';
import ToonFormatter from './ToonFormatter';
import PasswordVault from './PasswordVault';
import { HiOutlineBars3 } from 'react-icons/hi2';
import { Button } from './ui/button';

export default function AppShell() {
  const activePage = useStore($activePage);
  const desktopSidebarOpen = useStore($desktopSidebarOpen);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col md:ml-0 mt-14 md:mt-0 overflow-y-auto">
        {!desktopSidebarOpen && (
          <div className="hidden h-16 items-center px-6 pt-6 md:flex">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => $desktopSidebarOpen.set(true)}
              aria-label="Open Sidebar"
            >
              <HiOutlineBars3 size={22} />
            </Button>
          </div>
        )}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-10 w-full flex-1">
          <div key={activePage}>
            {activePage === 'prompts' && <PromptBuilder />}
            {activePage === 'data-formatter' && <DataFormatter />}
            {activePage === 'toon-formatter' && <ToonFormatter />}
            {activePage === 'links' && <LinkManager />}
            {activePage === 'notes' && <NoteManager />}
            {activePage === 'tokenizer' && <Tokenizer />}
            {activePage === 'password-vault' && <PasswordVault />}
          </div>
        </div>
      </main>
    </div>
  );
}
