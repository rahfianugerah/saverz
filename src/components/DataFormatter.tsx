import React, { useMemo, useState } from 'react';
import {
  HiOutlineCodeBracket,
  HiOutlineScissors,
  HiOutlineClipboardDocument,
  HiOutlineCheck,
  HiOutlineSparkles,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { formatJson } from '../lib/dataFormatter';

interface JsonToken {
  text: string;
  className: string;
}

function tokenizeJson(text: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  const tokenRegex =
    /("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*")(\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?|[{}\[\],]/g;

  let cursor = 0;
  let match = tokenRegex.exec(text);

  while (match) {
    if (match.index > cursor) {
      tokens.push({ text: text.slice(cursor, match.index), className: 'text-foreground/85' });
    }

    const [raw, stringValue, hasColon] = match;
    let className = 'text-foreground';

    if (stringValue && hasColon) {
      className = 'text-sky-300';
    } else if (stringValue) {
      className = 'text-emerald-300';
    } else if (/true|false/.test(raw)) {
      className = 'text-orange-300';
    } else if (/null/.test(raw)) {
      className = 'text-zinc-400';
    } else if (/-?\d/.test(raw)) {
      className = 'text-fuchsia-300';
    } else if (/[{}\[\]]/.test(raw)) {
      className = 'text-primary';
    } else if (/[,]/.test(raw)) {
      className = 'text-foreground/60';
    }

    tokens.push({ text: raw, className });
    cursor = match.index + raw.length;
    match = tokenRegex.exec(text);
  }

  if (cursor < text.length) {
    tokens.push({ text: text.slice(cursor), className: 'text-foreground/85' });
  }

  return tokens;
}

export default function DataFormatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const highlightedOutput = useMemo(() => tokenizeJson(output), [output]);

  const apply = (action: () => string) => {
    try {
      const next = action();
      setOutput(next);
      setError('');
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Unexpected formatting error.';
      setError(message);
    }
  };

  const handleCopy = async () => {
    if (!output.trim()) return;

    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      <div className="mb-2 flex items-center gap-3">
        <div className="rounded-lg border border-border bg-card p-2.5">
          <HiOutlineCodeBracket size={22} className="text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Data Formatter</h2>
          <p className="text-sm text-muted-foreground">Fast JSON beautify and minify for cleaner payload editing.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Input</CardTitle>
            <CardDescription>Paste raw JSON input.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Paste raw data here..."
              rows={16}
              className="resize-y font-mono text-sm"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => apply(() => formatJson(input, 'beautify'))}
                className="gap-1.5"
                disabled={!input.trim()}
              >
                <HiOutlineSparkles size={16} />
                Beautify JSON
              </Button>
              <Button
                onClick={() => apply(() => formatJson(input, 'minify'))}
                variant="secondary"
                className="gap-1.5"
                disabled={!input.trim()}
              >
                <HiOutlineScissors size={16} />
                Minify JSON
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle>Output</CardTitle>
              <CardDescription>Formatted result with syntax highlighting.</CardDescription>
            </div>
            <Button onClick={handleCopy} variant="ghost" size="sm" className="h-8 gap-1.5" disabled={!output.trim()}>
              {copied ? <HiOutlineCheck size={14} className="text-primary" /> : <HiOutlineClipboardDocument size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                <HiOutlineExclamationTriangle size={16} className="mt-0.5 text-destructive" />
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}
            <div className="min-h-[410px] overflow-auto rounded-lg border border-border bg-background/70 p-4">
              {output.trim() ? (
                <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed">
                  {highlightedOutput.map((token, index) => (
                    <span key={`${token.text}-${index}`} className={token.className}>
                      {token.text}
                    </span>
                  ))}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">Run an operation to see output.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
