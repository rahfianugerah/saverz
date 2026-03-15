import React, { useEffect, useState } from 'react';
import bcrypt from 'bcryptjs';
import {
  HiOutlineFingerPrint,
  HiOutlineClipboardDocument,
  HiOutlineCheck,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';

interface HashState {
  md5: string;
  sha1: string;
  sha256: string;
  bcrypt: string;
  error: string;
}

function rotateLeft(value: number, shift: number): number {
  return (value << shift) | (value >>> (32 - shift));
}

function toWordArray(value: string): number[] {
  const bytes = new TextEncoder().encode(value);
  const words: number[] = [];

  for (let index = 0; index < bytes.length; index += 1) {
    const wordIndex = index >> 2;
    words[wordIndex] = (words[wordIndex] ?? 0) | (bytes[index] << ((index % 4) * 8));
  }

  const bitLength = bytes.length * 8;
  const finalWord = bitLength >> 5;

  words[finalWord] = (words[finalWord] ?? 0) | (0x80 << (bitLength % 32));
  words[(((bitLength + 64) >>> 9) << 4) + 14] = bitLength;

  return words;
}

function toHex(value: number): string {
  const hexChars = '0123456789abcdef';
  let out = '';

  for (let index = 0; index < 4; index += 1) {
    const byte = (value >>> (index * 8)) & 255;
    out += hexChars[(byte >>> 4) & 15] + hexChars[byte & 15];
  }

  return out;
}

function md5(input: string): string {
  const x = toWordArray(input);
  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

  const ff = (aa: number, bb: number, cc: number, dd: number, xx: number, s: number, t: number): number => {
    const value = (aa + ((bb & cc) | (~bb & dd)) + xx + t) | 0;
    return (rotateLeft(value, s) + bb) | 0;
  };

  const gg = (aa: number, bb: number, cc: number, dd: number, xx: number, s: number, t: number): number => {
    const value = (aa + ((bb & dd) | (cc & ~dd)) + xx + t) | 0;
    return (rotateLeft(value, s) + bb) | 0;
  };

  const hh = (aa: number, bb: number, cc: number, dd: number, xx: number, s: number, t: number): number => {
    const value = (aa + (bb ^ cc ^ dd) + xx + t) | 0;
    return (rotateLeft(value, s) + bb) | 0;
  };

  const ii = (aa: number, bb: number, cc: number, dd: number, xx: number, s: number, t: number): number => {
    const value = (aa + (cc ^ (bb | ~dd)) + xx + t) | 0;
    return (rotateLeft(value, s) + bb) | 0;
  };

  for (let index = 0; index < x.length; index += 16) {
    const oldA = a;
    const oldB = b;
    const oldC = c;
    const oldD = d;

    a = ff(a, b, c, d, x[index + 0] ?? 0, 7, 0xd76aa478);
    d = ff(d, a, b, c, x[index + 1] ?? 0, 12, 0xe8c7b756);
    c = ff(c, d, a, b, x[index + 2] ?? 0, 17, 0x242070db);
    b = ff(b, c, d, a, x[index + 3] ?? 0, 22, 0xc1bdceee);
    a = ff(a, b, c, d, x[index + 4] ?? 0, 7, 0xf57c0faf);
    d = ff(d, a, b, c, x[index + 5] ?? 0, 12, 0x4787c62a);
    c = ff(c, d, a, b, x[index + 6] ?? 0, 17, 0xa8304613);
    b = ff(b, c, d, a, x[index + 7] ?? 0, 22, 0xfd469501);
    a = ff(a, b, c, d, x[index + 8] ?? 0, 7, 0x698098d8);
    d = ff(d, a, b, c, x[index + 9] ?? 0, 12, 0x8b44f7af);
    c = ff(c, d, a, b, x[index + 10] ?? 0, 17, 0xffff5bb1);
    b = ff(b, c, d, a, x[index + 11] ?? 0, 22, 0x895cd7be);
    a = ff(a, b, c, d, x[index + 12] ?? 0, 7, 0x6b901122);
    d = ff(d, a, b, c, x[index + 13] ?? 0, 12, 0xfd987193);
    c = ff(c, d, a, b, x[index + 14] ?? 0, 17, 0xa679438e);
    b = ff(b, c, d, a, x[index + 15] ?? 0, 22, 0x49b40821);

    a = gg(a, b, c, d, x[index + 1] ?? 0, 5, 0xf61e2562);
    d = gg(d, a, b, c, x[index + 6] ?? 0, 9, 0xc040b340);
    c = gg(c, d, a, b, x[index + 11] ?? 0, 14, 0x265e5a51);
    b = gg(b, c, d, a, x[index + 0] ?? 0, 20, 0xe9b6c7aa);
    a = gg(a, b, c, d, x[index + 5] ?? 0, 5, 0xd62f105d);
    d = gg(d, a, b, c, x[index + 10] ?? 0, 9, 0x02441453);
    c = gg(c, d, a, b, x[index + 15] ?? 0, 14, 0xd8a1e681);
    b = gg(b, c, d, a, x[index + 4] ?? 0, 20, 0xe7d3fbc8);
    a = gg(a, b, c, d, x[index + 9] ?? 0, 5, 0x21e1cde6);
    d = gg(d, a, b, c, x[index + 14] ?? 0, 9, 0xc33707d6);
    c = gg(c, d, a, b, x[index + 3] ?? 0, 14, 0xf4d50d87);
    b = gg(b, c, d, a, x[index + 8] ?? 0, 20, 0x455a14ed);
    a = gg(a, b, c, d, x[index + 13] ?? 0, 5, 0xa9e3e905);
    d = gg(d, a, b, c, x[index + 2] ?? 0, 9, 0xfcefa3f8);
    c = gg(c, d, a, b, x[index + 7] ?? 0, 14, 0x676f02d9);
    b = gg(b, c, d, a, x[index + 12] ?? 0, 20, 0x8d2a4c8a);

    a = hh(a, b, c, d, x[index + 5] ?? 0, 4, 0xfffa3942);
    d = hh(d, a, b, c, x[index + 8] ?? 0, 11, 0x8771f681);
    c = hh(c, d, a, b, x[index + 11] ?? 0, 16, 0x6d9d6122);
    b = hh(b, c, d, a, x[index + 14] ?? 0, 23, 0xfde5380c);
    a = hh(a, b, c, d, x[index + 1] ?? 0, 4, 0xa4beea44);
    d = hh(d, a, b, c, x[index + 4] ?? 0, 11, 0x4bdecfa9);
    c = hh(c, d, a, b, x[index + 7] ?? 0, 16, 0xf6bb4b60);
    b = hh(b, c, d, a, x[index + 10] ?? 0, 23, 0xbebfbc70);
    a = hh(a, b, c, d, x[index + 13] ?? 0, 4, 0x289b7ec6);
    d = hh(d, a, b, c, x[index + 0] ?? 0, 11, 0xeaa127fa);
    c = hh(c, d, a, b, x[index + 3] ?? 0, 16, 0xd4ef3085);
    b = hh(b, c, d, a, x[index + 6] ?? 0, 23, 0x04881d05);
    a = hh(a, b, c, d, x[index + 9] ?? 0, 4, 0xd9d4d039);
    d = hh(d, a, b, c, x[index + 12] ?? 0, 11, 0xe6db99e5);
    c = hh(c, d, a, b, x[index + 15] ?? 0, 16, 0x1fa27cf8);
    b = hh(b, c, d, a, x[index + 2] ?? 0, 23, 0xc4ac5665);

    a = ii(a, b, c, d, x[index + 0] ?? 0, 6, 0xf4292244);
    d = ii(d, a, b, c, x[index + 7] ?? 0, 10, 0x432aff97);
    c = ii(c, d, a, b, x[index + 14] ?? 0, 15, 0xab9423a7);
    b = ii(b, c, d, a, x[index + 5] ?? 0, 21, 0xfc93a039);
    a = ii(a, b, c, d, x[index + 12] ?? 0, 6, 0x655b59c3);
    d = ii(d, a, b, c, x[index + 3] ?? 0, 10, 0x8f0ccc92);
    c = ii(c, d, a, b, x[index + 10] ?? 0, 15, 0xffeff47d);
    b = ii(b, c, d, a, x[index + 1] ?? 0, 21, 0x85845dd1);
    a = ii(a, b, c, d, x[index + 8] ?? 0, 6, 0x6fa87e4f);
    d = ii(d, a, b, c, x[index + 15] ?? 0, 10, 0xfe2ce6e0);
    c = ii(c, d, a, b, x[index + 6] ?? 0, 15, 0xa3014314);
    b = ii(b, c, d, a, x[index + 13] ?? 0, 21, 0x4e0811a1);
    a = ii(a, b, c, d, x[index + 4] ?? 0, 6, 0xf7537e82);
    d = ii(d, a, b, c, x[index + 11] ?? 0, 10, 0xbd3af235);
    c = ii(c, d, a, b, x[index + 2] ?? 0, 15, 0x2ad7d2bb);
    b = ii(b, c, d, a, x[index + 9] ?? 0, 21, 0xeb86d391);

    a = (a + oldA) | 0;
    b = (b + oldB) | 0;
    c = (c + oldC) | 0;
    d = (d + oldD) | 0;
  }

  return (toHex(a) + toHex(b) + toHex(c) + toHex(d)).toLowerCase();
}

async function digest(algorithm: 'SHA-1' | 'SHA-256', input: string): Promise<string> {
  const buffer = await crypto.subtle.digest(algorithm, new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export default function HashCryptoGenerator() {
  const [input, setInput] = useState('');
  const [copiedTarget, setCopiedTarget] = useState<keyof Omit<HashState, 'error'> | null>(null);
  const [hashes, setHashes] = useState<HashState>({
    md5: '',
    sha1: '',
    sha256: '',
    bcrypt: '',
    error: '',
  });

  useEffect(() => {
    let cancelled = false;

    const generate = async () => {
      if (!input) {
        setHashes({ md5: '', sha1: '', sha256: '', bcrypt: '', error: '' });
        return;
      }

      try {
        const md5Value = md5(input);
        const [sha1Value, sha256Value, bcryptValue] = await Promise.all([
          digest('SHA-1', input),
          digest('SHA-256', input),
          bcrypt.hash(input, 10),
        ]);

        if (cancelled) return;

        setHashes({
          md5: md5Value,
          sha1: sha1Value,
          sha256: sha256Value,
          bcrypt: bcryptValue,
          error: '',
        });
      } catch {
        if (cancelled) return;

        setHashes((current) => ({
          ...current,
          error: 'Unable to generate one or more hashes in this browser context.',
        }));
      }
    };

    generate();

    return () => {
      cancelled = true;
    };
  }, [input]);

  const copyHash = async (target: keyof Omit<HashState, 'error'>) => {
    const value = hashes[target];
    if (!value) return;

    await navigator.clipboard.writeText(value);
    setCopiedTarget(target);
    setTimeout(() => setCopiedTarget(null), 1200);
  };

  return (
    <div className="space-y-6">
      <div className="mb-2 flex items-center gap-3">
        <div className="rounded-lg border border-border bg-card p-2.5">
          <HiOutlineFingerPrint size={22} className="text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Hash and Crypto Generator</h2>
          <p className="text-sm text-muted-foreground">
            Generate MD5, SHA-1, SHA-256, and bcrypt hashes as you type using browser-side cryptography.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Input</CardTitle>
          <CardDescription>Type any text to derive hash outputs immediately.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type text to hash..."
            className="font-mono"
          />

          {hashes.error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/35 bg-destructive/10 p-3 text-sm text-destructive">
              <HiOutlineExclamationTriangle size={16} className="mt-0.5 shrink-0" />
              <p>{hashes.error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {[
          { key: 'md5', label: 'MD5' },
          { key: 'sha1', label: 'SHA-1' },
          { key: 'sha256', label: 'SHA-256' },
        ].map((item) => {
          const key = item.key as keyof Omit<HashState, 'error'>;

          return (
            <Card key={item.key}>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base">{item.label}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => copyHash(key)}
                  disabled={!hashes[key]}
                >
                  {copiedTarget === key ? <HiOutlineCheck size={14} /> : <HiOutlineClipboardDocument size={14} />}
                  {copiedTarget === key ? 'Copied' : 'Copy'}
                </Button>
              </CardHeader>
              <CardContent>
                <Input value={hashes[key]} readOnly className="font-mono text-xs" placeholder="Hash output..." />
              </CardContent>
            </Card>
          );
        })}

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">bcrypt</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => copyHash('bcrypt')}
              disabled={!hashes.bcrypt}
            >
              {copiedTarget === 'bcrypt' ? <HiOutlineCheck size={14} /> : <HiOutlineClipboardDocument size={14} />}
              {copiedTarget === 'bcrypt' ? 'Copied' : 'Copy'}
            </Button>
          </CardHeader>
          <CardContent>
            <Textarea rows={3} value={hashes.bcrypt} readOnly className="font-mono text-xs" placeholder="bcrypt output..." />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
