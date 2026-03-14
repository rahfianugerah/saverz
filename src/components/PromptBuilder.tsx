import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineClipboardDocument, HiOutlineCheck, HiOutlineSparkles } from 'react-icons/hi2';
import { usePrompts, addPrompt, deletePrompt, updatePrompt } from '../lib/hooks';
import type { Prompt } from '../lib/types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ModeSwitch } from './ui/mode-switch';

interface PromptDraft {
  title: string;
  role: string;
  taskType: 'textarea' | 'list';
  taskContent: string;
  taskItems: string[];
  rules: string[];
}

function buildPromptText(prompt: PromptDraft): string {
  let text = '';
  if (prompt.title) text += `# ${prompt.title}\n\n`;
  if (prompt.role) text += `**Role:** ${prompt.role}\n\n`;

  text += '## Task\n';
  if (prompt.taskType === 'textarea') {
    text += `${prompt.taskContent}\n\n`;
  } else {
    const items = prompt.taskItems.filter((item) => item.trim());
    if (items.length > 0) {
      items.forEach((item) => {
        text += `- ${item}\n`;
      });
      text += '\n';
    }
  }

  const rules = prompt.rules.filter((rule) => rule.trim());
  if (rules.length > 0) {
    text += '## Rules\n';
    rules.forEach((rule) => {
      text += `- ${rule}\n`;
    });
  }

  return text.trim();
}

function extractTemplateVariables(text: string): string[] {
  const found = text.match(/{{\s*([\w.-]+)\s*}}/g) ?? [];
  const deduped = new Set<string>();

  found.forEach((entry) => {
    const match = entry.match(/{{\s*([\w.-]+)\s*}}/);
    if (match?.[1]) deduped.add(match[1]);
  });

  return [...deduped];
}

function applyTemplateVariables(text: string, variables: Record<string, string>): string {
  return text.replace(/{{\s*([\w.-]+)\s*}}/g, (_, key: string) => variables[key] ?? '');
}

function parseListTaskContent(content: string): string[] {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item));
    }
  } catch {
    return [content];
  }

  return [''];
}

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
        <div key={index} className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/40 px-2 py-2">
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
function PromptPreview({
  prompt,
  variables,
  onVariableChange,
}: {
  prompt: PromptDraft;
  variables: Record<string, string>;
  onVariableChange: (name: string, value: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);

  const templateText = useMemo(() => buildPromptText(prompt), [prompt]);
  const variableNames = useMemo(() => extractTemplateVariables(templateText), [templateText]);
  const fullPreviewText = useMemo(() => applyTemplateVariables(templateText, variables), [templateText, variables]);
  const previewText = showFullPreview ? fullPreviewText : templateText;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(previewText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatted = previewText;

  if (!formatted) return null;

  return (
    <Card className="mt-6">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">Live Preview</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowFullPreview((current) => !current)}
            variant="outline"
            size="sm"
            className="h-8 text-xs"
          >
            {showFullPreview ? 'Template View' : 'Full Preview'}
          </Button>
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
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {variableNames.length > 0 && (
          <div className="space-y-2 rounded-lg border border-border/70 bg-background/45 p-3">
            <p className="text-xs font-medium text-muted-foreground">Template Variables</p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {variableNames.map((name) => (
                <Input
                  key={name}
                  value={variables[name] ?? ''}
                  onChange={(event) => onVariableChange(name, event.target.value)}
                  placeholder={`Value for ${name}`}
                />
              ))}
            </div>
          </div>
        )}
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-border bg-background/80 p-4 font-mono text-sm leading-relaxed text-foreground/90">
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
        <CardContent className="flex items-start justify-between gap-3 p-5">
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

  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [role, setRole] = useState('');
  const [taskType, setTaskType] = useState<'textarea' | 'list'>('textarea');
  const [taskContent, setTaskContent] = useState('');
  const [taskItems, setTaskItems] = useState<string[]>(['']);
  const [rules, setRules] = useState<string[]>(['']);
  const [variables, setVariables] = useState<Record<string, string>>({});

  useEffect(() => {
    if (selectedTemplateId === null) return;
    const stillExists = prompts.some((prompt) => prompt.id === selectedTemplateId);
    if (!stillExists) {
      setSelectedTemplateId(null);
    }
  }, [prompts, selectedTemplateId]);

  const resetForm = () => {
    setSelectedTemplateId(null);
    setTitle('');
    setRole('');
    setTaskType('textarea');
    setTaskContent('');
    setTaskItems(['']);
    setRules(['']);
    setVariables({});
  };

  const loadPromptToForm = (prompt: Prompt) => {
    setTitle(prompt.title);
    setRole(prompt.role);
    setTaskType(prompt.taskType);
    if (prompt.taskType === 'list') {
      setTaskItems(parseListTaskContent(prompt.taskContent));
      setTaskContent('');
    } else {
      setTaskContent(prompt.taskContent);
      setTaskItems(['']);
    }
    setRules(prompt.rules.length > 0 ? prompt.rules : ['']);
    setVariables({});
  };

  const handleTemplateSelect = (value: string) => {
    if (!value) {
      resetForm();
      return;
    }

    const selectedId = Number(value);
    const selectedPrompt = prompts.find((prompt) => prompt.id === selectedId);
    if (!selectedPrompt) return;

    setSelectedTemplateId(selectedId);
    loadPromptToForm(selectedPrompt);
  };

  const buildCurrentPayload = () => ({
    title: title.trim(),
    role: role.trim(),
    taskType,
    taskContent: taskType === 'list' ? JSON.stringify(taskItems.filter((item) => item.trim())) : taskContent,
    rules: rules.filter((rule) => rule.trim()),
  });

  const handleSave = async () => {
    if (!title.trim()) return;
    await addPrompt(buildCurrentPayload());
    resetForm();
  };

  const handleUpdate = async () => {
    if (!selectedTemplateId || !title.trim()) return;
    await updatePrompt(selectedTemplateId, buildCurrentPayload());
  };

  const handleDelete = async (id: number) => {
    if (selectedTemplateId === id) {
      resetForm();
    }
    await deletePrompt(id);
  };

  const currentDraft: PromptDraft = {
    title,
    role,
    taskType,
    taskContent,
    taskItems,
    rules,
  };

  const handleVariableChange = useCallback((name: string, value: string) => {
    setVariables((current) => ({ ...current, [name]: value }));
  }, []);

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
          <CardDescription>Select a saved template, edit inline, and save as new or update the same template.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <label htmlFor="template-select" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Saved Templates
            </label>
            <select
              id="template-select"
              value={selectedTemplateId ?? ''}
              onChange={(event) => handleTemplateSelect(event.target.value)}
              className="w-full"
            >
              <option value="">Create New Template</option>
              {prompts.map((prompt) => (
                <option key={prompt.id} value={prompt.id}>
                  {prompt.title || 'Untitled'}
                </option>
              ))}
            </select>
          </div>

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
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleSave} disabled={!title.trim()} className="w-full md:w-auto">
              Save as New
            </Button>
            <Button
              onClick={handleUpdate}
              variant="secondary"
              disabled={!selectedTemplateId || !title.trim()}
              className="w-full md:w-auto"
            >
              Update Selected
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <PromptPreview prompt={currentDraft} variables={variables} onVariableChange={handleVariableChange} />

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
