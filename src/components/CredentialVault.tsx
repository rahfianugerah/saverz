import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  HiOutlineArrowPath,
  HiOutlineCheck,
  HiOutlineChevronDown,
  HiOutlineClipboardDocument,
  HiOutlineExclamationTriangle,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineKey,
  HiOutlineLockClosed,
  HiOutlineLockOpen,
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlineShieldCheck,
  HiOutlineTrash,
} from 'react-icons/hi2';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import type { CredentialEntry, VaultRecord } from '../lib/types';
import {
  createCredentialVault,
  getCredentialVaultRecord,
  resetCredentialVault,
  saveCredentialEntries,
  unlockCredentialVault,
} from '../lib/credentialVault';
import { cn } from '../lib/utils';

type VaultStatus = 'checking' | 'setup' | 'locked' | 'unlocked';

interface CredentialFormState {
  label: string;
  key: string;
  value: string;
  vendorTag: string;
}

const emptyForm: CredentialFormState = {
  label: '',
  key: '',
  value: '',
  vendorTag: '',
};

function sortEntries(entries: CredentialEntry[]) {
  return [...entries].sort((a, b) => b.updatedAt - a.updatedAt);
}

function normalizeEntry(entry: Partial<CredentialEntry> & { id: string }): CredentialEntry {
  return {
    id: entry.id,
    label: (entry.label ?? '').trim() || 'Untitled Secret',
    key: (entry.key ?? '').trim(),
    value: entry.value ?? '',
    vendorTag: (entry.vendorTag ?? '').trim(),
    createdAt: entry.createdAt ?? Date.now(),
    updatedAt: entry.updatedAt ?? Date.now(),
  };
}

export default function CredentialVault() {
  const [status, setStatus] = useState<VaultStatus>('checking');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');
  const [unlockPassword, setUnlockPassword] = useState('');

  const [record, setRecord] = useState<VaultRecord | null>(null);
  const [entries, setEntries] = useState<CredentialEntry[]>([]);

  const keyRef = useRef<CryptoKey | null>(null);
  const recordRef = useRef<VaultRecord | null>(null);

  const [form, setForm] = useState<CredentialFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFormValue, setShowFormValue] = useState(false);
  const [visibleValues, setVisibleValues] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkVault = async () => {
      try {
        const existing = await getCredentialVaultRecord();
        if (!mounted) return;

        if (existing) {
          setRecord(existing);
          recordRef.current = existing;
          setStatus('locked');
        } else {
          setStatus('setup');
        }
      } catch (unknownError) {
        if (!mounted) return;
        const message = unknownError instanceof Error ? unknownError.message : 'Unable to check credential vault state.';
        setError(message);
        setStatus('setup');
      }
    };

    void checkVault();

    return () => {
      mounted = false;
    };
  }, []);

  const clearSecrets = () => {
    setSetupPassword('');
    setSetupConfirm('');
    setUnlockPassword('');
  };

  const lockVault = () => {
    keyRef.current = null;
    setRecord(null);
    recordRef.current = null;
    setEntries([]);
    setExpandedId(null);
    setVisibleValues(new Set());
    setEditingId(null);
    setForm(emptyForm);
    setShowFormValue(false);
    setConfirmReset(false);
    clearSecrets();
    setStatus('locked');
  };

  const persistEntries = async (nextEntries: CredentialEntry[]) => {
    const currentKey = keyRef.current;
    const currentRecord = recordRef.current;

    if (!currentKey || !currentRecord) {
      throw new Error('Credential vault is locked. Unlock again to save changes.');
    }

    const normalizedEntries = nextEntries.map((entry) => normalizeEntry(entry));
    const nextRecord = await saveCredentialEntries(currentKey, currentRecord, normalizedEntries);

    recordRef.current = nextRecord;
    setRecord(nextRecord);
    setEntries(sortEntries(normalizedEntries));
  };

  const handleCreateVault = async () => {
    if (busy) return;

    if (!setupPassword) {
      setError('Master password is required.');
      return;
    }

    if (setupPassword !== setupConfirm) {
      setError('Master password confirmation does not match.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const created = await createCredentialVault(setupPassword);
      keyRef.current = created.key;
      setRecord(created.record);
      recordRef.current = created.record;
      setEntries([]);
      setStatus('unlocked');
      clearSecrets();
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Unable to create credential vault.';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const handleUnlockVault = async () => {
    if (busy) return;

    if (!unlockPassword) {
      setError('Master password is required.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const unlocked = await unlockCredentialVault(unlockPassword);
      keyRef.current = unlocked.key;
      setRecord(unlocked.record);
      recordRef.current = unlocked.record;
      setEntries(sortEntries(unlocked.payload.entries.map((entry) => normalizeEntry(entry))));
      setStatus('unlocked');
      clearSecrets();
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Unable to unlock credential vault.';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const handleResetVault = async () => {
    if (busy) return;

    setBusy(true);
    setError('');

    try {
      await resetCredentialVault();
      keyRef.current = null;
      setRecord(null);
      recordRef.current = null;
      setEntries([]);
      setExpandedId(null);
      setVisibleValues(new Set());
      setEditingId(null);
      setForm(emptyForm);
      setShowFormValue(false);
      setConfirmReset(false);
      clearSecrets();
      setStatus('setup');
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Unable to reset credential vault.';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowFormValue(false);
  };

  const handleSaveEntry = async () => {
    if (busy) return;

    if (!form.label.trim()) {
      setError('Label is required.');
      return;
    }

    if (!form.key.trim()) {
      setError('Key is required.');
      return;
    }

    if (!form.value) {
      setError('Secret value is required.');
      return;
    }

    const now = Date.now();
    const current = entries.find((entry) => entry.id === editingId);

    const nextEntry: CredentialEntry = {
      id: editingId ?? crypto.randomUUID(),
      label: form.label.trim(),
      key: form.key.trim(),
      value: form.value,
      vendorTag: form.vendorTag.trim(),
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
      resetForm();
      setExpandedId(nextEntry.id);
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Unable to save credential.';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (busy) return;

    setBusy(true);
    setError('');

    try {
      const nextEntries = entries.filter((entry) => entry.id !== id);
      await persistEntries(nextEntries);
      if (expandedId === id) {
        setExpandedId(null);
      }
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Unable to delete credential.';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const handleEditEntry = (entry: CredentialEntry) => {
    setForm({
      label: entry.label,
      key: entry.key,
      value: entry.value,
      vendorTag: entry.vendorTag,
    });
    setEditingId(entry.id);
    setShowFormValue(false);
  };

  const handleCopyValue = async (entry: CredentialEntry) => {
    await navigator.clipboard.writeText(entry.value);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 1000);
  };

  const toggleVisibility = (id: string) => {
    setVisibleValues((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const entryCount = useMemo(() => entries.length, [entries.length]);

  return (
    <div className="space-y-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-border bg-card p-2.5">
            <HiOutlineShieldCheck size={22} className="text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Permanent Credential Vault</h2>
            <p className="text-sm text-muted-foreground">
              Store API keys, client secrets, and environment values permanently with local AES-256-GCM encryption.
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
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
          <HiOutlineExclamationTriangle size={16} className="mt-0.5 text-destructive" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {status === 'checking' && (
        <Card>
          <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <HiOutlineArrowPath size={18} />
            Checking credential vault state...
          </CardContent>
        </Card>
      )}

      {status === 'setup' && (
        <Card>
          <CardHeader>
            <CardTitle>Initialize Credential Vault</CardTitle>
            <CardDescription>Create a local-only master password to encrypt stored secrets.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Master Password</label>
                <Input
                  type="password"
                  value={setupPassword}
                  onChange={(event) => setSetupPassword(event.target.value)}
                  placeholder="Choose your master password"
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
              {busy ? 'Initializing...' : 'Create Credential Vault'}
            </Button>
          </CardContent>
        </Card>
      )}

      {status === 'locked' && (
        <Card>
          <CardHeader>
            <CardTitle>Unlock Credential Vault</CardTitle>
            <CardDescription>If forgotten, reset is the only option and will erase all credential entries.</CardDescription>
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

            <div className="border-t border-border pt-4">
              {!confirmReset ? (
                <Button
                  onClick={() => setConfirmReset(true)}
                  variant="ghost"
                  className="gap-1.5 text-destructive"
                  disabled={busy}
                >
                  <HiOutlineTrash size={16} />
                  Forgot Password? Reset Credential Vault
                </Button>
              ) : (
                <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                  <p className="text-xs text-destructive">This will permanently erase all saved credentials.</p>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleResetVault} variant="destructive" size="sm" disabled={busy}>
                      Confirm Reset and Erase
                    </Button>
                    <Button onClick={() => setConfirmReset(false)} variant="ghost" size="sm" disabled={busy}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {status === 'unlocked' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? 'Edit Credential' : 'New Credential'}</CardTitle>
              <CardDescription>Stored entries: {entryCount}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Label</label>
                  <Input
                    value={form.label}
                    onChange={(event) => setForm((previous) => ({ ...previous, label: event.target.value }))}
                    placeholder="Production OpenAI Key"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Key</label>
                  <Input
                    value={form.key}
                    onChange={(event) => setForm((previous) => ({ ...previous, key: event.target.value }))}
                    placeholder="OPENAI_API_KEY"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Value</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type={showFormValue ? 'text' : 'password'}
                      value={form.value}
                      onChange={(event) => setForm((previous) => ({ ...previous, value: event.target.value }))}
                      placeholder="Paste secret value"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setShowFormValue((current) => !current)}
                      aria-label={showFormValue ? 'Mask value' : 'Unmask value'}
                    >
                      {showFormValue ? <HiOutlineEyeSlash size={16} /> : <HiOutlineEye size={16} />}
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Vendor/Service</label>
                  <Input
                    value={form.vendorTag}
                    onChange={(event) => setForm((previous) => ({ ...previous, vendorTag: event.target.value }))}
                    placeholder="GitHub / AWS / Stripe"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={handleSaveEntry} className="gap-1.5" disabled={busy}>
                  {editingId ? <HiOutlinePencilSquare size={16} /> : <HiOutlinePlus size={16} />}
                  {editingId ? 'Update Credential' : 'Save Credential'}
                </Button>
                {editingId && (
                  <Button onClick={resetForm} variant="ghost" disabled={busy}>
                    Cancel Edit
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stored Credentials</CardTitle>
              <CardDescription>Click a value to copy quickly for local development.</CardDescription>
            </CardHeader>
            <CardContent>
              {entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No credentials yet. Save your first secret above.</p>
              ) : (
                <div className="space-y-3">
                  {entries.map((entry) => {
                    const expanded = expandedId === entry.id;
                    const visible = visibleValues.has(entry.id);

                    return (
                      <div key={entry.id} className="overflow-hidden rounded-lg border border-border bg-background/60">
                        <button
                          type="button"
                          onClick={() => setExpandedId(expanded ? null : entry.id)}
                          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{entry.label}</p>
                            <p className="truncate text-xs text-muted-foreground">{entry.vendorTag || entry.key}</p>
                          </div>
                          <HiOutlineChevronDown size={16} className={cn('shrink-0 text-muted-foreground', expanded && 'rotate-180')} />
                        </button>

                        {expanded && (
                          <div className="border-t border-border px-4 py-3">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                              <div>
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">Label</p>
                                <p className="text-sm text-foreground/90">{entry.label}</p>
                              </div>
                              <div>
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">Vendor/Service</p>
                                <p className="text-sm text-foreground/90">{entry.vendorTag || '-'}</p>
                              </div>
                              <div className="md:col-span-2">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">Key</p>
                                <p className="text-sm text-foreground/90">{entry.key}</p>
                              </div>
                              <div className="md:col-span-2">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">Value</p>
                                <div className="mt-1 flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleCopyValue(entry)}
                                    className="h-9 flex-1 truncate rounded-md border border-input bg-background px-3 text-left font-mono text-sm text-foreground hover:border-primary/40"
                                    title="Click to copy"
                                  >
                                    {visible ? entry.value : '•'.repeat(Math.max(8, Math.min(32, entry.value.length || 8)))}
                                  </button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9"
                                    onClick={() => toggleVisibility(entry.id)}
                                    aria-label={visible ? 'Mask value' : 'Unmask value'}
                                  >
                                    {visible ? <HiOutlineEyeSlash size={16} /> : <HiOutlineEye size={16} />}
                                  </Button>
                                </div>
                                {copiedId === entry.id && (
                                  <p className="mt-1 text-xs text-primary">Copied to clipboard</p>
                                )}
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-2">
                              <Button onClick={() => handleEditEntry(entry)} variant="ghost" size="sm" className="gap-1.5">
                                <HiOutlinePencilSquare size={14} />
                                Edit
                              </Button>
                              <Button onClick={() => handleCopyValue(entry)} variant="secondary" size="sm" className="gap-1.5">
                                <HiOutlineClipboardDocument size={14} />
                                Copy Value
                              </Button>
                              <Button onClick={() => handleDeleteEntry(entry.id)} variant="ghost" size="sm" className="gap-1.5 text-destructive">
                                <HiOutlineTrash size={14} />
                                Delete
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
