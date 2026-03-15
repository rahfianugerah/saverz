import React, { useMemo, useState } from 'react';
import { HiOutlineKey, HiOutlineExclamationTriangle, HiOutlineClipboardDocument, HiOutlineCheck } from 'react-icons/hi2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';

function decodeBase64Url(segment: string): string {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4;
  const padded = padding === 0 ? normalized : normalized + '='.repeat(4 - padding);
  return atob(padded);
}

function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export default function JwtDebugger() {
  const [token, setToken] = useState('');
  const [copiedBlock, setCopiedBlock] = useState<'header' | 'payload' | null>(null);

  const decoded = useMemo(() => {
    if (!token.trim()) {
      return {
        header: '',
        payload: '',
        error: '',
      };
    }

    try {
      const parts = token.trim().split('.');
      if (parts.length < 2) {
        throw new Error('Token must contain at least header and payload segments.');
      }

      const header = JSON.parse(decodeBase64Url(parts[0]));
      const payload = JSON.parse(decodeBase64Url(parts[1]));

      return {
        header: prettyJson(header),
        payload: prettyJson(payload),
        error: '',
      };
    } catch {
      return {
        header: '',
        payload: '',
        error: 'Invalid JWT format. Ensure the token is base64url encoded and has valid JSON in header/payload.',
      };
    }
  }, [token]);

  const handleCopy = async (target: 'header' | 'payload') => {
    const value = target === 'header' ? decoded.header : decoded.payload;
    if (!value) return;

    await navigator.clipboard.writeText(value);
    setCopiedBlock(target);
    setTimeout(() => setCopiedBlock(null), 1200);
  };

  return (
    <div className="space-y-6">
      <div className="mb-2 flex items-center gap-3">
        <div className="rounded-lg border border-border bg-card p-2.5">
          <HiOutlineKey size={22} className="text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">JWT Debugger</h2>
          <p className="text-sm text-muted-foreground">
            Paste a JWT to decode header and payload in-place. Everything runs locally in your browser.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Raw JWT</CardTitle>
          <CardDescription>Supports base64url tokens with two or three segments.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={5}
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            className="font-mono text-sm"
          />

          {decoded.error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/35 bg-destructive/10 p-3 text-sm text-destructive">
              <HiOutlineExclamationTriangle size={16} className="mt-0.5 shrink-0" />
              <p>{decoded.error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Header</CardTitle>
              <CardDescription>Decoded JSON object</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => handleCopy('header')}
              disabled={!decoded.header}
            >
              {copiedBlock === 'header' ? <HiOutlineCheck size={14} /> : <HiOutlineClipboardDocument size={14} />}
              {copiedBlock === 'header' ? 'Copied' : 'Copy'}
            </Button>
          </CardHeader>
          <CardContent>
            <pre className="min-h-[220px] overflow-auto rounded-lg border border-border bg-background/60 p-3 text-xs text-foreground/90">
              <code>{decoded.header || '{ }'}</code>
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Payload</CardTitle>
              <CardDescription>Decoded JSON object</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => handleCopy('payload')}
              disabled={!decoded.payload}
            >
              {copiedBlock === 'payload' ? <HiOutlineCheck size={14} /> : <HiOutlineClipboardDocument size={14} />}
              {copiedBlock === 'payload' ? 'Copied' : 'Copy'}
            </Button>
          </CardHeader>
          <CardContent>
            <pre className="min-h-[220px] overflow-auto rounded-lg border border-border bg-background/60 p-3 text-xs text-foreground/90">
              <code>{decoded.payload || '{ }'}</code>
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
