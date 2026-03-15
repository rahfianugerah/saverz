import React, { useState } from 'react';
import {
  HiOutlineArrowsRightLeft,
  HiOutlineExclamationTriangle,
  HiOutlineTableCells,
  HiOutlineClipboardDocument,
  HiOutlineCheck,
} from 'react-icons/hi2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';

type CsvDelimiter = ',' | '\t';

function detectDelimiter(text: string): CsvDelimiter {
  const firstLine = text
    .split(/\r?\n/)
    .find((line) => line.trim().length > 0);

  if (!firstLine) return ',';

  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const tabCount = (firstLine.match(/\t/g) ?? []).length;
  return tabCount > commaCount ? '\t' : ',';
}

function parseDelimited(text: string, delimiter: CsvDelimiter): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }

      row.push(field);
      field = '';

      if (row.some((cell) => cell.trim().length > 0)) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.trim().length > 0)) {
      rows.push(row);
    }
  }

  return rows;
}

function normalizeRows(rows: string[][]): string[][] {
  if (rows.length === 0) return rows;
  const maxCols = Math.max(...rows.map((row) => row.length));

  return rows.map((row) => Array.from({ length: maxCols }, (_, index) => (row[index] ?? '').trim()));
}

function escapeMarkdownCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br/>');
}

function parseMarkdownRow(line: string): string[] {
  const trimmed = line.trim();
  const withoutBoundary = trimmed.replace(/^\|\s*/, '').replace(/\s*\|$/, '');

  const cells: string[] = [];
  let cell = '';

  for (let index = 0; index < withoutBoundary.length; index += 1) {
    const char = withoutBoundary[index];
    const next = withoutBoundary[index + 1];

    if (char === '\\' && next === '|') {
      cell += '|';
      index += 1;
      continue;
    }

    if (char === '|') {
      cells.push(cell.trim().replace(/<br\s*\/?\s*>/gi, '\n'));
      cell = '';
      continue;
    }

    cell += char;
  }

  cells.push(cell.trim().replace(/<br\s*\/?\s*>/gi, '\n'));
  return cells;
}

function isDividerRow(row: string[]): boolean {
  return row.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function escapeCsvCell(value: string, delimiter: CsvDelimiter): string {
  const escaped = value.replace(/"/g, '""');
  const needsQuoting = escaped.includes(delimiter) || /[\n\r"]/g.test(escaped);
  return needsQuoting ? `"${escaped}"` : escaped;
}

function csvToMarkdown(input: string): string {
  if (!input.trim()) return '';

  const delimiter = detectDelimiter(input);
  const rows = normalizeRows(parseDelimited(input, delimiter));
  if (rows.length === 0) return '';

  const header = rows[0];
  const body = rows.slice(1);
  const divider = header.map(() => '---');

  const toLine = (cells: string[]) => `| ${cells.map(escapeMarkdownCell).join(' | ')} |`;

  return [toLine(header), toLine(divider), ...body.map(toLine)].join('\n');
}

function markdownToCsv(input: string, delimiter: CsvDelimiter): string {
  if (!input.trim()) return '';

  const rawLines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.includes('|'));

  const rows = rawLines.map(parseMarkdownRow).filter((row) => row.some((cell) => cell.length > 0));
  if (rows.length === 0) return '';

  const withoutDividers = rows.filter((row) => !isDividerRow(row));
  const normalized = normalizeRows(withoutDividers);

  return normalized
    .map((row) => row.map((cell) => escapeCsvCell(cell, delimiter)).join(delimiter))
    .join('\n');
}

export default function MarkdownCsvConverter() {
  const [csv, setCsv] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [error, setError] = useState('');
  const [copiedSide, setCopiedSide] = useState<'csv' | 'markdown' | null>(null);
  const [delimiter, setDelimiter] = useState<CsvDelimiter>(',');

  const handleCsvChange = (value: string) => {
    setCsv(value);
    setError('');

    try {
      const nextDelimiter = detectDelimiter(value);
      setDelimiter(nextDelimiter);
      setMarkdown(csvToMarkdown(value));
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Unable to parse CSV input.';
      setError(message);
    }
  };

  const handleMarkdownChange = (value: string) => {
    setMarkdown(value);
    setError('');

    try {
      setCsv(markdownToCsv(value, delimiter));
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Unable to parse Markdown table.';
      setError(message);
    }
  };

  const handleCopy = async (side: 'csv' | 'markdown') => {
    const value = side === 'csv' ? csv : markdown;
    if (!value.trim()) return;

    await navigator.clipboard.writeText(value);
    setCopiedSide(side);
    setTimeout(() => setCopiedSide(null), 1200);
  };

  return (
    <div className="space-y-6">
      <div className="mb-2 flex items-center gap-3">
        <div className="rounded-lg border border-border bg-card p-2.5">
          <HiOutlineTableCells size={22} className="text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Markdown Table and CSV Converter</h2>
          <p className="text-sm text-muted-foreground">
            Paste CSV or Excel-style tabular text on the left, or paste Markdown tables on the right for instant reverse conversion.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HiOutlineArrowsRightLeft size={18} className="text-primary" />
            Bidirectional Conversion
          </CardTitle>
          <CardDescription>
            Auto-detects comma or tab delimiters from CSV input and preserves quoted values when converting.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/35 bg-destructive/10 p-3 text-sm text-destructive">
              <HiOutlineExclamationTriangle size={16} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">CSV / Excel</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => handleCopy('csv')}
                  disabled={!csv.trim()}
                >
                  {copiedSide === 'csv' ? <HiOutlineCheck size={14} /> : <HiOutlineClipboardDocument size={14} />}
                  {copiedSide === 'csv' ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <Textarea
                rows={16}
                value={csv}
                onChange={(event) => handleCsvChange(event.target.value)}
                placeholder="name,age,role\nAlya,23,Engineer"
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Markdown Table</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => handleCopy('markdown')}
                  disabled={!markdown.trim()}
                >
                  {copiedSide === 'markdown' ? <HiOutlineCheck size={14} /> : <HiOutlineClipboardDocument size={14} />}
                  {copiedSide === 'markdown' ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <Textarea
                rows={16}
                value={markdown}
                onChange={(event) => handleMarkdownChange(event.target.value)}
                placeholder="| name | age | role |\n| --- | --- | --- |\n| Alya | 23 | Engineer |"
                className="font-mono text-sm"
              />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background/50 px-3 py-2 text-xs text-muted-foreground">
            Current CSV delimiter: {delimiter === '\t' ? 'Tab' : 'Comma'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
