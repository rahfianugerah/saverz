import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineClipboardDocument, HiOutlineCheck, HiOutlineSparkles } from 'react-icons/hi2';
import { usePrompts, addPrompt, deletePrompt } from '../lib/hooks';
import type { Prompt } from '../lib/types';

// ── Dynamic List Input ─────────────────────────────────
function DynamicList({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const addItem = () => onChange([...items, '']);
  const removeItem = (index: number) => onChange(items.filter((_, i) => i !== index));
  const updateItem = (index: number, value: string) => {
    const updated = [...items];
    updated[index] = value;
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {items.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2"
          >
            <span className="text-muted text-xs w-5 shrink-0 text-center">{index + 1}.</span>
            <input
              type="text"
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              placeholder={placeholder}
              className="input-field flex-1 text-sm"
            />
            <button
              onClick={() => removeItem(index)}
              className="btn-ghost p-2 text-danger hover:text-danger shrink-0"
              aria-label="Remove item"
            >
              <HiOutlineTrash size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
      <button
        onClick={addItem}
        className="btn-ghost flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover"
      >
        <HiOutlinePlus size={16} />
        Add item
      </button>
    </div>
  );
}

// ── Toggle Switch ──────────────────────────────────────
function ToggleSwitch({
  value,
  onChange,
  labelA,
  labelB,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  labelA: string;
  labelB: string;
}) {
  return (
    <div className="inline-flex items-center bg-surface border border-border rounded-xl p-1 gap-0.5">
      <button
        onClick={() => onChange(false)}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
          !value ? 'bg-accent text-white' : 'text-muted hover:text-foreground'
        }`}
      >
        {labelA}
      </button>
      <button
        onClick={() => onChange(true)}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
          value ? 'bg-accent text-white' : 'text-muted hover:text-foreground'
        }`}
      >
        {labelB}
      </button>
    </div>
  );
}

// ── Preview Block ──────────────────────────────────────
function PromptPreview({ prompt }: { prompt: { title: string; role: string; taskType: 'textarea' | 'list'; taskContent: string; taskItems: string[]; rules: string[] } }) {
  const [copied, setCopied] = useState(false);

  const formatPrompt = useCallback(() => {
    let text = '';
    if (prompt.title) text += `# ${prompt.title}\n\n`;
    if (prompt.role) text += `**Role:** ${prompt.role}\n\n`;

    text += `## Task\n`;
    if (prompt.taskType === 'textarea') {
      text += `${prompt.taskContent}\n\n`;
    } else {
      const items = prompt.taskItems.filter((i) => i.trim());
      if (items.length > 0) {
        items.forEach((item) => {
          text += `- ${item}\n`;
        });
        text += '\n';
      }
    }

    const rules = prompt.rules.filter((r) => r.trim());
    if (rules.length > 0) {
      text += `## Rules\n`;
      rules.forEach((rule) => {
        text += `- ${rule}\n`;
      });
    }

    return text.trim();
  }, [prompt]);

  const handleCopy = async () => {
    const text = formatPrompt();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatted = formatPrompt();

  if (!formatted) return null;

  return (
    <div className="card mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted">Preview</h3>
        <button onClick={handleCopy} className="btn-ghost flex items-center gap-1.5 text-xs">
          {copied ? (
            <>
              <HiOutlineCheck size={14} className="text-success" />
              <span className="text-success">Copied!</span>
            </>
          ) : (
            <>
              <HiOutlineClipboardDocument size={14} />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="bg-background border border-border rounded-xl p-4 text-sm text-foreground/90 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
        {formatted}
      </pre>
    </div>
  );
}

// ── Saved Prompt Card ──────────────────────────────────
function SavedPromptCard({ prompt, onDelete }: { prompt: Prompt; onDelete: (id: number) => void }) {
  const [copied, setCopied] = useState(false);

  const formatSaved = () => {
    let text = '';
    if (prompt.title) text += `# ${prompt.title}\n\n`;
    if (prompt.role) text += `**Role:** ${prompt.role}\n\n`;
    text += `## Task\n`;
    if (prompt.taskType === 'textarea') {
      text += `${prompt.taskContent}\n\n`;
    } else {
      const content = prompt.taskContent;
      if (content) {
        try {
          const items: string[] = JSON.parse(content);
          items.filter((i) => i.trim()).forEach((item) => { text += `- ${item}\n`; });
        } catch {
          text += `${content}\n`;
        }
        text += '\n';
      }
    }
    if (prompt.rules.length > 0) {
      text += `## Rules\n`;
      prompt.rules.filter((r) => r.trim()).forEach((rule) => { text += `- ${rule}\n`; });
    }
    return text.trim();
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(formatSaved());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="font-medium text-foreground truncate">{prompt.title || 'Untitled'}</h4>
          {prompt.role && <p className="text-xs text-muted mt-1 truncate">Role: {prompt.role}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={handleCopy} className="btn-ghost p-2" aria-label="Copy prompt">
            {copied ? <HiOutlineCheck size={16} className="text-success" /> : <HiOutlineClipboardDocument size={16} />}
          </button>
          <button onClick={() => prompt.id && onDelete(prompt.id)} className="btn-ghost p-2 text-danger" aria-label="Delete prompt">
            <HiOutlineTrash size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Prompt Builder ────────────────────────────────
export default function PromptBuilder() {
  const prompts = usePrompts();

  const [title, setTitle] = useState('');
  const [role, setRole] = useState('');
  const [taskType, setTaskType] = useState<'textarea' | 'list'>('textarea');
  const [taskContent, setTaskContent] = useState('');
  const [taskItems, setTaskItems] = useState<string[]>(['']);
  const [rules, setRules] = useState<string[]>(['']);

  const handleSave = async () => {
    if (!title.trim()) return;
    const content = taskType === 'list' ? JSON.stringify(taskItems.filter((i) => i.trim())) : taskContent;
    await addPrompt({
      title: title.trim(),
      role: role.trim(),
      taskType,
      taskContent: content,
      rules: rules.filter((r) => r.trim()),
    });
    // Reset form
    setTitle('');
    setRole('');
    setTaskContent('');
    setTaskItems(['']);
    setRules(['']);
  };

  const handleDelete = async (id: number) => {
    await deletePrompt(id);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 bg-accent/15 rounded-xl">
          <HiOutlineSparkles size={22} className="text-accent" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Prompt Builder</h2>
          <p className="text-sm text-muted">Create structured LLM prompts from templates</p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-5">
        {/* Title & Role */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Code Review Agent"
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Role</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Senior Software Engineer"
              className="input-field"
            />
          </div>
        </div>

        {/* Task Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-muted">Task</label>
            <ToggleSwitch
              value={taskType === 'list'}
              onChange={(v) => setTaskType(v ? 'list' : 'textarea')}
              labelA="Free Write"
              labelB="List"
            />
          </div>
          <AnimatePresence mode="wait">
            {taskType === 'textarea' ? (
              <motion.div
                key="textarea"
                initial={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: 20, filter: 'blur(4px)' }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                <textarea
                  value={taskContent}
                  onChange={(e) => setTaskContent(e.target.value)}
                  placeholder="Describe the task in detail..."
                  rows={4}
                  className="textarea-field"
                />
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0, x: 20, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                <DynamicList items={taskItems} onChange={setTaskItems} placeholder="Task item..." />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Rules Section */}
        <div>
          <label className="block text-xs font-medium text-muted mb-2">Rules & Constraints</label>
          <DynamicList items={rules} onChange={setRules} placeholder="Add a rule..." />
        </div>

        {/* Preview */}
        <PromptPreview prompt={{ title, role, taskType, taskContent, taskItems, rules }} />

        {/* Save Button */}
        <button onClick={handleSave} disabled={!title.trim()} className="btn-primary w-full md:w-auto disabled:opacity-40 disabled:cursor-not-allowed">
          Save Prompt
        </button>
      </div>

      {/* Saved Prompts */}
      {prompts.length > 0 && (
        <div className="mt-12">
          <h3 className="text-sm font-medium text-muted mb-4">Saved Prompts ({prompts.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <AnimatePresence>
              {prompts.map((prompt) => (
                <SavedPromptCard key={prompt.id} prompt={prompt} onDelete={handleDelete} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
