import React, { useMemo, useState } from 'react';
import { HiOutlineCommandLine, HiOutlineClipboardDocument, HiOutlineTrash, HiOutlineCheck } from 'react-icons/hi2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';

interface RankedWord {
  word: string;
  length: number;
  estimatedTokens: number;
}

interface RankedToken {
  token: string;
  tokenId: number;
  frequency: number;
}

const tokenColorClasses = [
  'bg-emerald-500/20 text-emerald-200',
  'bg-sky-500/20 text-sky-200',
  'bg-orange-500/20 text-orange-200',
  'bg-rose-500/20 text-rose-200',
  'bg-violet-500/20 text-violet-200',
  'bg-cyan-500/20 text-cyan-200',
  'bg-lime-500/20 text-lime-200',
];

function parseWords(text: string) {
  return text.match(/[A-Za-z0-9_'-]+/g) ?? [];
}

function parseChunks(text: string) {
  return text.match(/[A-Za-z]+(?:'[A-Za-z]+)?|\d+|[^\s]/g) ?? [];
}

function splitChunkIntoEstimatedTokens(chunk: string) {
  const tokenCount = Math.max(1, Math.ceil(chunk.length / 4));
  const step = Math.max(1, Math.ceil(chunk.length / tokenCount));
  const pieces: string[] = [];

  for (let index = 0; index < chunk.length; index += step) {
    pieces.push(chunk.slice(index, index + step));
  }

  return pieces;
}

function tokenIdFromText(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash % 100000;
}

export default function Tokenizer() {
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);

  const words = useMemo(() => parseWords(text), [text]);
  const chunks = useMemo(() => parseChunks(text), [text]);

  const tokenPieces = useMemo(() => {
    const pieces: string[] = [];
    chunks.forEach((chunk) => {
      pieces.push(...splitChunkIntoEstimatedTokens(chunk));
    });
    return pieces;
  }, [chunks]);

  const estimatedTokens = useMemo(() => tokenPieces.length, [tokenPieces.length]);

  const topExpensiveWords = useMemo<RankedWord[]>(() => {
    const map = new Map<string, RankedWord>();

    words.forEach((word) => {
      const key = word.toLowerCase();
      const estimatedTokenCost = splitChunkIntoEstimatedTokens(word).length;
      const existing = map.get(key);

      if (!existing || estimatedTokenCost > existing.estimatedTokens || word.length > existing.length) {
        map.set(key, {
          word,
          length: word.length,
          estimatedTokens: estimatedTokenCost,
        });
      }
    });

    return [...map.values()]
      .sort((a, b) => b.estimatedTokens - a.estimatedTokens || b.length - a.length || a.word.localeCompare(b.word))
      .slice(0, 5);
  }, [words]);

  const topLongestWords = useMemo<RankedWord[]>(() => {
    const map = new Map<string, RankedWord>();

    words.forEach((word) => {
      const key = word.toLowerCase();
      const estimatedTokenCost = splitChunkIntoEstimatedTokens(word).length;
      const existing = map.get(key);

      if (!existing || word.length > existing.length || estimatedTokenCost > existing.estimatedTokens) {
        map.set(key, {
          word,
          length: word.length,
          estimatedTokens: estimatedTokenCost,
        });
      }
    });

    return [...map.values()]
      .sort((a, b) => b.length - a.length || b.estimatedTokens - a.estimatedTokens || a.word.localeCompare(b.word))
      .slice(0, 5);
  }, [words]);

  const topFrequentTokens = useMemo<RankedToken[]>(() => {
    const map = new Map<string, number>();

    tokenPieces.forEach((token) => {
      map.set(token, (map.get(token) ?? 0) + 1);
    });

    return [...map.entries()]
      .map(([token, frequency]) => ({ token, frequency, tokenId: tokenIdFromText(token) }))
      .sort((a, b) => b.frequency - a.frequency || a.token.localeCompare(b.token))
      .slice(0, 5);
  }, [tokenPieces]);

  const topExpensiveChunks = useMemo<RankedWord[]>(() => {
    const uniqueChunks = [...new Set(chunks.filter((chunk) => /\w/.test(chunk)))];
    return uniqueChunks
      .map((chunk) => ({
        word: chunk,
        length: chunk.length,
        estimatedTokens: splitChunkIntoEstimatedTokens(chunk).length,
      }))
      .sort((a, b) => b.estimatedTokens - a.estimatedTokens || b.length - a.length || a.word.localeCompare(b.word))
      .slice(0, 5);
  }, [chunks]);

  const stats = useMemo(
    () => [
      { label: 'Estimated Tokens', value: estimatedTokens },
      { label: 'Words', value: words.length },
      { label: 'Characters', value: text.length },
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
            Visualize estimated token chunks, inspect expensive words, and review token frequency.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Text Analysis</CardTitle>
          <CardDescription>Enter text on the left and inspect estimated token chunks on the right.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Text</p>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste or write your text here..."
                rows={14}
                className="h-[380px] resize-none overflow-y-auto scrollbar-hidden font-mono"
              />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Tokenized Text (Estimated)</p>
              <div className="h-[380px] overflow-y-auto scrollbar-hidden rounded-md border border-border bg-background/70 p-3 font-mono text-sm">
                {tokenPieces.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Token chunks appear here.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {tokenPieces.map((token, index) => (
                      <span
                        key={`${token}-${index}`}
                        className={`rounded px-1.5 py-0.5 ${tokenColorClasses[index % tokenColorClasses.length]}`}
                      >
                        {token}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
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

      <div className="grid grid-cols-1 gap-2 text-center sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{stat.value}</span> {stat.label.toLowerCase()}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Most Expensive Words</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Word</th>
                    <th className="px-3 py-2">Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {topExpensiveWords.length === 0 ? (
                    <tr>
                      <td className="px-3 py-3 text-muted-foreground" colSpan={2}>No data yet.</td>
                    </tr>
                  ) : (
                    topExpensiveWords.map((item) => (
                      <tr key={item.word} className="border-t border-border">
                        <td className="px-3 py-2 font-mono text-foreground/90">{item.word}</td>
                        <td className="px-3 py-2">{item.estimatedTokens}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 5 Most Frequent Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Token</th>
                    <th className="px-3 py-2">Token ID</th>
                    <th className="px-3 py-2">Frequency</th>
                  </tr>
                </thead>
                <tbody>
                  {topFrequentTokens.length === 0 ? (
                    <tr>
                      <td className="px-3 py-3 text-muted-foreground" colSpan={3}>No data yet.</td>
                    </tr>
                  ) : (
                    topFrequentTokens.map((item) => (
                      <tr key={`${item.token}-${item.tokenId}`} className="border-t border-border">
                        <td className="px-3 py-2 font-mono text-foreground/90">{item.token}</td>
                        <td className="px-3 py-2">{item.tokenId}</td>
                        <td className="px-3 py-2">{item.frequency}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Longest Words</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Word</th>
                    <th className="px-3 py-2">Length</th>
                    <th className="px-3 py-2">Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {topLongestWords.length === 0 ? (
                    <tr>
                      <td className="px-3 py-3 text-muted-foreground" colSpan={3}>No data yet.</td>
                    </tr>
                  ) : (
                    topLongestWords.map((item) => (
                      <tr key={item.word} className="border-t border-border">
                        <td className="px-3 py-2 font-mono text-foreground/90">{item.word}</td>
                        <td className="px-3 py-2">{item.length}</td>
                        <td className="px-3 py-2">{item.estimatedTokens}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 5 Most Expensive Chunks</CardTitle>
            <CardDescription>Chunks that consume the highest estimated token count.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Chunk</th>
                    <th className="px-3 py-2">Length</th>
                    <th className="px-3 py-2">Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {topExpensiveChunks.length === 0 ? (
                    <tr>
                      <td className="px-3 py-3 text-muted-foreground" colSpan={3}>No data yet.</td>
                    </tr>
                  ) : (
                    topExpensiveChunks.map((item) => (
                      <tr key={item.word} className="border-t border-border">
                        <td className="px-3 py-2 font-mono text-foreground/90">{item.word}</td>
                        <td className="px-3 py-2">{item.length}</td>
                        <td className="px-3 py-2">{item.estimatedTokens}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
