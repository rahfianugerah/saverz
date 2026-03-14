import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  HiOutlineShieldCheck,
  HiOutlineLockClosed,
  HiOutlineLockOpen,
  HiOutlineKey,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineTrash,
  HiOutlinePlus,
  HiOutlineClipboardDocument,
  HiOutlineCheck,
  HiOutlineChevronDown,
  HiOutlineArrowPath,
  HiOutlinePencilSquare,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import type { PasswordEntry, VaultRecord } from '../lib/types';
import { createVault, getPrimaryVaultRecord, saveVaultEntries, unlockVault } from '../lib/passwordVault';
import { cn } from '../lib/utils';

type VaultStatus = 'checking' | 'setup' | 'locked' | 'unlocked';

const emptyForm = {
  label: '',
  username: '',
  password: '',
  url: '',
  notes: '',
};

function sortEntries(entries: PasswordEntry[]) {
  return [...entries].sort((a, b) => b.updatedAt - a.updatedAt);
}

export default function PasswordVault() {
  const [status, setStatus] = useState<VaultStatus>('checking');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');
  const [unlockPassword, setUnlockPassword] = useState('');

  const [sessionKey, setSessionKey] = useState<CryptoKey | null>(null);
  const [record, setRecord] = useState<VaultRecord | null>(null);
  const [entries, setEntries] = useState<PasswordEntry[]>([]);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkVault = async () => {
      try {
        const existing = await getPrimaryVaultRecord();
        if (!mounted) return;

        if (existing) {
          setRecord(existing);
          setStatus('locked');
        } else {
          setStatus('setup');
        }
      } catch (unknownError) {
        if (!mounted) return;
        const message = unknownError instanceof Error ? unknownError.message : 'Unable to check vault state.';
        setError(message);
        setStatus('setup');
      }
    };

    void checkVault();

    return () => {
      mounted = false;
    };
  }, []);

  const unlockedCount = useMemo(() => entries.length, [entries.length]);

  const clearVolatileSecrets = () => {
    setSetupPassword('');
    setSetupConfirm('');
    setUnlockPassword('');
  };

  const lockVault = () => {
    setSessionKey(null);
    setEntries([]);
    setExpandedId(null);
    setVisiblePasswords(new Set());
    setEditingId(null);
    setForm(emptyForm);
    clearVolatileSecrets();
    setStatus('locked');
  };

  const persistEntries = async (nextEntries: PasswordEntry[]) => {
    if (!sessionKey || !record) {
      throw new Error('Vault session is locked. Unlock again to save changes.');
    }

    const nextRecord = await saveVaultEntries(sessionKey, record, nextEntries);
    setRecord(nextRecord);
    setEntries(sortEntries(nextEntries));
  };

  const handleCreateVault = async () => {
    if (setupPassword.length < 12) {
      setError('Master password must be at least 12 characters.');
      return;
    }

    if (setupPassword !== setupConfirm) {
      setError('Master password confirmation does not match.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const created = await createVault(setupPassword);
      setSessionKey(created.key);
      setRecord(created.record);
      setEntries([]);
      setStatus('unlocked');
      clearVolatileSecrets();
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Unable to create vault.';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const handleUnlockVault = async () => {
    if (!unlockPassword.trim()) {
      setError('Master password is required.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const unlocked = await unlockVault(unlockPassword);
      setSessionKey(unlocked.key);
      setRecord(unlocked.record);
      setEntries(sortEntries(unlocked.payload.entries));
      setStatus('unlocked');
      clearVolatileSecrets();
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Unable to unlock vault.';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const resetEntryForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSaveEntry = async () => {
    if (!form.label.trim()) {
      setError('Entry label is required.');
      return;
    }

    if (!form.password.trim()) {
      setError('Entry password is required.');
      return;
    }

    const now = Date.now();
    const current = entries.find((entry) => entry.id === editingId);

    const nextEntry: PasswordEntry = {
      id: editingId ?? crypto.randomUUID(),
      label: form.label.trim(),
      username: form.username.trim(),
      password: form.password,
      url: form.url.trim(),
      notes: form.notes.trim(),
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    };

    const nextEntries = editingId
      ? entries.map((entry) => (entry.id === editingId ? nextEntry : entry))
      : [nextEntry, ...entries];

    setBusy(true);
    setError('');

    try {
      await persistEntries(nextEntries);
      resetEntryForm();
      setExpandedId(nextEntry.id);
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Unable to save entry.';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    setBusy(true);
    setError('');

    try {
      const nextEntries = entries.filter((entry) => entry.id !== id);
      await persistEntries(nextEntries);
      if (expandedId === id) {
        setExpandedId(null);
      }
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Unable to delete entry.';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const handleEditEntry = (entry: PasswordEntry) => {
    setForm({
      label: entry.label,
      username: entry.username,
      password: entry.password,
      url: entry.url,
      notes: entry.notes,
    });
    setEditingId(entry.id);
  };

  const handleCopyPassword = async (entry: PasswordEntry) => {
    await navigator.clipboard.writeText(entry.password);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 1200);
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-border bg-card p-2.5">
            <HiOutlineShieldCheck size={22} className="text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Zero-Knowledge Password Vault</h2>
            <p className="text-sm text-muted-foreground">
              Argon2 key derivation + AES-256-GCM encryption. Master password is never stored or transmitted.
            </p>
          </div>
        </div>
        {status === 'unlocked' && (
          <Button onClick={lockVault} variant="secondary" className="gap-1.5">
            <HiOutlineLockClosed size={16} />
            Lock Vault
          </Button>
        )}
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3"
        >
          <HiOutlineExclamationTriangle size={16} className="mt-0.5 text-destructive" />
          <p className="text-xs text-destructive">{error}</p>
        </motion.div>
      )}

      {status === 'checking' && (
        <Card>
          <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <HiOutlineArrowPath className="animate-spin" size={18} />
            Checking vault state...
          </CardContent>
        </Card>
      )}

      {status === 'setup' && (
        <Card>
          <CardHeader>
            <CardTitle>Initialize Vault</CardTitle>
            <CardDescription>
              Your master password is used only to derive an in-memory encryption key and is immediately cleared.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Master Password</label>
                <Input
                  type="password"
                  value={setupPassword}
                  onChange={(event) => setSetupPassword(event.target.value)}
                  placeholder="At least 12 characters"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Confirm Password</label>
                <Input
                  type="password"
                  value={setupConfirm}
                  onChange={(event) => setSetupConfirm(event.target.value)}
                  placeholder="Re-enter master password"
                />
              </div>
            </div>
            <Button onClick={handleCreateVault} className="gap-1.5" disabled={busy}>
              <HiOutlineKey size={16} />
              {busy ? 'Initializing...' : 'Create Secure Vault'}
            </Button>
          </CardContent>
        </Card>
      )}

      {status === 'locked' && (
        <Card>
          <CardHeader>
            <CardTitle>Unlock Vault</CardTitle>
            <CardDescription>Decrypt your local vault with the master password.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Master Password</label>
              <Input
                type="password"
                value={unlockPassword}
                onChange={(event) => setUnlockPassword(event.target.value)}
                placeholder="Enter master password"
              />
            </div>
            <Button onClick={handleUnlockVault} className="gap-1.5" disabled={busy}>
              <HiOutlineLockOpen size={16} />
              {busy ? 'Unlocking...' : 'Unlock Vault'}
            </Button>
          </CardContent>
        </Card>
      )}

      {status === 'unlocked' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? 'Edit Password Entry' : 'New Password Entry'}</CardTitle>
              <CardDescription>
                Store credentials in encrypted local storage. Entry count: {unlockedCount}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Label</label>
                  <Input
                    value={form.label}
                    onChange={(event) => setForm((previous) => ({ ...previous, label: event.target.value }))}
                    placeholder="GitHub"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Username</label>
                  <Input
                    value={form.username}
                    onChange={(event) => setForm((previous) => ({ ...previous, username: event.target.value }))}
                    placeholder="username or email"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Password</label>
                  <Input
                    type="text"
                    value={form.password}
                    onChange={(event) => setForm((previous) => ({ ...previous, password: event.target.value }))}
                    placeholder="Strong credential"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">URL</label>
                  <Input
                    value={form.url}
                    onChange={(event) => setForm((previous) => ({ ...previous, url: event.target.value }))}
                    placeholder="https://example.com"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Notes</label>
                <Textarea
                  value={form.notes}
                  onChange={(event) => setForm((previous) => ({ ...previous, notes: event.target.value }))}
                  rows={3}
                  className="resize-y"
                  placeholder="Recovery notes, MFA hints, or account details"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={handleSaveEntry} className="gap-1.5" disabled={busy}>
                  {editingId ? <HiOutlinePencilSquare size={16} /> : <HiOutlinePlus size={16} />}
                  {editingId ? 'Update Entry' : 'Save Entry'}
                </Button>
                {editingId && (
                  <Button onClick={resetEntryForm} variant="ghost" disabled={busy}>
                    Cancel Edit
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Encrypted Entries</CardTitle>
              <CardDescription>Expand an entry to reveal details and actions.</CardDescription>
            </CardHeader>
            <CardContent>
              {entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No entries yet. Add your first credential above.</p>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {entries.map((entry) => {
                      const expanded = expandedId === entry.id;
                      const visiblePassword = visiblePasswords.has(entry.id);

                      return (
                        <motion.div
                          key={entry.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="overflow-hidden rounded-lg border border-border bg-background/60"
                        >
                          <button
                            type="button"
                            onClick={() => setExpandedId(expanded ? null : entry.id)}
                            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">{entry.label}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {entry.username || 'No username'}
                              </p>
                            </div>
                            <HiOutlineChevronDown
                              size={16}
                              className={cn('shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-180')}
                            />
                          </button>

                          <AnimatePresence initial={false}>
                            {expanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="border-t border-border px-4 py-3"
                              >
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                  <div>
                                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">Username</p>
                                    <p className="text-sm text-foreground/90">{entry.username || '-'}</p>
                                  </div>
                                  <div>
                                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">URL</p>
                                    <p className="truncate text-sm text-foreground/90">{entry.url || '-'}</p>
                                  </div>
                                  <div className="md:col-span-2">
                                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">Password</p>
                                    <div className="mt-1 flex items-center gap-2">
                                      <Input
                                        readOnly
                                        value={entry.password}
                                        type={visiblePassword ? 'text' : 'password'}
                                        className="h-9 flex-1"
                                      />
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9"
                                        onClick={() => togglePasswordVisibility(entry.id)}
                                        aria-label={visiblePassword ? 'Hide password' : 'Show password'}
                                      >
                                        {visiblePassword ? <HiOutlineEyeSlash size={16} /> : <HiOutlineEye size={16} />}
                                      </Button>
                                    </div>
                                  </div>
                                  {entry.notes && (
                                    <div className="md:col-span-2">
                                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">Notes</p>
                                      <p className="mt-1 text-sm text-foreground/90">{entry.notes}</p>
                                    </div>
                                  )}
                                </div>

                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                  <Button
                                    onClick={() => handleCopyPassword(entry)}
                                    variant="secondary"
                                    size="sm"
                                    className="gap-1.5"
                                  >
                                    {copiedId === entry.id ? (
                                      <HiOutlineCheck size={14} className="text-primary" />
                                    ) : (
                                      <HiOutlineClipboardDocument size={14} />
                                    )}
                                    {copiedId === entry.id ? 'Copied' : 'Copy Password'}
                                  </Button>
                                  <Button
                                    onClick={() => handleEditEntry(entry)}
                                    variant="ghost"
                                    size="sm"
                                    className="gap-1.5"
                                  >
                                    <HiOutlinePencilSquare size={14} />
                                    Edit
                                  </Button>
                                  <Button
                                    onClick={() => handleDeleteEntry(entry.id)}
                                    variant="ghost"
                                    size="sm"
                                    className="gap-1.5 text-destructive"
                                  >
                                    <HiOutlineTrash size={14} />
                                    Delete
                                  </Button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
