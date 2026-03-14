import React, { useMemo, useRef, useState } from 'react';
import {
  HiOutlineCodeBracket,
  HiOutlineScissors,
  HiOutlineClipboardDocument,
  HiOutlineCheck,
  HiOutlineSparkles,
  HiOutlineExclamationTriangle,
  HiOutlineArrowsRightLeft,
} from 'react-icons/hi2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import {
  convertJsonToXml,
  convertXmlToJson,
  formatJson,
  formatXml,
  parseStructuredInput,
  type StructuredInputMode,
} from '../lib/dataFormatter';

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

type OutputKind = 'json' | 'xml' | 'plain';

type FormatterActionId =
  | 'beautify-json'
  | 'minify-json'
  | 'jsonify-structured'
  | 'beautify-xml'
  | 'minify-xml'
  | 'json-to-xml'
  | 'xml-to-json';

export default function DataFormatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [outputKind, setOutputKind] = useState<OutputKind>('json');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [structuredMode, setStructuredMode] = useState<StructuredInputMode>('auto');
  const [xmlRootName, setXmlRootName] = useState('root');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeAction, setActiveAction] = useState<FormatterActionId | null>(null);
  const requestIdRef = useRef(0);

  const highlightedOutput = useMemo(() => (outputKind === 'json' ? tokenizeJson(output) : []), [output, outputKind]);

  const apply = (id: FormatterActionId, action: () => { result: string; kind: OutputKind }) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setCopied(false);
    setError('');
    setIsProcessing(true);
    setActiveAction(id);

    try {
      const next = action();
      if (requestId !== requestIdRef.current) return;

      setOutput(next.result);
      setOutputKind(next.kind);
      setError('');
    } catch (unknownError) {
      if (requestId !== requestIdRef.current) return;

      const message = unknownError instanceof Error ? unknownError.message : 'Unexpected formatting error.';
      setOutput('');
      setOutputKind('plain');
      setError(message);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsProcessing(false);
        setActiveAction(null);
      }
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
          <p className="text-sm text-muted-foreground">Format JSON or XML, convert between both, and jsonify structured text quickly.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Input</CardTitle>
            <CardDescription>Paste JSON, XML, CSV/TSV, NDJSON, key-value lines, or logs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr]">
              <div>
                <label htmlFor="structured-mode" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Structured Parser Mode
                </label>
                <select
                  id="structured-mode"
                  value={structuredMode}
                  onChange={(event) => setStructuredMode(event.target.value as StructuredInputMode)}
                >
                  <option value="auto">Auto Detect</option>
                  <option value="csv">CSV</option>
                  <option value="tsv">TSV</option>
                  <option value="ndjson">NDJSON</option>
                  <option value="kv">Key Value Lines</option>
                  <option value="logs">Log Lines</option>
                </select>
              </div>
              <div>
                <label htmlFor="xml-root" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  JSON to XML Root
                </label>
                <input
                  id="xml-root"
                  value={xmlRootName}
                  onChange={(event) => setXmlRootName(event.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="root"
                />
              </div>
            </div>

            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Paste raw data here..."
              rows={16}
              className="font-mono text-sm"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() =>
                  apply('beautify-json', () => ({
                    result: formatJson(input, 'beautify'),
                    kind: 'json',
                  }))
                }
                className="gap-1.5"
                disabled={!input.trim() || isProcessing}
              >
                <HiOutlineSparkles size={16} />
                Beautify JSON
              </Button>
              <Button
                onClick={() =>
                  apply('minify-json', () => ({
                    result: formatJson(input, 'minify'),
                    kind: 'json',
                  }))
                }
                variant="secondary"
                className="gap-1.5"
                disabled={!input.trim() || isProcessing}
              >
                <HiOutlineScissors size={16} />
                Minify JSON
              </Button>
              <Button
                onClick={() =>
                  apply('jsonify-structured', () => ({
                    result: JSON.stringify(parseStructuredInput(input, structuredMode), null, 2),
                    kind: 'json',
                  }))
                }
                variant="outline"
                className="gap-1.5"
                disabled={!input.trim() || isProcessing}
              >
                <HiOutlineCodeBracket size={16} />
                Jsonify Structured
              </Button>
              <Button
                onClick={() =>
                  apply('beautify-xml', () => ({
                    result: formatXml(input, 'beautify'),
                    kind: 'xml',
                  }))
                }
                variant="secondary"
                className="gap-1.5"
                disabled={!input.trim() || isProcessing}
              >
                <HiOutlineSparkles size={16} />
                Beautify XML
              </Button>
              <Button
                onClick={() =>
                  apply('minify-xml', () => ({
                    result: formatXml(input, 'minify'),
                    kind: 'xml',
                  }))
                }
                variant="outline"
                className="gap-1.5"
                disabled={!input.trim() || isProcessing}
              >
                <HiOutlineScissors size={16} />
                Minify XML
              </Button>
              <Button
                onClick={() =>
                  apply('json-to-xml', () => ({
                    result: convertJsonToXml(input, xmlRootName.trim() || 'root'),
                    kind: 'xml',
                  }))
                }
                variant="outline"
                className="gap-1.5"
                disabled={!input.trim() || isProcessing}
              >
                <HiOutlineArrowsRightLeft size={16} />
                JSON to XML
              </Button>
              <Button
                onClick={() =>
                  apply('xml-to-json', () => ({
                    result: convertXmlToJson(input),
                    kind: 'json',
                  }))
                }
                variant="outline"
                className="gap-1.5"
                disabled={!input.trim() || isProcessing}
              >
                <HiOutlineArrowsRightLeft size={16} />
                XML to JSON
              </Button>
            </div>
            {isProcessing && activeAction && (
              <p className="text-xs text-muted-foreground">Processing {activeAction.replaceAll('-', ' ')}...</p>
            )}
            <div className="rounded-lg border border-border bg-background/50 px-3 py-2 text-xs text-muted-foreground">
              Structured parser supports CSV, TSV, NDJSON, key-value lines, and raw log lines.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle>Output</CardTitle>
              <CardDescription>Processed result with JSON highlighting and stable action state.</CardDescription>
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
                outputKind === 'json' ? (
                  <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed">
                    {highlightedOutput.map((token, index) => (
                      <span key={`${token.text}-${index}`} className={token.className}>
                        {token.text}
                      </span>
                    ))}
                  </pre>
                ) : (
                  <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-foreground/90">{output}</pre>
                )
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
