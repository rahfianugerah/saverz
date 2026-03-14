export interface Prompt {
  id?: number;
  title: string;
  role: string;
  taskType: 'textarea' | 'list';
  taskContent: string;
  rules: string[];
  createdAt: Date;
}

export interface Link {
  id?: number;
  name: string;
  url: string;
  createdAt: Date;
}

export interface Note {
  id?: number;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PasswordEntry {
  id: string;
  label: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export interface VaultPayload {
  schemaVersion: number;
  entries: PasswordEntry[];
}

export interface VaultRecord {
  id: string;
  version: number;
  kdf: 'argon2id';
  salt: string;
  iv: string;
  ciphertext: string;
  createdAt: Date;
  updatedAt: Date;
}
