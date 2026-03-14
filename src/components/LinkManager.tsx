import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineLink, HiOutlineArrowTopRightOnSquare } from 'react-icons/hi2';
import { useLinks, addLink, deleteLink } from '../lib/hooks';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

// Link Card
function LinkCard({ link, onDelete }: { link: { id?: number; name: string; url: string }; onDelete: (id: number) => void }) {
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(link.url).hostname)}&sz=32`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="group"
    >
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
            <img
              src={faviconUrl}
              alt=""
              className="h-5 w-5"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-sm font-medium text-foreground">{link.name}</h4>
            <p className="truncate text-xs text-muted-foreground">{link.url}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Open link"
            >
              <HiOutlineArrowTopRightOnSquare size={16} />
            </Button>
            <Button
              onClick={() => link.id && onDelete(link.id)}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              aria-label="Delete link"
            >
              <HiOutlineTrash size={16} />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Main Link Manager
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
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-2 flex items-center gap-3">
        <div className="rounded-lg border border-border bg-card p-2.5">
          <HiOutlineLink size={22} className="text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Link Manager</h2>
          <p className="text-sm text-muted-foreground">Save and organize your bookmarks</p>
        </div>
      </div>

      {/* Add form */}
      <Card>
        <CardHeader>
          <CardTitle>Add Link</CardTitle>
          <CardDescription>Store quick access links locally on your browser.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_2fr_auto]">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Name</label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="GitHub"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">URL</label>
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="https://github.com"
              />
            </div>
            <Button onClick={handleAdd} className="flex items-center justify-center gap-1.5 md:w-28">
              <HiOutlinePlus size={18} />
              <span>Add</span>
            </Button>
          </div>
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {/* Links grid */}
      {links.length === 0 ? (
        <div className="py-16 text-center">
          <HiOutlineLink size={40} className="mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No links saved yet</p>
          <p className="mt-1 text-xs text-muted-foreground/70">Add your first bookmark above</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
