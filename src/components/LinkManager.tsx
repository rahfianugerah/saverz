import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineLink, HiOutlineArrowTopRightOnSquare } from 'react-icons/hi2';
import { useLinks, addLink, deleteLink } from '../lib/hooks';

// ── Link Card ──────────────────────────────────────────
function LinkCard({ link, onDelete }: { link: { id?: number; name: string; url: string }; onDelete: (id: number) => void }) {
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(link.url).hostname)}&sz=32`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="card group flex items-center gap-4"
    >
      <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center shrink-0 overflow-hidden">
        <img
          src={faviconUrl}
          alt=""
          className="w-5 h-5"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="font-medium text-foreground text-sm truncate">{link.name}</h4>
        <p className="text-xs text-muted truncate">{link.url}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost p-2"
          aria-label="Open link"
        >
          <HiOutlineArrowTopRightOnSquare size={16} />
        </a>
        <button
          onClick={() => link.id && onDelete(link.id)}
          className="btn-ghost p-2 text-danger"
          aria-label="Delete link"
        >
          <HiOutlineTrash size={16} />
        </button>
      </div>
    </motion.div>
  );
}

// ── Main Link Manager ──────────────────────────────────
export default function LinkManager() {
  const links = useLinks();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const isValidUrl = (str: string) => {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  };

  const handleAdd = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    let finalUrl = url.trim();
    if (finalUrl && !finalUrl.startsWith('http')) {
      finalUrl = 'https://' + finalUrl;
    }
    if (!finalUrl || !isValidUrl(finalUrl)) {
      setError('Please enter a valid URL');
      return;
    }
    setError('');
    await addLink({ name: name.trim(), url: finalUrl });
    setName('');
    setUrl('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  const handleDelete = async (id: number) => {
    await deleteLink(id);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 bg-accent/15 rounded-xl">
          <HiOutlineLink size={22} className="text-accent" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Link Manager</h2>
          <p className="text-sm text-muted">Save and organize your bookmarks</p>
        </div>
      </div>

      {/* Add form */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="GitHub"
              className="input-field text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://github.com"
              className="input-field text-sm"
            />
          </div>
          <button onClick={handleAdd} className="btn-primary flex items-center justify-center gap-1.5 h-[42px]">
            <HiOutlinePlus size={18} />
            <span className="md:hidden lg:inline">Add</span>
          </button>
        </div>
        {error && <p className="text-xs text-danger mt-2">{error}</p>}
      </div>

      {/* Links grid */}
      {links.length === 0 ? (
        <div className="text-center py-16">
          <HiOutlineLink size={40} className="text-muted/30 mx-auto mb-3" />
          <p className="text-muted text-sm">No links saved yet</p>
          <p className="text-muted/60 text-xs mt-1">Add your first bookmark above</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AnimatePresence>
            {links.map((link) => (
              <LinkCard key={link.id} link={link} onDelete={handleDelete} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
