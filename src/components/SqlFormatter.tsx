import React, { useState } from 'react';
import { format } from 'sql-formatter';
import {
  HiOutlineClipboardDocument,
  HiOutlineCodeBracket,
  HiOutlineCheck,
  HiOutlineTrash,
} from 'react-icons/hi2';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select } from './ui/select';
import { Textarea } from './ui/textarea';

type SqlDialect = 'mysql' | 'postgresql';

const sqlDialectOptions = [
  { value: 'mysql' as const, label: 'MySQL' },
  { value: 'postgresql' as const, label: 'PostgreSQL' },
];

export default function SqlFormatter() {
  const [dialect, setDialect] = useState<SqlDialect>('mysql');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleBeautify = () => {
    if (!input.trim()) {
      setOutput('');
      setError('Paste SQL first.');
      return;
    }

    try {
      const result = format(input, {
        language: dialect,
        tabWidth: 2,
        keywordCase: 'upper',
      });
      setOutput(result);
      setError('');
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Unable to format SQL.';
      setError(message);
    }
  };

  const handleCopy = async () => {
    if (!output.trim()) return;

    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const handleAutoClear = () => {
    setInput('');
    setOutput('');
    setError('');
  };

  return (
    <div className="space-y-6">
      <div className="mb-2 flex items-center gap-3">
        <div className="rounded-lg border border-border bg-card p-2.5">
          <HiOutlineCodeBracket size={22} className="text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Multi-Dialect SQL Formatter</h2>
          <p className="text-sm text-muted-foreground">Beautify SQL for MySQL and PostgreSQL with 2-space indentation and uppercase keywords.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SQL Beautifier</CardTitle>
          <CardDescription>Choose a dialect, then format raw SQL into a readable query.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="sql-dialect" className="text-xs font-medium text-muted-foreground">Dialect</label>
            <Select
              id="sql-dialect"
              value={dialect}
              onChange={(next) => setDialect(next as SqlDialect)}
              options={sqlDialectOptions}
              className="w-[180px]"
            />
            <Button onClick={handleBeautify}>Beautify</Button>
            <Button onClick={handleCopy} variant="secondary" disabled={!output.trim()} className="gap-1.5">
              {copied ? <HiOutlineCheck size={16} /> : <HiOutlineClipboardDocument size={16} />}
              {copied ? 'Copied' : 'Copy to Clipboard'}
            </Button>
            <Button onClick={handleAutoClear} variant="ghost" className="gap-1.5 text-destructive">
              <HiOutlineTrash size={16} />
              Auto-Clear
            </Button>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Raw SQL</p>
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="SELECT id,name FROM users WHERE active=1 ORDER BY created_at DESC;"
                rows={14}
                className="h-[380px] resize-none overflow-y-auto scrollbar-hidden font-mono text-sm"
              />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Beautified SQL</p>
              <Textarea
                value={output}
                readOnly
                rows={14}
                className="h-[380px] resize-none overflow-y-auto scrollbar-hidden font-mono text-sm"
                placeholder="Formatted SQL appears here..."
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
