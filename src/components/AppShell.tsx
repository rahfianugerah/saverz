import React from 'react';
import { useStore } from '@nanostores/react';
import { $activePage } from '../lib/stores';
import Sidebar from './Sidebar';
import PromptBuilder from './PromptBuilder';
import LinkManager from './LinkManager';
import NoteManager from './NoteManager';
import { AnimatePresence, motion } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

export default function AppShell() {
  const activePage = useStore($activePage);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-0 mt-14 md:mt-0 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {activePage === 'prompts' && <PromptBuilder />}
              {activePage === 'links' && <LinkManager />}
              {activePage === 'notes' && <NoteManager />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
