import React, { useMemo, useState } from 'react';
import {
  HiOutlineArrowTopRightOnSquare,
  HiOutlineCheck,
  HiOutlineClipboardDocument,
  HiOutlinePlus,
  HiOutlineTrash,
} from 'react-icons/hi2';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface HeaderField {
  id: string;
  key: string;
  value: string;
}

function createHeaderField(): HeaderField {
  return {
    id: crypto.randomUUID(),
    key: '',
    value: '',
  };
}

export default function ApiEndpointArchitect() {
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [baseUrl, setBaseUrl] = useState('https://api.example.com');
  const [path, setPath] = useState('/v1/resource');
  const [headers, setHeaders] = useState<HeaderField[]>([createHeaderField()]);
  const [bodySchema, setBodySchema] = useState('{\n  "name": "",\n  "email": ""\n}');
  const [copied, setCopied] = useState(false);

  const activeHeaders = useMemo(
    () => headers.filter((header) => header.key.trim() || header.value.trim()),
    [headers]
  );

  const parsedBody = useMemo(() => {
    if (!bodySchema.trim()) {
      return { value: null as unknown, error: '' };
    }

    try {
      return { value: JSON.parse(bodySchema), error: '' };
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Invalid JSON.';
      return { value: null as unknown, error: message };
    }
  }, [bodySchema]);

  const blueprint = useMemo(() => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return {
      method,
      endpoint: `${baseUrl.replace(/\/$/, '')}${normalizedPath}`,
      baseUrl,
      path: normalizedPath,
      headers: activeHeaders,
      bodySchema: parsedBody.value,
    };
  }, [activeHeaders, baseUrl, method, parsedBody.value, path]);

  const curlPreview = useMemo(() => {
    const lines = [`curl -X ${method} "${blueprint.endpoint}"`];

    activeHeaders.forEach((header) => {
      lines.push(`  -H "${header.key}: ${header.value}"`);
    });

    if (method !== 'GET' && method !== 'DELETE' && parsedBody.value) {
      lines.push(`  -d '${JSON.stringify(parsedBody.value)}'`);
    }

    return lines.join(' \\\n');
  }, [activeHeaders, blueprint.endpoint, method, parsedBody.value]);

  const updateHeader = (id: string, field: 'key' | 'value', value: string) => {
    setHeaders((current) => current.map((header) => (header.id === id ? { ...header, [field]: value } : header)));
  };

  const addHeader = () => {
    setHeaders((current) => [...current, createHeaderField()]);
  };

  const removeHeader = (id: string) => {
    setHeaders((current) => {
      const next = current.filter((header) => header.id !== id);
      return next.length > 0 ? next : [createHeaderField()];
    });
  };

  const handleCopyBlueprint = async () => {
    await navigator.clipboard.writeText(JSON.stringify(blueprint, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="space-y-6">
      <div className="mb-2 flex items-center gap-3">
        <div className="rounded-lg border border-border bg-card p-2.5">
          <HiOutlineArrowTopRightOnSquare size={22} className="text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">API Endpoint Architect</h2>
          <p className="text-sm text-muted-foreground">Blueprint methods, paths, headers, and request schema before implementation.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Endpoint Builder</CardTitle>
            <CardDescription>Define method, URL, required headers, and a request body schema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[auto_1fr]">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Method</label>
                <select
                  value={method}
                  onChange={(event) => setMethod(event.target.value as HttpMethod)}
                  className="w-32"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Base URL</label>
                <Input
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                  placeholder="https://api.example.com"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Path</label>
              <Input
                value={path}
                onChange={(event) => setPath(event.target.value)}
                placeholder="/v1/users/{id}"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">Required Headers</label>
                <Button onClick={addHeader} variant="ghost" size="sm" className="gap-1">
                  <HiOutlinePlus size={14} />
                  Add Header
                </Button>
              </div>
              <div className="space-y-2">
                {headers.map((header) => (
                  <div key={header.id} className="grid grid-cols-1 gap-2 rounded-lg border border-border/70 bg-background/35 p-2 md:grid-cols-[1fr_1fr_auto]">
                    <Input
                      value={header.key}
                      onChange={(event) => updateHeader(header.id, 'key', event.target.value)}
                      placeholder="Authorization"
                    />
                    <Input
                      value={header.value}
                      onChange={(event) => updateHeader(header.id, 'value', event.target.value)}
                      placeholder="Bearer <token>"
                    />
                    <Button
                      onClick={() => removeHeader(header.id)}
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-destructive"
                      aria-label="Remove header"
                    >
                      <HiOutlineTrash size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Request Body Schema (JSON)</label>
              <Textarea
                value={bodySchema}
                onChange={(event) => setBodySchema(event.target.value)}
                rows={12}
                className="h-[280px] resize-none overflow-y-auto scrollbar-hidden font-mono text-sm"
                placeholder={'{\n  "field": "value"\n}'}
              />
              {parsedBody.error && <p className="mt-1 text-xs text-destructive">{parsedBody.error}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle>Blueprint Preview</CardTitle>
              <CardDescription>Generated endpoint spec and cURL command for implementation handoff.</CardDescription>
            </div>
            <Button onClick={handleCopyBlueprint} variant="secondary" size="sm" className="gap-1.5">
              {copied ? <HiOutlineCheck size={14} /> : <HiOutlineClipboardDocument size={14} />}
              {copied ? 'Copied' : 'Copy Blueprint'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Structured Blueprint</p>
              <pre className="h-[230px] overflow-y-auto scrollbar-hidden rounded-md border border-border bg-background/70 p-3 font-mono text-xs leading-relaxed text-foreground/90">
                {JSON.stringify(blueprint, null, 2)}
              </pre>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">cURL Preview</p>
              <pre className="h-[190px] overflow-y-auto scrollbar-hidden rounded-md border border-border bg-background/70 p-3 font-mono text-xs leading-relaxed text-foreground/90">
                {curlPreview}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
