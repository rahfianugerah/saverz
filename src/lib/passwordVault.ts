import { db } from './db';
import type { PasswordEntry, VaultPayload, VaultRecord } from './types';

const PRIMARY_VAULT_ID = 'primary';
const KDF_TIME_COST = 3;
const KDF_MEMORY_COST = 65536;
const KDF_PARALLELISM = 1;
const KDF_HASH_LENGTH = 32;
const PBKDF2_ITERATIONS = 210000;

type VaultKdf = VaultRecord['kdf'];

function toBase64(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toStrictArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return copy.buffer;
}

interface Argon2ModuleRef {
  hash?: (options: Record<string, unknown>) => Promise<{ hash: Uint8Array | ArrayBuffer }>;
  ArgonType?: { Argon2id: number };
  default?: {
    hash?: (options: Record<string, unknown>) => Promise<{ hash: Uint8Array | ArrayBuffer }>;
    ArgonType?: { Argon2id: number };
  };
}

async function loadArgon2() {
  const tryMain = async () => {
    const moduleRef = (await import('argon2-browser')) as unknown as Argon2ModuleRef;
    const hashFn = moduleRef.hash ?? moduleRef.default?.hash;
    const argonType = moduleRef.ArgonType?.Argon2id ?? moduleRef.default?.ArgonType?.Argon2id ?? 2;

    if (!hashFn) {
      throw new Error('argon2-browser main entry has no hash() function.');
    }

    return { hashFn, argonType };
  };

  const tryBundled = async () => {
    // Fallback bundled build because some Vite/WASM setups fail on package main entry.
    const bundledRef = (await import('argon2-browser/dist/argon2-bundled.min.js')) as unknown as Argon2ModuleRef;
    const globalArgon2 = (globalThis as unknown as { argon2?: Argon2ModuleRef }).argon2;

    const hashFn = bundledRef.hash ?? bundledRef.default?.hash ?? globalArgon2?.hash;
    const argonType = bundledRef.ArgonType?.Argon2id
      ?? bundledRef.default?.ArgonType?.Argon2id
      ?? globalArgon2?.ArgonType?.Argon2id
      ?? 2;

    if (!hashFn) {
      throw new Error('argon2-browser bundled entry has no hash() function.');
    }

    return { hashFn, argonType };
  };

  try {
    return await tryMain();
  } catch {
    return tryBundled();
  }
}

async function argon2Hash(masterPassword: string, salt: Uint8Array): Promise<Uint8Array> {
  const { hashFn, argonType } = await loadArgon2();

  const result = await hashFn({
    pass: masterPassword,
    salt: toBase64(salt),
    time: KDF_TIME_COST,
    mem: KDF_MEMORY_COST,
    parallelism: KDF_PARALLELISM,
    hashLen: KDF_HASH_LENGTH,
    type: argonType,
  });

  const hash = result.hash;
  return hash instanceof Uint8Array ? hash : new Uint8Array(hash);
}

async function pbkdf2Hash(masterPassword: string, salt: Uint8Array): Promise<Uint8Array> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(masterPassword),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: toStrictArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
    },
    material,
    256
  );

  return new Uint8Array(bits);
}

async function importAesKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', toStrictArrayBuffer(rawKey), { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

async function deriveAesKey(masterPassword: string, salt: Uint8Array, kdf: VaultKdf, allowFallback: boolean): Promise<{ key: CryptoKey; kdf: VaultKdf }> {
  if (kdf === 'pbkdf2-sha256') {
    const derived = await pbkdf2Hash(masterPassword, salt);
    return { key: await importAesKey(derived), kdf: 'pbkdf2-sha256' };
  }

  try {
    const derived = await argon2Hash(masterPassword, salt);
    return { key: await importAesKey(derived), kdf: 'argon2id' };
  } catch (unknownError) {
    if (!allowFallback) {
      const message = unknownError instanceof Error ? unknownError.message : 'Unknown Argon2 failure.';
      throw new Error(`Argon2 engine is unavailable: ${message}`);
    }

    const derived = await pbkdf2Hash(masterPassword, salt);
    return { key: await importAesKey(derived), kdf: 'pbkdf2-sha256' };
  }
}

async function encryptPayload(key: CryptoKey, payload: VaultPayload) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

  return {
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
}

async function decryptPayload(key: CryptoKey, ivBase64: string, ciphertextBase64: string): Promise<VaultPayload> {
  const iv = fromBase64(ivBase64);
  const ciphertext = fromBase64(ciphertextBase64);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, toStrictArrayBuffer(ciphertext));
  const json = new TextDecoder().decode(decrypted);
  const payload = JSON.parse(json) as VaultPayload;

  if (!payload || !Array.isArray(payload.entries)) {
    throw new Error('Vault payload format is invalid.');
  }

  return payload;
}

export async function getPrimaryVaultRecord() {
  return db.vaults.get(PRIMARY_VAULT_ID);
}

export async function createVault(masterPassword: string) {
  const existing = await getPrimaryVaultRecord();
  if (existing) {
    throw new Error('Vault already exists.');
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await deriveAesKey(masterPassword, salt, 'argon2id', true);
  const key = derived.key;

  const initialPayload: VaultPayload = {
    schemaVersion: 1,
    entries: [],
  };

  const encrypted = await encryptPayload(key, initialPayload);
  const now = new Date();

  const record: VaultRecord = {
    id: PRIMARY_VAULT_ID,
    version: 1,
    kdf: derived.kdf,
    salt: toBase64(salt),
    iv: encrypted.iv,
    ciphertext: encrypted.ciphertext,
    createdAt: now,
    updatedAt: now,
  };

  await db.vaults.put(record);
  return { key, record, payload: initialPayload };
}

export async function unlockVault(masterPassword: string) {
  const record = await getPrimaryVaultRecord();
  if (!record) {
    throw new Error('Vault is not initialized.');
  }

  const currentKdf: VaultKdf = record.kdf ?? 'argon2id';
  const key = (await deriveAesKey(masterPassword, fromBase64(record.salt), currentKdf, false)).key;

  try {
    const payload = await decryptPayload(key, record.iv, record.ciphertext);
    return { key, record, payload };
  } catch (unknownError) {
    if (unknownError instanceof Error && unknownError.message.startsWith('Argon2 engine is unavailable:')) {
      throw unknownError;
    }
    throw new Error('Failed to unlock vault. Master password may be incorrect.');
  }
}

export async function saveVaultEntries(key: CryptoKey, record: VaultRecord, entries: PasswordEntry[]) {
  const payload: VaultPayload = {
    schemaVersion: 1,
    entries,
  };

  const encrypted = await encryptPayload(key, payload);
  const nextRecord: VaultRecord = {
    ...record,
    iv: encrypted.iv,
    ciphertext: encrypted.ciphertext,
    updatedAt: new Date(),
  };

  await db.vaults.put(nextRecord);
  return nextRecord;
}

export async function resetVault() {
  await db.vaults.clear();
}
