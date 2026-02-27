import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineDocumentText,
  HiOutlinePencilSquare,
  HiOutlineSquares2X2,
  HiOutlineListBullet,
  HiOutlineXMark,
  HiOutlineCheck,
} from 'react-icons/hi2';
import { useNotes, addNote, updateNote, deleteNote } from '../lib/hooks';
import type { Note } from '../lib/types';

// ── Note Card ──────────────────────────────────────────
function NoteCard({
  note,
  isGrid,
  onEdit,
  onDelete,
}: {
  note: Note;
  isGrid: boolean;
  onEdit: (note: Note) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="card group cursor-pointer"
      onClick={() => onEdit(note)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-foreground text-sm truncate flex-1">{note.title || 'Untitled'}</h4>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(note);
            }}
            className="btn-ghost p-1.5"
            aria-label="Edit note"
          >
            <HiOutlinePencilSquare size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              note.id && onDelete(note.id);
            }}
            className="btn-ghost p-1.5 text-danger"
            aria-label="Delete note"
          >
            <HiOutlineTrash size={14} />
          </button>
        </div>
      </div>
      <div className={`text-xs text-muted/80 overflow-hidden ${isGrid ? 'line-clamp-4' : 'line-clamp-2'}`}>
        {note.content ? note.content.slice(0, 200) : 'Empty note'}
      </div>
      <p className="text-[10px] text-muted/40 mt-3">
        {new Date(note.updatedAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
    </motion.div>
  );
}

// ── Note Editor Modal ──────────────────────────────────
function NoteEditor({
  note,
  onClose,
}: {
  note: Note | null; // null = new note
  onClose: () => void;
}) {
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [showPreview, setShowPreview] = useState(false);
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="bg-surface border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Editor header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title..."
            className="bg-transparent text-foreground font-medium text-lg placeholder:text-muted/50 focus:outline-none flex-1"
          />
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <div className="inline-flex items-center bg-background border border-border rounded-xl p-1 gap-0.5">
              <button
                onClick={() => setShowPreview(false)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  !showPreview ? 'bg-accent text-white' : 'text-muted hover:text-foreground'
                }`}
              >
                Edit
              </button>
              <button
                onClick={() => setShowPreview(true)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  showPreview ? 'bg-accent text-white' : 'text-muted hover:text-foreground'
                }`}
              >
                Preview
              </button>
            </div>
            <button onClick={onClose} className="btn-ghost p-2" aria-label="Close editor">
              <HiOutlineXMark size={18} />
            </button>
          </div>
        </div>

        {/* Editor body */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {showPreview ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: 20, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="p-5 prose prose-invert prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground/80 prose-a:text-accent prose-strong:text-foreground prose-code:text-accent prose-code:bg-background prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-pre:bg-background prose-pre:border prose-pre:border-border"
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content || '*Nothing to preview*'}
                </ReactMarkdown>
              </motion.div>
            ) : (
              <motion.div
                key="editor"
                initial={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: 20, filter: 'blur(4px)' }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="h-full"
              >
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your notes in Markdown..."
                  className="w-full h-full min-h-[300px] bg-transparent text-foreground/90 font-mono text-sm p-5 focus:outline-none resize-none placeholder:text-muted/40 leading-relaxed"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Editor footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
          <p className="text-xs text-muted/50">Supports Markdown syntax</p>
          <button onClick={handleSave} className="btn-primary flex items-center gap-1.5 text-sm">
            <HiOutlineCheck size={16} />
            {isEditing ? 'Update' : 'Save'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Note Manager ──────────────────────────────────
export default function NoteManager() {
  const notes = useNotes();
  const [isGrid, setIsGrid] = useState(true);
  const [editingNote, setEditingNote] = useState<Note | null | 'new'>(null);

  const handleDelete = async (id: number) => {
    await deleteNote(id);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-accent/15 rounded-xl">
            <HiOutlineDocumentText size={22} className="text-accent" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Notes</h2>
            <p className="text-sm text-muted">Markdown-powered note taking</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="inline-flex items-center bg-surface border border-border rounded-xl p-1 gap-0.5">
            <button
              onClick={() => setIsGrid(true)}
              className={`p-1.5 rounded-lg transition-all ${isGrid ? 'bg-accent text-white' : 'text-muted hover:text-foreground'}`}
              aria-label="Grid view"
            >
              <HiOutlineSquares2X2 size={16} />
            </button>
            <button
              onClick={() => setIsGrid(false)}
              className={`p-1.5 rounded-lg transition-all ${!isGrid ? 'bg-accent text-white' : 'text-muted hover:text-foreground'}`}
              aria-label="List view"
            >
              <HiOutlineListBullet size={16} />
            </button>
          </div>
          <button
            onClick={() => setEditingNote('new')}
            className="btn-primary flex items-center gap-1.5 text-sm"
          >
            <HiOutlinePlus size={16} />
            <span className="hidden sm:inline">New Note</span>
          </button>
        </div>
      </div>

      {/* Notes grid/list */}
      {notes.length === 0 ? (
        <div className="text-center py-16">
          <HiOutlineDocumentText size={40} className="text-muted/30 mx-auto mb-3" />
          <p className="text-muted text-sm">No notes yet</p>
          <p className="text-muted/60 text-xs mt-1">Create your first note to get started</p>
        </div>
      ) : (
        <div className={isGrid ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3' : 'space-y-3'}>
          <AnimatePresence>
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                isGrid={isGrid}
                onEdit={(n) => setEditingNote(n)}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Note Editor */}
      <AnimatePresence>
        {editingNote !== null && (
          <NoteEditor
            note={editingNote === 'new' ? null : editingNote}
            onClose={() => setEditingNote(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
