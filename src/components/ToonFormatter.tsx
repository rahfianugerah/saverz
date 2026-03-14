import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  HiOutlineCubeTransparent,
  HiOutlineArrowDownCircle,
  HiOutlineClipboardDocument,
  HiOutlineCheck,
  HiOutlineTrash,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { convertJsonToToon } from '../lib/toon';

export default function ToonFormatter() {
  const [input, setInput] = useState('');
  const [pruneKeys, setPruneKeys] = useState('metadata,meta,debug,description,notes,createdAt,updatedAt');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ flattenedCount: 0, removedFields: 0, keptFields: 0 });

  const handleConvert = () => {
    try {
      const parsed = JSON.parse(input);
      const dropKeys = pruneKeys
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

      const result = convertJsonToToon(parsed, {
        dropKeys,
        maxFlattenDepth: 5,
      });

      setOutput(result.toonString);
      setStats({
        flattenedCount: result.flattenedCount,
        removedFields: result.removedFields,
        keptFields: result.keptFields,
      });
      setError('');
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Unable to convert JSON into TOON format.';
      setError(message);
    }
  };

  const handleCopy = async () => {
    if (!output.trim()) return;

    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleReset = () => {
    setInput('');
    setOutput('');
    setError('');
    setStats({ flattenedCount: 0, removedFields: 0, keptFields: 0 });
  };

  return (
    <div className="space-y-6">
      <div className="mb-2 flex items-center gap-3">
        <div className="rounded-lg border border-border bg-card p-2.5">
          <HiOutlineCubeTransparent size={22} className="text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">TOON Formatter</h2>
          <p className="text-sm text-muted-foreground">
            Convert JSON into a dense Token-Optimized Object Notation string for compact LLM context windows.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compression Rules</CardTitle>
          <CardDescription>
            Key removal, empty-value stripping, and flattening are applied before TOON output is produced.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Drop Keys (comma-separated)</label>
            <Input
              value={pruneKeys}
              onChange={(event) => setPruneKeys(event.target.value)}
              placeholder="metadata,debug,notes"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Source JSON</label>
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Paste JSON object..."
                rows={14}
                className="resize-y font-mono text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">TOON Output</label>
              <div className="h-full min-h-[302px] overflow-auto rounded-lg border border-border bg-background/70 p-3 font-mono text-xs leading-relaxed text-foreground/90">
                {output ? output : <span className="text-muted-foreground">Converted TOON output appears here.</span>}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleConvert} disabled={!input.trim()} className="gap-1.5">
              <HiOutlineArrowDownCircle size={16} />
              Convert to TOON
            </Button>
            <Button onClick={handleCopy} variant="secondary" disabled={!output.trim()} className="gap-1.5">
              {copied ? <HiOutlineCheck size={16} /> : <HiOutlineClipboardDocument size={16} />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button onClick={handleReset} variant="ghost" disabled={!input && !output} className="gap-1.5 text-destructive">
              <HiOutlineTrash size={16} />
              Clear
            </Button>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3"
            >
              <HiOutlineExclamationTriangle size={16} className="mt-0.5 text-destructive" />
              <p className="text-xs text-destructive">{error}</p>
            </motion.div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Flattened Fields</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">{stats.flattenedCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Removed Fields</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">{stats.removedFields}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Kept Fields</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">{stats.keptFields}</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
