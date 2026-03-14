import React, { useMemo, useState } from 'react';
import { HiOutlineCommandLine, HiOutlineClipboardDocument, HiOutlineTrash, HiOutlineCheck } from 'react-icons/hi2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

function parseWords(text: string) {
  return text.match(/\S+/g) ?? [];
}

function parseTokenChunks(text: string) {
  return text.match(/[A-Za-z]+(?:'[A-Za-z]+)?|\d+|[^\s]/g) ?? [];
}

function estimateTokenCount(chunks: string[]) {
  return chunks.reduce((total, chunk) => total + Math.max(1, Math.ceil(chunk.length / 4)), 0);
}

export default function Tokenizer() {
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);

  const words = useMemo(() => parseWords(text), [text]);
  const tokenChunks = useMemo(() => parseTokenChunks(text), [text]);
  const estimatedTokens = useMemo(() => estimateTokenCount(tokenChunks), [tokenChunks]);

  const stats = useMemo(
    () => [
      { label: 'Characters', value: text.length },
      { label: 'Words', value: words.length },
      { label: 'Estimated Tokens', value: estimatedTokens },
    ],
    [text.length, words.length, estimatedTokens]
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleClear = () => {
    setText('');
  };

  return (
    <div className="space-y-6">
      <div className="mb-2 flex items-center gap-3">
        <div className="rounded-lg border border-border bg-card p-2.5">
          <HiOutlineCommandLine size={22} className="text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Tokenizer</h2>
          <p className="text-sm text-muted-foreground">
            Paste free-write text, estimate token count, and visualize each word.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Input Text</CardTitle>
          <CardDescription>Useful for estimating LLM prompt size before submission.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste or write your text here..."
            rows={8}
            className="resize-y font-mono"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleCopy} variant="secondary" disabled={!text.trim()} className="gap-1.5">
              {copied ? <HiOutlineCheck size={16} /> : <HiOutlineClipboardDocument size={16} />}
              {copied ? 'Copied' : 'Copy Text'}
            </Button>
            <Button onClick={handleClear} variant="ghost" disabled={!text.trim()} className="gap-1.5 text-destructive">
              <HiOutlineTrash size={16} />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Word Visualization</CardTitle>
          <CardDescription>Every non-whitespace word/chunk is shown as a token chip.</CardDescription>
        </CardHeader>
        <CardContent>
          {words.length === 0 ? (
            <p className="text-sm text-muted-foreground">No words yet. Add text to see token chips.</p>
          ) : (
            <div className="max-h-72 overflow-y-auto rounded-lg border border-border bg-background/70 p-3">
              <div className="flex flex-wrap gap-2">
                {words.map((word, index) => (
                  <div key={`${word}-${index}`}>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {index + 1}. {word}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
