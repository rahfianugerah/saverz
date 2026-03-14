interface ToonOptions {
  dropKeys: string[];
  maxFlattenDepth?: number;
}

interface ToonStats {
  removedFields: number;
  keptFields: number;
}

export interface ToonResult {
  toonString: string;
  flattenedCount: number;
  removedFields: number;
  keptFields: number;
}

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function isObject(value: JsonValue): value is { [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMeaningful(value: JsonValue | undefined) {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (isObject(value)) return Object.keys(value).length > 0;
  return true;
}

function sanitize(value: JsonValue, options: ToonOptions, stats: ToonStats): JsonValue | undefined {
  if (Array.isArray(value)) {
    const sanitizedArray = value
      .map((item) => sanitize(item, options, stats))
      .filter((item): item is JsonValue => item !== undefined);

    if (sanitizedArray.length === 0) {
      return undefined;
    }

    return sanitizedArray;
  }

  if (isObject(value)) {
    const output: Record<string, JsonValue> = {};

    for (const [key, child] of Object.entries(value)) {
      if (options.dropKeys.includes(key)) {
        stats.removedFields += 1;
        continue;
      }

      const sanitizedChild = sanitize(child, options, stats);
      if (sanitizedChild === undefined || !isMeaningful(sanitizedChild)) {
        stats.removedFields += 1;
        continue;
      }

      output[key] = sanitizedChild;
      stats.keptFields += 1;
    }

    if (Object.keys(output).length === 0) {
      return undefined;
    }

    return output;
  }

  if (!isMeaningful(value)) {
    return undefined;
  }

  return value;
}

function flatten(
  value: JsonValue,
  output: Record<string, JsonValue>,
  path = '',
  depth = 0,
  maxDepth = 4
): void {
  if (depth > maxDepth) {
    output[path || 'root'] = value;
    return;
  }

  if (Array.isArray(value)) {
    const allPrimitive = value.every((item) => !Array.isArray(item) && !isObject(item));
    if (allPrimitive) {
      output[path || 'root'] = value;
      return;
    }

    value.forEach((item, index) => {
      const nextPath = path ? `${path}[${index}]` : `[${index}]`;
      flatten(item, output, nextPath, depth + 1, maxDepth);
    });
    return;
  }

  if (isObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      const nextPath = path ? `${path}.${key}` : key;
      flatten(child, output, nextPath, depth + 1, maxDepth);
    }
    return;
  }

  output[path || 'root'] = value;
}

function encodeValue(value: JsonValue) {
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}

export function convertJsonToToon(input: JsonValue, options: ToonOptions): ToonResult {
  const stats: ToonStats = { removedFields: 0, keptFields: 0 };
  const sanitized = sanitize(input, options, stats);

  if (!sanitized) {
    return {
      toonString: '',
      flattenedCount: 0,
      removedFields: stats.removedFields,
      keptFields: stats.keptFields,
    };
  }

  const flattened: Record<string, JsonValue> = {};
  flatten(sanitized, flattened, '', 0, options.maxFlattenDepth ?? 4);

  const segments = Object.entries(flattened)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${encodeValue(value)}`);

  return {
    toonString: segments.join('|'),
    flattenedCount: segments.length,
    removedFields: stats.removedFields,
    keptFields: stats.keptFields,
  };
}
