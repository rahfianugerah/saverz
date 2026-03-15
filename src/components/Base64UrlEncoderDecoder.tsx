import React, { useMemo, useState } from 'react';
import {
  HiOutlineArrowsRightLeft,
  HiOutlineCodeBracket,
  HiOutlineGlobeAlt,
  HiOutlineExclamationTriangle,
  HiOutlineClipboardDocument,
  HiOutlineCheck,
} from 'react-icons/hi2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

type Mode = 'base64' | 'url';
type Direction = 'encode' | 'decode';

function utf8ToBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

function base64ToUtf8(value: string): string {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export default function Base64UrlEncoderDecoder() {
  const [mode, setMode] = useState<Mode>('base64');
  const [direction, setDirection] = useState<Direction>('encode');
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => {
    if (!input) {
      return { value: '', error: '' };
    }

    try {
      if (mode === 'base64') {
        return {
          value: direction === 'encode' ? utf8ToBase64(input) : base64ToUtf8(input),
          error: '',
        };
      }

      return {
        value: direction === 'encode' ? encodeURIComponent(input) : decodeURIComponent(input),
        error: '',
      };
    } catch {
      return {
        value: '',
        error: `Unable to ${direction} this ${mode === 'base64' ? 'Base64' : 'URL'} value.`,
      };
    }
  }, [direction, input, mode]);

  const handleCopy = async () => {
    if (!output.value.trim()) return;

    await navigator.clipboard.writeText(output.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="space-y-6">
      <div className="mb-2 flex items-center gap-3">
        <div className="rounded-lg border border-border bg-card p-2.5">
          <HiOutlineArrowsRightLeft size={22} className="text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Base64 and URL Encoder/Decoder</h2>
          <p className="text-sm text-muted-foreground">
            Switch between Base64 and URL encoding, then toggle encode/decode direction instantly.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === 'base64' ? 'default' : 'ghost'}
              onClick={() => setMode('base64')}
              className={cn('gap-1.5', mode !== 'base64' && 'border border-input')}
            >
              <HiOutlineCodeBracket size={15} />
              Base64
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === 'url' ? 'default' : 'ghost'}
              onClick={() => setMode('url')}
              className={cn('gap-1.5', mode !== 'url' && 'border border-input')}
            >
              <HiOutlineGlobeAlt size={15} />
              URL Encoding
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ml-auto gap-1.5"
              onClick={() => setDirection((current) => (current === 'encode' ? 'decode' : 'encode'))}
            >
              <HiOutlineArrowsRightLeft size={15} />
              Toggle Direction ({direction === 'encode' ? 'Encode -> Decode' : 'Decode -> Encode'})
            </Button>
          </div>
          <CardTitle>{mode === 'base64' ? 'Base64' : 'URL'} Transformer</CardTitle>
          <CardDescription>
            Left pane is the active input. Right pane is generated output for the selected direction.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {output.error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/35 bg-destructive/10 p-3 text-sm text-destructive">
              <HiOutlineExclamationTriangle size={16} className="mt-0.5 shrink-0" />
              <p>{output.error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Input ({direction === 'encode' ? 'Plain text' : mode === 'base64' ? 'Base64 value' : 'URL encoded value'})
              </p>
              <Textarea
                rows={14}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                className="font-mono text-sm"
                placeholder={direction === 'encode' ? 'Type plain text here...' : 'Paste encoded value here...'}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Output ({direction === 'encode' ? 'Encoded' : 'Decoded'})
                </p>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={handleCopy} disabled={!output.value.trim()}>
                  {copied ? <HiOutlineCheck size={14} /> : <HiOutlineClipboardDocument size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <Textarea rows={14} value={output.value} readOnly className="font-mono text-sm" placeholder="Converted output appears here..." />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
