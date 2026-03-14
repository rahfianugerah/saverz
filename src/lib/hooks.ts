import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import type { Prompt, Link, Note } from './types';

// Prompts
export function usePrompts() {
  return useLiveQuery(() => db.prompts.orderBy('createdAt').reverse().toArray()) ?? [];
}

export async function addPrompt(prompt: Omit<Prompt, 'id' | 'createdAt'>) {
  return db.prompts.add({ ...prompt, createdAt: new Date() });
}

export async function updatePrompt(id: number, data: Partial<Prompt>) {
  return db.prompts.update(id, data);
}

export async function deletePrompt(id: number) {
  return db.prompts.delete(id);
}

// Links
export function useLinks() {
  return useLiveQuery(() => db.links.orderBy('createdAt').reverse().toArray()) ?? [];
}

export async function addLink(link: Omit<Link, 'id' | 'createdAt'>) {
  return db.links.add({ ...link, createdAt: new Date() });
}

export async function deleteLink(id: number) {
  return db.links.delete(id);
}

export async function updateLink(id: number, data: Partial<Link>) {
  return db.links.update(id, data);
}

// Notes
export function useNotes() {
  return useLiveQuery(() => db.notes.orderBy('updatedAt').reverse().toArray()) ?? [];
}

export async function addNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = new Date();
  return db.notes.add({ ...note, createdAt: now, updatedAt: now });
}

export async function updateNote(id: number, data: Partial<Note>) {
  return db.notes.update(id, { ...data, updatedAt: new Date() });
}

export async function deleteNote(id: number) {
  return db.notes.delete(id);
}
