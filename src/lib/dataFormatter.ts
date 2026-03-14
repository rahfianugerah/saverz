export type StructuredInputMode = 'auto' | 'csv' | 'tsv' | 'logs' | 'ndjson' | 'kv';

function splitDelimitedLine(line: string, delimiter: ',' | '\t'): string[] {
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

    if (char === delimiter && !inQuotes) {
      fields.push(value.trim());
      value = '';
      continue;
    }

    value += char;
  }

  fields.push(value.trim());
  return fields;
}

function parsePrimitive(value: string): string | number | boolean | null {
  const trimmed = value.trim();
  if (trimmed === '') return '';
  if (trimmed === 'null') return null;
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  const numeric = Number(trimmed);
  if (!Number.isNaN(numeric)) {
    return numeric;
  }

  return value;
}

function looksLikeDelimited(input: string, delimiter: ',' | '\t') {
  const rows = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (rows.length < 2) return false;
  return rows[0].includes(delimiter) && rows[1].includes(delimiter);
}

function looksLikeNdjson(input: string) {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return false;
  return lines.every((line) => line.startsWith('{') || line.startsWith('['));
}

function looksLikeKeyValueLines(input: string) {
  return /^\s*[A-Za-z_][\w.-]*\s*=\s*.+$/m.test(input);
}

function looksLikeLogLines(input: string) {
  return /\b(?:INFO|WARN|ERROR|DEBUG|TRACE)\b/i.test(input) || /\[[^\]]+\]\s+/.test(input);
}

function parseDelimitedToJson(input: string, delimiter: ',' | '\t'): Record<string, unknown>[] {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error('Delimited data needs at least a header row and one data row.');
  }

  const headers = splitDelimitedLine(lines[0], delimiter);
  if (headers.length === 0) {
    throw new Error('Header row is empty.');
  }

  return lines.slice(1).map((line, rowIndex) => {
    const columns = splitDelimitedLine(line, delimiter);
    const record: Record<string, unknown> = { _row: rowIndex + 1 };

    headers.forEach((header, index) => {
      const key = header || `column_${index + 1}`;
      record[key] = parsePrimitive(columns[index] ?? '');
    });

    if (columns.length > headers.length) {
      record._extra = columns.slice(headers.length).map((value) => parsePrimitive(value));
    }

    return record;
  });
}

export function parseCsvToJson(input: string): Record<string, unknown>[] {
  return parseDelimitedToJson(input, ',');
}

export function parseTsvToJson(input: string): Record<string, unknown>[] {
  return parseDelimitedToJson(input, '\t');
}

export function parseNdjsonToJson(input: string): Record<string, unknown>[] {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line, index) => {
    try {
      const parsed = JSON.parse(line);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return { _line: index + 1, ...parsed };
      }

      return {
        _line: index + 1,
        value: parsed,
      };
    } catch {
      throw new Error(`Invalid NDJSON line ${index + 1}.`);
    }
  });
}

export function parseKeyValueLinesToJson(input: string): Record<string, unknown>[] {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line, index) => {
    const match = line.match(/^([A-Za-z_][\w.-]*)\s*=\s*(.*)$/);
    if (!match) {
      return { _line: index + 1, line };
    }

    return {
      _line: index + 1,
      key: match[1],
      value: parsePrimitive(match[2]),
    };
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
    const record: Record<string, unknown> = { _line: index + 1, message: line };
    const levelMatch = line.match(/\b(INFO|WARN|ERROR|DEBUG|TRACE)\b/i);
    if (levelMatch) {
      record.level = levelMatch[1].toUpperCase();
    }

    const timestampMatch = line.match(/\b\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+\-]\d{2}:\d{2})?\b/);
    if (timestampMatch) {
      record.timestamp = timestampMatch[0];
    }

    const kvPairs = [...line.matchAll(/([A-Za-z_][\w.-]*)=("[^"]*"|'[^']*'|\S+)/g)];
    for (const [, key, raw] of kvPairs) {
      const normalized = raw.replace(/^['"]|['"]$/g, '');
      record[key] = parsePrimitive(normalized);
    }

    return record;
  });
}

export function parseStructuredInput(input: string, mode: StructuredInputMode): Record<string, unknown>[] {
  if (!input.trim()) {
    return [];
  }

  const resolvedMode: Exclude<StructuredInputMode, 'auto'> =
    mode === 'auto'
      ? looksLikeDelimited(input, ',')
        ? 'csv'
        : looksLikeDelimited(input, '\t')
          ? 'tsv'
          : looksLikeNdjson(input)
            ? 'ndjson'
            : looksLikeKeyValueLines(input)
              ? 'kv'
              : looksLikeLogLines(input)
                ? 'logs'
                : 'logs'
      : mode;

  if (resolvedMode === 'csv') {
    return parseCsvToJson(input);
  }

  if (resolvedMode === 'tsv') {
    return parseTsvToJson(input);
  }

  if (resolvedMode === 'ndjson') {
    return parseNdjsonToJson(input);
  }

  if (resolvedMode === 'kv') {
    return parseKeyValueLinesToJson(input);
  }

  return parseLogsToJson(input);
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function safeXmlTagName(name: string) {
  const normalized = name.replace(/[^A-Za-z0-9_.-]/g, '_');
  return /^[A-Za-z_]/.test(normalized) ? normalized : `node_${normalized}`;
}

function ensureXmlDocument(input: string): Document {
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(input, 'application/xml');
  const parserError = documentNode.querySelector('parsererror');

  if (parserError) {
    throw new Error(parserError.textContent?.trim() || 'Invalid XML input.');
  }

  return documentNode;
}

function elementToJsonValue(element: Element): unknown {
  const attributes = [...element.attributes];
  const childElements = [...element.children];
  const text = [...element.childNodes]
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent?.trim() ?? '')
    .join(' ')
    .trim();

  if (attributes.length === 0 && childElements.length === 0) {
    return parsePrimitive(text);
  }

  const output: Record<string, unknown> = {};

  if (attributes.length > 0) {
    output['@attributes'] = attributes.reduce<Record<string, string>>((acc, attribute) => {
      acc[attribute.name] = attribute.value;
      return acc;
    }, {});
  }

  if (text) {
    output['#text'] = parsePrimitive(text);
  }

  for (const child of childElements) {
    const childValue = elementToJsonValue(child);
    const existing = output[child.tagName];

    if (existing === undefined) {
      output[child.tagName] = childValue;
    } else if (Array.isArray(existing)) {
      existing.push(childValue);
    } else {
      output[child.tagName] = [existing, childValue];
    }
  }

  return output;
}

function buildXmlNode(name: string, value: unknown, level: number, indentText: string): string {
  const indent = indentText.repeat(level);
  const tagName = safeXmlTagName(name);

  if (value === null || value === undefined) {
    return `${indent}<${tagName} />`;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => buildXmlNode(name, entry, level, indentText)).join('\n');
  }

  if (typeof value !== 'object') {
    return `${indent}<${tagName}>${escapeXml(String(value))}</${tagName}>`;
  }

  const valueObject = value as Record<string, unknown>;
  const attrsObject =
    valueObject['@attributes'] && typeof valueObject['@attributes'] === 'object' && !Array.isArray(valueObject['@attributes'])
      ? (valueObject['@attributes'] as Record<string, unknown>)
      : undefined;
  const textValue = valueObject['#text'];
  const childKeys = Object.keys(valueObject).filter((key) => key !== '@attributes' && key !== '#text');

  const attrs = attrsObject
    ? Object.entries(attrsObject)
        .map(([key, attrValue]) => `${safeXmlTagName(key)}="${escapeXml(String(attrValue ?? ''))}"`)
        .join(' ')
    : '';
  const openTag = attrs ? `<${tagName} ${attrs}>` : `<${tagName}>`;

  if (childKeys.length === 0) {
    if (textValue === undefined || textValue === null || textValue === '') {
      return `${indent}${attrs ? `<${tagName} ${attrs} />` : `<${tagName} />`}`;
    }

    return `${indent}${openTag}${escapeXml(String(textValue))}</${tagName}>`;
  }

  const children = childKeys
    .map((key) => buildXmlNode(key, valueObject[key], level + 1, indentText))
    .filter(Boolean)
    .join('\n');
  const textContent = textValue === undefined || textValue === null || textValue === '' ? '' : `\n${indentText.repeat(level + 1)}${escapeXml(String(textValue))}`;

  return `${indent}${openTag}${textContent}${children ? `\n${children}` : ''}\n${indent}</${tagName}>`;
}

function formatXmlElement(element: Element, level: number, indentText: string): string {
  const indent = indentText.repeat(level);
  const attributes = [...element.attributes]
    .map((attribute) => `${attribute.name}="${escapeXml(attribute.value)}"`)
    .join(' ');
  const openTag = attributes ? `<${element.tagName} ${attributes}>` : `<${element.tagName}>`;

  const childElements = [...element.children];
  const textChunks = [...element.childNodes]
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent?.trim() ?? '')
    .filter(Boolean);

  if (childElements.length === 0 && textChunks.length === 0) {
    return `${indent}${attributes ? `<${element.tagName} ${attributes} />` : `<${element.tagName} />`}`;
  }

  if (childElements.length === 0) {
    return `${indent}${openTag}${escapeXml(textChunks.join(' '))}</${element.tagName}>`;
  }

  const formattedChildren = childElements
    .map((child) => formatXmlElement(child, level + 1, indentText))
    .join('\n');

  return `${indent}${openTag}\n${formattedChildren}\n${indent}</${element.tagName}>`;
}

export function formatXml(input: string, mode: 'beautify' | 'minify') {
  const xmlDocument = ensureXmlDocument(input);
  const serializer = new XMLSerializer();
  const hasDeclaration = input.trim().startsWith('<?xml');
  const declaration = hasDeclaration ? '<?xml version="1.0" encoding="UTF-8"?>\n' : '';

  if (mode === 'minify') {
    const serialized = serializer.serializeToString(xmlDocument.documentElement);
    return `${declaration}${serialized.replace(/>\s+</g, '><').trim()}`;
  }

  return `${declaration}${formatXmlElement(xmlDocument.documentElement, 0, '  ')}`;
}

export function convertXmlToJson(input: string) {
  const xmlDocument = ensureXmlDocument(input);
  const root = xmlDocument.documentElement;
  const output = {
    [root.tagName]: elementToJsonValue(root),
  };

  return JSON.stringify(output, null, 2);
}

export function convertJsonToXml(input: string, rootName = 'root') {
  const parsed = JSON.parse(input) as unknown;

  if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
    const entries = Object.entries(parsed as Record<string, unknown>);
    if (entries.length === 1) {
      const [singleRoot, value] = entries[0];
      return buildXmlNode(singleRoot, value, 0, '  ');
    }
  }

  return buildXmlNode(rootName, parsed, 0, '  ');
}

export function formatJson(input: string, mode: 'beautify' | 'minify') {
  const parsed = JSON.parse(input);
  return mode === 'beautify' ? JSON.stringify(parsed, null, 2) : JSON.stringify(parsed);
}
