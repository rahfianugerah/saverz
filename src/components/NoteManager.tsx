import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineDocumentText,
  HiOutlinePencilSquare,
  HiOutlineXMark,
  HiOutlineCheck,
} from 'react-icons/hi2';
import { useNotes, addNote, updateNote, deleteNote } from '../lib/hooks';
import type { Note } from '../lib/types';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { ModeSwitch } from './ui/mode-switch';

// Note Card
function NoteCard({
  note,
  onEdit,
  onDelete,
}: {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <Card className="group h-full cursor-pointer hover:border-muted-foreground/30" onClick={() => onEdit(note)}>
      <CardContent className="flex h-full flex-col p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h4 className="flex-1 truncate text-sm font-medium text-foreground">{note.title || 'Untitled'}</h4>
          <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(note);
              }}
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Edit note"
            >
              <HiOutlinePencilSquare size={14} />
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                note.id && onDelete(note.id);
              }}
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              aria-label="Delete note"
            >
              <HiOutlineTrash size={14} />
            </Button>
          </div>
        </div>
        <div className="relative flex-1 overflow-hidden text-xs text-muted-foreground/90 line-clamp-2">
          {note.content ? note.content.slice(0, 160) : 'Empty note'}
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground/60">
          {new Date(note.updatedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </CardContent>
    </Card>
  );
}

// Note Editor Modal
function NoteEditor({
  note,
  onClose,
}: {
  note: Note | null; // null = new note
  onClose: () => void;
}) {
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [editorMode, setEditorMode] = useState<'edit' | 'preview'>('edit');
  const isEditing = !!note?.id;

  const handleSave = async () => {
    if (isEditing && note?.id) {
      await updateNote(note.id, { title: title.trim(), content });
    } else {
      await addNote({ title: title.trim() || 'Untitled', content });
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-card">
        {/* Editor header */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title..."
            className="h-10 flex-1 border-none bg-transparent px-0 text-base font-medium focus-visible:ring-0"
          />
          <div className="ml-3 flex shrink-0 items-center gap-2">
            <ModeSwitch
              value={editorMode}
              onChange={setEditorMode}
              options={[
                { value: 'edit', label: 'Edit' },
                { value: 'preview', label: 'Preview' },
              ]}
            />
            <Button onClick={onClose} variant="ghost" size="icon" className="h-9 w-9" aria-label="Close editor">
              <HiOutlineXMark size={18} />
            </Button>
          </div>
        </div>

        {/* Editor body */}
        <div className="flex-1 overflow-y-auto">
          {editorMode === 'preview' ? (
            <div className="p-5">
              <div className="prose prose-invert prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground/85 prose-a:text-primary prose-strong:text-foreground prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-pre:bg-background prose-pre:border prose-pre:border-border">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content || '*Nothing to preview*'}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[340px] p-5">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your notes in Markdown..."
                className="h-full min-h-[300px] resize-none border-none bg-transparent p-0 font-mono text-sm leading-relaxed focus-visible:ring-0"
              />
            </div>
          )}
        </div>

        {/* Editor footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground/70">Supports Markdown syntax</p>
          <Button onClick={handleSave} className="flex items-center gap-1.5 text-sm">
            <HiOutlineCheck size={16} />
            {isEditing ? 'Update' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Main Note Manager
export default function NoteManager() {
  const notes = useNotes();
  const [editingNote, setEditingNote] = useState<Note | null | 'new'>(null);

  const handleDelete = async (id: number) => {
    await deleteNote(id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-border bg-card p-2.5">
            <HiOutlineDocumentText size={22} className="text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Notes</h2>
            <p className="text-sm text-muted-foreground">Markdown-powered note taking</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setEditingNote('new')}
            className="flex items-center gap-1.5 text-sm"
          >
            <HiOutlinePlus size={16} />
            <span className="hidden sm:inline">New Note</span>
          </Button>
        </div>
      </div>

      {/* Notes grid/list */}
      {notes.length === 0 ? (
        <div className="py-16 text-center">
          <HiOutlineDocumentText size={40} className="mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No notes yet</p>
          <p className="mt-1 text-xs text-muted-foreground/70">Create your first note to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <div key={note.id}>
              <NoteCard
                note={note}
                onEdit={(n) => setEditingNote(n)}
                onDelete={handleDelete}
              />
            </div>
          ))}
        </div>
      )}

      {/* Note Editor */}
      {editingNote !== null && (
        <NoteEditor
          note={editingNote === 'new' ? null : editingNote}
          onClose={() => setEditingNote(null)}
        />
      )}
    </div>
  );
}
