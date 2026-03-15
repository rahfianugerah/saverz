import React, { useEffect, useMemo, useState } from 'react';
import {
  HiOutlineCommandLine,
  HiOutlineMagnifyingGlass,
  HiOutlineClipboardDocument,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineCheck,
} from 'react-icons/hi2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';

interface CommandEntry {
  id: string;
  title: string;
  command: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'boxul:command-vault:v1';

function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

export default function CommandVault() {
  const [entries, setEntries] = useState<CommandEntry[]>([]);
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [command, setCommand] = useState('');
  const [tags, setTags] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as CommandEntry[];
      if (Array.isArray(parsed)) {
        setEntries(parsed);
      }
    } catch {
      setEntries([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return entries;

    return entries.filter((entry) => {
      const haystack = [entry.title, entry.command, entry.tags.join(' ')].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [entries, search]);

  const resetForm = () => {
    setTitle('');
    setCommand('');
    setTags('');
    setEditingId(null);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextTitle = title.trim();
    const nextCommand = command.trim();
    if (!nextTitle || !nextCommand) return;

    const now = Date.now();
    const tagList = parseTags(tags);

    if (editingId) {
      setEntries((current) =>
        current.map((entry) =>
          entry.id === editingId
            ? {
                ...entry,
                title: nextTitle,
                command: nextCommand,
                tags: tagList,
                updatedAt: now,
              }
            : entry
        )
      );
      resetForm();
      return;
    }

    const newEntry: CommandEntry = {
      id: crypto.randomUUID(),
      title: nextTitle,
      command: nextCommand,
      tags: tagList,
      createdAt: now,
      updatedAt: now,
    };

    setEntries((current) => [newEntry, ...current]);
    resetForm();
  };

  const handleEdit = (entry: CommandEntry) => {
    setEditingId(entry.id);
    setTitle(entry.title);
    setCommand(entry.command);
    setTags(entry.tags.join(', '));
  };

  const handleDelete = (id: string) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
    if (editingId === id) {
      resetForm();
    }
  };

  const handleCopy = async (entry: CommandEntry) => {
    await navigator.clipboard.writeText(entry.command);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 1200);
  };

  return (
    <div className="space-y-6">
      <div className="mb-2 flex items-center gap-3">
        <div className="rounded-lg border border-border bg-card p-2.5">
          <HiOutlineCommandLine size={22} className="text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">CLI Command Saver</h2>
          <p className="text-sm text-muted-foreground">
            Store terminal snippets, tag them, and copy instantly from your browser vault.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Edit Command' : 'Add Command'}</CardTitle>
          <CardDescription>Saved locally in your browser with no external service.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={handleSubmit}>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Title (e.g. Docker prune all)"
            />
            <Textarea
              rows={4}
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              placeholder="Command (e.g. docker system prune -a --volumes)"
              className="font-mono"
            />
            <Input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="Tags, comma separated (docker, cleanup, infra)"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={!title.trim() || !command.trim()}>
                {editingId ? 'Update Command' : 'Save Command'}
              </Button>
              {editingId && (
                <Button type="button" variant="ghost" onClick={resetForm}>
                  Cancel Edit
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Command Vault</CardTitle>
          <CardDescription>Search by title, command text, or tags.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <HiOutlineMagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search command vault..."
              className="pl-9"
            />
          </div>

          {filteredEntries.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-background/40 p-8 text-center text-sm text-muted-foreground">
              No matching commands yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {filteredEntries.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-border bg-background/35 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{entry.title}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">Updated {formatDate(entry.updatedAt)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5"
                        onClick={() => handleCopy(entry)}
                        title="Copy command"
                      >
                        {copiedId === entry.id ? <HiOutlineCheck size={14} /> : <HiOutlineClipboardDocument size={14} />}
                        {copiedId === entry.id ? 'Copied' : 'Copy'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleEdit(entry)}
                        title="Edit command"
                      >
                        <HiOutlinePencilSquare size={15} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive"
                        onClick={() => handleDelete(entry.id)}
                        title="Delete command"
                      >
                        <HiOutlineTrash size={15} />
                      </Button>
                    </div>
                  </div>

                  <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-card/70 p-3 text-xs text-foreground/95">
                    <code>{entry.command}</code>
                  </pre>

                  {entry.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {entry.tags.map((tag) => (
                        <span
                          key={`${entry.id}-${tag}`}
                          className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
