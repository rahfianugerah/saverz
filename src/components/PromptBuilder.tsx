import React, { useState, useCallback } from 'react';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineClipboardDocument, HiOutlineCheck, HiOutlineSparkles } from 'react-icons/hi2';
import { usePrompts, addPrompt, deletePrompt } from '../lib/hooks';
import type { Prompt } from '../lib/types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ModeSwitch } from './ui/mode-switch';

// Dynamic List Input
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
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="w-5 shrink-0 text-center text-xs text-muted-foreground">{index + 1}.</span>
          <Input
            value={item}
            onChange={(e) => updateItem(index, e.target.value)}
            placeholder={placeholder}
            className="h-9 flex-1"
          />
          <Button
            onClick={() => removeItem(index)}
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-destructive"
            aria-label="Remove item"
          >
            <HiOutlineTrash size={16} />
          </Button>
        </div>
      ))}
      <Button
        onClick={addItem}
        variant="ghost"
        size="sm"
        className="text-primary"
      >
        <HiOutlinePlus size={16} />
        Add item
      </Button>
    </div>
  );
}

// Preview Block
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
    <Card className="mt-6">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">Preview</CardTitle>
        <Button onClick={handleCopy} variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
          {copied ? (
            <>
              <HiOutlineCheck size={14} className="text-primary" />
              <span className="text-primary">Copied!</span>
            </>
          ) : (
            <>
              <HiOutlineClipboardDocument size={14} />
              Copy
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        <pre className="overflow-x-auto rounded-lg border border-border bg-background/80 p-4 font-mono text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
          {formatted}
        </pre>
      </CardContent>
    </Card>
  );
}

// Saved Prompt Card
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
    <div>
      <Card>
        <CardContent className="flex items-start justify-between gap-3 p-4">
          <div className="min-w-0 flex-1">
            <h4 className="truncate font-medium text-foreground">{prompt.title || 'Untitled'}</h4>
            {prompt.role && <p className="mt-1 truncate text-xs text-muted-foreground">Role: {prompt.role}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button onClick={handleCopy} variant="ghost" size="icon" className="h-8 w-8" aria-label="Copy prompt">
              {copied ? <HiOutlineCheck size={16} className="text-primary" /> : <HiOutlineClipboardDocument size={16} />}
            </Button>
            <Button onClick={() => prompt.id && onDelete(prompt.id)} variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label="Delete prompt">
              <HiOutlineTrash size={16} />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main Prompt Builder
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
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-2 flex items-center gap-3">
        <div className="rounded-lg border border-border bg-card p-2.5">
          <HiOutlineSparkles size={22} className="text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Prompt Builder</h2>
          <p className="text-sm text-muted-foreground">Create structured LLM prompts from templates</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Prompt Template</CardTitle>
          <CardDescription>Define role, task, and constraints before saving.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Title & Role */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Code Review Agent"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Role</label>
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Senior Software Engineer"
              />
            </div>
          </div>

          {/* Task Section */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-muted-foreground">Task</label>
              <ModeSwitch
                value={taskType}
                onChange={setTaskType}
                options={[
                  { value: 'textarea', label: 'Free Write' },
                  { value: 'list', label: 'List' },
                ]}
              />
            </div>

            {taskType === 'textarea' ? (
              <div>
                <Textarea
                  value={taskContent}
                  onChange={(e) => setTaskContent(e.target.value)}
                  placeholder="Describe the task in detail..."
                  rows={4}
                  className="resize-none"
                />
              </div>
            ) : (
              <div>
                <DynamicList items={taskItems} onChange={setTaskItems} placeholder="Task item..." />
              </div>
            )}
          </div>

          {/* Rules Section */}
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">Rules & Constraints</label>
            <DynamicList items={rules} onChange={setRules} placeholder="Add a rule..." />
          </div>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={!title.trim()} className="w-full md:w-auto">
            Save Prompt
          </Button>
        </CardContent>
      </Card>

      {/* Preview */}
      <PromptPreview prompt={{ title, role, taskType, taskContent, taskItems, rules }} />

      {/* Saved Prompts */}
      {prompts.length > 0 && (
        <div className="mt-2">
          <h3 className="mb-4 text-sm font-medium text-muted-foreground">Saved Prompts ({prompts.length})</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {prompts.map((prompt) => (
              <SavedPromptCard key={prompt.id} prompt={prompt} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
