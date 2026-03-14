import Dexie, { type Table } from 'dexie';
import type { Prompt, Link, Note, VaultRecord } from './types';

class SaverzDB extends Dexie {
  prompts!: Table<Prompt>;
  links!: Table<Link>;
  notes!: Table<Note>;
  vaults!: Table<VaultRecord, string>;

  constructor() {
    super('saverz');
    this.version(1).stores({
      prompts: '++id, title, role, taskType, taskContent, createdAt',
      links: '++id, name, url, createdAt',
      notes: '++id, title, content, updatedAt',
    });

    this.version(2).stores({
      prompts: '++id, title, role, taskType, taskContent, createdAt',
      links: '++id, name, url, createdAt',
      notes: '++id, title, content, updatedAt',
      vaults: 'id, updatedAt',
    });
  }
}

export const db = new SaverzDB();
