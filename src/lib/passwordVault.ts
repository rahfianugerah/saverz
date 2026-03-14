import { db } from './db';
import type { PasswordEntry, VaultPayload, VaultRecord } from './types';

const PRIMARY_VAULT_ID = 'primary';
const KDF_TIME_COST = 3;
const KDF_MEMORY_COST = 65536;
const KDF_PARALLELISM = 1;
const KDF_HASH_LENGTH = 32;

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

async function argon2Hash(masterPassword: string, salt: Uint8Array): Promise<Uint8Array> {
  // argon2-browser ships without stable TS declarations in this setup.
  const moduleRef = (await import('argon2-browser')) as unknown as {
    hash?: (options: Record<string, unknown>) => Promise<{ hash: Uint8Array | ArrayBuffer }>;
    ArgonType?: { Argon2id: number };
    default?: {
      hash?: (options: Record<string, unknown>) => Promise<{ hash: Uint8Array | ArrayBuffer }>;
      ArgonType?: { Argon2id: number };
    };
  };

  const hashFn = moduleRef.hash ?? moduleRef.default?.hash;
  const argonType = moduleRef.ArgonType?.Argon2id ?? moduleRef.default?.ArgonType?.Argon2id ?? 2;

  if (!hashFn) {
    throw new Error('Argon2 module could not be loaded.');
  }

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

async function deriveAesKey(masterPassword: string, salt: Uint8Array): Promise<CryptoKey> {
  const derived = await argon2Hash(masterPassword, salt);
  return crypto.subtle.importKey('raw', toStrictArrayBuffer(derived), { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
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
  const key = await deriveAesKey(masterPassword, salt);

  const initialPayload: VaultPayload = {
    schemaVersion: 1,
    entries: [],
  };

  const encrypted = await encryptPayload(key, initialPayload);
  const now = new Date();

  const record: VaultRecord = {
    id: PRIMARY_VAULT_ID,
    version: 1,
    kdf: 'argon2id',
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

  const key = await deriveAesKey(masterPassword, fromBase64(record.salt));

  try {
    const payload = await decryptPayload(key, record.iv, record.ciphertext);
    return { key, record, payload };
  } catch {
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
