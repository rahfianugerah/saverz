export type StructuredInputMode = 'auto' | 'csv' | 'logs';

function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let value = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      fields.push(value.trim());
      value = '';
      continue;
    }

    value += char;
  }

  fields.push(value.trim());
  return fields;
}

function looksLikeCsv(input: string) {
  const rows = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return rows.length > 1 && rows[0].includes(',');
}

function looksLikeLogLines(input: string) {
  return /(\w+)=/.test(input) || /\[[^\]]+\]\s+/.test(input);
}

function parsePrimitive(value: string): string | number | boolean | null {
  if (value === '') return '';
  if (value === 'null') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;

  const numeric = Number(value);
  if (!Number.isNaN(numeric) && value.trim() !== '') {
    return numeric;
  }

  return value;
}

export function parseCsvToJson(input: string): Record<string, unknown>[] {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error('CSV needs at least a header row and one data row.');
  }

  const headers = splitCsvLine(lines[0]);
  if (headers.length === 0) {
    throw new Error('CSV header row is empty.');
  }

  return lines.slice(1).map((line, rowIndex) => {
    const columns = splitCsvLine(line);
    const record: Record<string, unknown> = {};

    headers.forEach((header, index) => {
      const key = header || `column_${index + 1}`;
      record[key] = parsePrimitive(columns[index] ?? '');
    });

    if (columns.length > headers.length) {
      record._extra = columns.slice(headers.length).map((value) => parsePrimitive(value));
    }

    record._row = rowIndex + 1;
    return record;
  });
}

export function parseLogsToJson(input: string): Record<string, unknown>[] {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  return lines.map((line, index) => {
    const kvPairs = [...line.matchAll(/([A-Za-z_][\w-]*)=("[^"]*"|\S+)/g)];

    if (kvPairs.length === 0) {
      return { index: index + 1, line };
    }

    const record: Record<string, unknown> = { index: index + 1 };
    for (const [, key, raw] of kvPairs) {
      const value = raw.startsWith('"') && raw.endsWith('"') ? raw.slice(1, -1) : raw;
      record[key] = parsePrimitive(value);
    }

    return record;
  });
}

export function parseStructuredInput(input: string, mode: StructuredInputMode): Record<string, unknown>[] {
  if (!input.trim()) {
    return [];
  }

  const resolvedMode =
    mode === 'auto'
      ? looksLikeCsv(input)
        ? 'csv'
        : looksLikeLogLines(input)
          ? 'logs'
          : 'logs'
      : mode;

  if (resolvedMode === 'csv') {
    return parseCsvToJson(input);
  }

  return parseLogsToJson(input);
}

export function formatJson(input: string, mode: 'beautify' | 'minify') {
  const parsed = JSON.parse(input);
  return mode === 'beautify' ? JSON.stringify(parsed, null, 2) : JSON.stringify(parsed);
}
