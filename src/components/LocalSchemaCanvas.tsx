import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addEdge,
  Background,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  SelectionMode,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type OnSelectionChangeParams,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  HiOutlineArrowsPointingIn,
  HiOutlineArrowsPointingOut,
  HiOutlineCheck,
  HiOutlineClipboardDocument,
  HiOutlineCubeTransparent,
  HiOutlineCursorArrowRays,
  HiOutlineDocumentArrowDown,
  HiOutlineDocumentText,
  HiOutlineMinus,
  HiOutlinePencilSquare,
  HiOutlinePhoto,
  HiOutlinePlus,
  HiOutlineSquaresPlus,
  HiOutlineTrash,
} from 'react-icons/hi2';
import { toJpeg, toPng, toSvg } from 'html-to-image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { cn } from '../lib/utils';

type ColumnType = 'Int' | 'VarChar' | 'Boolean' | 'UUID';
type RelationType = '1:1' | '1:n' | 'n:m';
type OutputTab = 'sql' | 'prisma' | 'manual';
type ActiveTool = 'select' | 'group' | 'note';

interface TableColumn {
  id: string;
  name: string;
  type: ColumnType;
}

interface TableNodeData {
  [key: string]: unknown;
  tableName: string;
  columns: TableColumn[];
  onTableNameChange: (nodeId: string, value: string) => void;
  onColumnChange: (nodeId: string, columnId: string, patch: Partial<Pick<TableColumn, 'name' | 'type'>>) => void;
  onAddColumn: (nodeId: string) => void;
  onDeleteColumn: (nodeId: string, columnId: string) => void;
}

interface StickyNoteData {
  [key: string]: unknown;
  text: string;
  onTextChange: (nodeId: string, text: string) => void;
}

interface GroupNodeData {
  [key: string]: unknown;
  title: string;
  onTitleChange: (nodeId: string, title: string) => void;
}

interface RelationEdgeData {
  [key: string]: unknown;
  relationType: RelationType;
}

interface ParsedTable {
  name: string;
  columns: TableColumn[];
}

interface ParsedRelation {
  sourceTable: string;
  sourceColumn?: string;
  targetTable: string;
  targetColumn: string;
  relationType: RelationType;
}

type TableFlowNode = Node<TableNodeData, 'table'>;
type NoteFlowNode = Node<StickyNoteData, 'note'>;
type GroupFlowNode = Node<GroupNodeData, 'group'>;
type FlowNode = TableFlowNode | NoteFlowNode | GroupFlowNode;
type FlowEdge = Edge<RelationEdgeData>;

const SQL_TYPE_MAP: Record<ColumnType, string> = {
  Int: 'INT',
  VarChar: 'VARCHAR(255)',
  Boolean: 'BOOLEAN',
  UUID: 'UUID',
};

const PRISMA_TYPE_MAP: Record<ColumnType, string> = {
  Int: 'Int',
  VarChar: 'String',
  Boolean: 'Boolean',
  UUID: 'String',
};

const CANVAS_NATIVE_SELECT_CLASS =
  'h-8 rounded-lg border border-input bg-background px-2 text-xs text-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:border-primary/45 hover:bg-accent/65';

function toSnakeCase(value: string): string {
  const sanitized = value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

  return sanitized || 'table_name';
}

function toPascalCase(value: string): string {
  const words = value
    .trim()
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);

  if (words.length === 0) return 'Model';
  return words.map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase()).join('');
}

function toCamelCase(value: string): string {
  const pascal = toPascalCase(value);
  return pascal[0].toLowerCase() + pascal.slice(1);
}

function createColumn(seed: number): TableColumn {
  return {
    id: `column-${seed}-${Math.random().toString(36).slice(2, 8)}`,
    name: seed === 0 ? 'id' : `column_${seed + 1}`,
    type: seed === 0 ? 'Int' : 'VarChar',
  };
}

function inferPrimaryColumn(columns: TableColumn[]): TableColumn {
  const explicit = columns.find((column) => column.name.trim().toLowerCase() === 'id');
  if (explicit) return explicit;
  if (columns.length > 0) return columns[0];

  return {
    id: 'id-fallback',
    name: 'id',
    type: 'Int',
  };
}

function mapSqlTypeToColumnType(rawType: string): ColumnType {
  const normalized = rawType.toLowerCase();
  if (normalized.includes('uuid')) return 'UUID';
  if (normalized.includes('bool')) return 'Boolean';
  if (normalized.includes('int')) return 'Int';
  return 'VarChar';
}

function splitTopLevelByComma(value: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];

    if (char === '(') depth += 1;
    if (char === ')') depth = Math.max(0, depth - 1);

    if (char === ',' && depth === 0) {
      const trimmed = current.trim();
      if (trimmed) parts.push(trimmed);
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

function parseCreateTableSql(input: string): { tables: ParsedTable[]; relations: ParsedRelation[] } {
  const tables: ParsedTable[] = [];
  const relations: ParsedRelation[] = [];
  const tableRegex = /CREATE\s+TABLE\s+([`"]?\w+[`"]?)\s*\(([^]*?)\)\s*;/gi;

  let match = tableRegex.exec(input);
  while (match) {
    const tableName = match[1].replace(/[`"]/g, '');
    const body = match[2];
    const definitions = splitTopLevelByComma(body);
    const columns: TableColumn[] = [];

    definitions.forEach((definition, index) => {
      const line = definition.trim();

      if (/^FOREIGN\s+KEY/i.test(line)) {
        const fkMatch = line.match(/FOREIGN\s+KEY\s*\(([`"]?\w+[`"]?)\)\s*REFERENCES\s+([`"]?\w+[`"]?)\s*\(([`"]?\w+[`"]?)\)/i);
        if (fkMatch) {
          relations.push({
            sourceTable: tableName,
            sourceColumn: fkMatch[1].replace(/[`"]/g, ''),
            targetTable: fkMatch[2].replace(/[`"]/g, ''),
            targetColumn: fkMatch[3].replace(/[`"]/g, ''),
            relationType: /UNIQUE/i.test(line) ? '1:1' : '1:n',
          });
        }
        return;
      }

      if (/^(PRIMARY|UNIQUE|CONSTRAINT|INDEX|KEY)/i.test(line)) return;

      const columnMatch = line.match(/^([`"]?\w+[`"]?)\s+([A-Za-z0-9_()]+)/i);
      if (!columnMatch) return;

      const columnName = columnMatch[1].replace(/[`"]/g, '');
      const sqlType = columnMatch[2];
      columns.push({
        id: `sql-column-${index}-${Math.random().toString(36).slice(2, 7)}`,
        name: columnName,
        type: mapSqlTypeToColumnType(sqlType),
      });
    });

    tables.push({
      name: tableName,
      columns: columns.length > 0 ? columns : [createColumn(0)],
    });

    match = tableRegex.exec(input);
  }

  return { tables, relations };
}

function buildSql(nodes: FlowNode[], edges: FlowEdge[]): string {
  const tableNodes = nodes.filter((node): node is TableFlowNode => node.type === 'table');
  if (tableNodes.length === 0) return '-- Add tables to start generating SQL';

  const nodeMap = new Map(tableNodes.map((node) => [node.id, node]));
  const manyToMany = edges.filter((edge) => edge.data?.relationType === 'n:m');
  const oneToX = edges.filter((edge) => edge.data?.relationType !== 'n:m');

  const relationMap = new Map<string, FlowEdge[]>();
  oneToX.forEach((relation) => {
    relationMap.set(relation.source, [...(relationMap.get(relation.source) ?? []), relation]);
  });

  const createTables = tableNodes.map((node) => {
    const tableName = toSnakeCase(node.data.tableName || 'table_name');
    const tableColumns = node.data.columns.filter((column) => column.name.trim().length > 0);
    const existingNames = new Set(tableColumns.map((column) => toSnakeCase(column.name)));

    const columnLines = tableColumns.map((column) => {
      const name = toSnakeCase(column.name);
      const type = SQL_TYPE_MAP[column.type];
      return name === 'id' ? `  ${name} ${type} PRIMARY KEY` : `  ${name} ${type}`;
    });

    if (columnLines.length === 0) columnLines.push('  id INT PRIMARY KEY');

    const relationLines: string[] = [];

    (relationMap.get(node.id) ?? []).forEach((edge) => {
      const targetNode = nodeMap.get(edge.target);
      if (!targetNode) return;

      const targetPrimary = inferPrimaryColumn(targetNode.data.columns);
      const fkType = targetPrimary.type === 'UUID' ? 'UUID' : 'Int';
      const fkColumn = toSnakeCase(`${toCamelCase(targetNode.data.tableName || 'target')}Id`);
      const targetTable = toSnakeCase(targetNode.data.tableName || 'table_name');
      const relationType = edge.data?.relationType ?? '1:n';

      if (!existingNames.has(fkColumn)) {
        columnLines.push(`  ${fkColumn} ${SQL_TYPE_MAP[fkType]}${relationType === '1:1' ? ' UNIQUE' : ''}`);
        existingNames.add(fkColumn);
      }

      relationLines.push(`  FOREIGN KEY (${fkColumn}) REFERENCES ${targetTable}(${toSnakeCase(targetPrimary.name)})`);
    });

    return `CREATE TABLE ${tableName} (\n${[...columnLines, ...relationLines].join(',\n')}\n);`;
  });

  const joinTables: string[] = [];
  const seenJoinNames = new Set<string>();

  manyToMany.forEach((edge) => {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    if (!source || !target) return;

    const sourceName = toSnakeCase(source.data.tableName || 'source');
    const targetName = toSnakeCase(target.data.tableName || 'target');
    const joinName = `${sourceName}_${targetName}_join`;
    if (seenJoinNames.has(joinName)) return;
    seenJoinNames.add(joinName);

    const sourcePk = inferPrimaryColumn(source.data.columns);
    const targetPk = inferPrimaryColumn(target.data.columns);
    const sourceFk = `${sourceName}_id`;
    const targetFk = `${targetName}_id`;

    joinTables.push(
      `CREATE TABLE ${joinName} (\n` +
        `  ${sourceFk} ${SQL_TYPE_MAP[sourcePk.type === 'UUID' ? 'UUID' : 'Int']},\n` +
        `  ${targetFk} ${SQL_TYPE_MAP[targetPk.type === 'UUID' ? 'UUID' : 'Int']},\n` +
        `  PRIMARY KEY (${sourceFk}, ${targetFk}),\n` +
        `  FOREIGN KEY (${sourceFk}) REFERENCES ${sourceName}(${toSnakeCase(sourcePk.name)}),\n` +
        `  FOREIGN KEY (${targetFk}) REFERENCES ${targetName}(${toSnakeCase(targetPk.name)})\n` +
        `);`
    );
  });

  return [...createTables, ...joinTables].join('\n\n');
}

function buildPrisma(nodes: FlowNode[], edges: FlowEdge[]): string {
  const tableNodes = nodes.filter((node): node is TableFlowNode => node.type === 'table');
  if (tableNodes.length === 0) return '// Add tables to start generating schema.prisma output';

  const nodeMap = new Map(tableNodes.map((node) => [node.id, node]));
  const manyToMany = edges.filter((edge) => edge.data?.relationType === 'n:m');
  const oneToX = edges.filter((edge) => edge.data?.relationType !== 'n:m');

  const relationMap = new Map<string, FlowEdge[]>();
  oneToX.forEach((relation) => {
    relationMap.set(relation.source, [...(relationMap.get(relation.source) ?? []), relation]);
  });

  const models = tableNodes.map((node) => {
    const modelName = toPascalCase(node.data.tableName || 'Model');
    const columns = node.data.columns.filter((column) => column.name.trim().length > 0);
    const lines: string[] = [];
    const fieldNames = new Set<string>();

    let hasPrimaryKey = false;

    columns.forEach((column) => {
      const field = toCamelCase(column.name);
      const attrs: string[] = [];

      if (field === 'id') {
        hasPrimaryKey = true;
        if (column.type === 'UUID') {
          attrs.push('@id', '@default(uuid())', '@db.Uuid');
        } else {
          attrs.push('@id', '@default(autoincrement())');
        }
      } else if (column.type === 'UUID') {
        attrs.push('@db.Uuid');
      }

      lines.push(`  ${field} ${PRISMA_TYPE_MAP[column.type]}${attrs.length > 0 ? ` ${attrs.join(' ')}` : ''}`);
      fieldNames.add(field);
    });

    if (!hasPrimaryKey) {
      lines.unshift('  id Int @id @default(autoincrement())');
      fieldNames.add('id');
    }

    (relationMap.get(node.id) ?? []).forEach((edge, index) => {
      const targetNode = nodeMap.get(edge.target);
      if (!targetNode) return;

      const relationType = edge.data?.relationType ?? '1:n';
      const targetModel = toPascalCase(targetNode.data.tableName || 'Target');
      const targetPk = inferPrimaryColumn(targetNode.data.columns);
      const fkType = targetPk.type === 'UUID' ? 'String @db.Uuid' : 'Int';

      const fkNameBase = `${toCamelCase(targetNode.data.tableName || 'target')}Id`;
      const fkName = fieldNames.has(fkNameBase) ? `${fkNameBase}_${index + 1}` : fkNameBase;
      const relationFieldBase = toCamelCase(targetModel);
      const relationField = fieldNames.has(relationFieldBase) ? `${relationFieldBase}Ref${index + 1}` : relationFieldBase;

      lines.push(`  ${fkName} ${fkType}`);
      lines.push(
        `  ${relationField} ${targetModel} @relation(fields: [${fkName}], references: [${toCamelCase(targetPk.name)}])${
          relationType === '1:1' ? ' @unique' : ''
        }`
      );
      fieldNames.add(fkName);
      fieldNames.add(relationField);
    });

    return `model ${modelName} {\n${lines.join('\n')}\n}`;
  });

  const joinModels: string[] = [];
  const seenJoinModels = new Set<string>();

  manyToMany.forEach((edge) => {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    if (!source || !target) return;

    const sourceModel = toPascalCase(source.data.tableName || 'Source');
    const targetModel = toPascalCase(target.data.tableName || 'Target');
    const joinModel = `${sourceModel}${targetModel}Join`;
    if (seenJoinModels.has(joinModel)) return;
    seenJoinModels.add(joinModel);

    joinModels.push(
      `model ${joinModel} {\n` +
        `  ${toCamelCase(sourceModel)}Id Int\n` +
        `  ${toCamelCase(targetModel)}Id Int\n` +
        `  ${toCamelCase(sourceModel)} ${sourceModel} @relation(fields: [${toCamelCase(sourceModel)}Id], references: [id])\n` +
        `  ${toCamelCase(targetModel)} ${targetModel} @relation(fields: [${toCamelCase(targetModel)}Id], references: [id])\n` +
        `\n` +
        `  @@id([${toCamelCase(sourceModel)}Id, ${toCamelCase(targetModel)}Id])\n` +
        `}`
    );
  });

  return [...models, ...joinModels].join('\n\n');
}

const TableNodeComponent = memo(({ id, data, selected }: NodeProps<TableFlowNode>) => {
  return (
    <div
      className={cn(
        'w-[290px] rounded-xl border bg-card p-3 shadow-md',
        selected ? 'border-primary/60 ring-2 ring-primary/30' : 'border-border'
      )}
    >
      <Handle type="target" position={Position.Left} className="h-3 w-3 border border-border bg-background" />
      <Handle type="source" position={Position.Right} className="h-3 w-3 border border-border bg-primary" />

      <div className="space-y-2">
        <Input
          value={data.tableName}
          onChange={(event) => data.onTableNameChange(id, event.target.value)}
          className="nodrag h-9 font-semibold"
          placeholder="table_name"
        />

        <div className="space-y-1.5">
          {data.columns.map((column) => (
            <div key={column.id} className="grid grid-cols-[1fr_108px_30px] items-center gap-1.5">
              <Input
                value={column.name}
                onChange={(event) => data.onColumnChange(id, column.id, { name: event.target.value })}
                className="nodrag h-8 text-xs"
                placeholder="column"
              />
              <select
                value={column.type}
                onChange={(event) => data.onColumnChange(id, column.id, { type: event.target.value as ColumnType })}
                className={cn('nodrag', CANVAS_NATIVE_SELECT_CLASS)}
              >
                <option value="Int">Int</option>
                <option value="VarChar">VarChar</option>
                <option value="Boolean">Boolean</option>
                <option value="UUID">UUID</option>
              </select>
              <button
                type="button"
                onClick={() => data.onDeleteColumn(id, column.id)}
                className="nodrag inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-destructive"
                title="Delete column"
                aria-label="Delete column"
              >
                <HiOutlineTrash size={14} />
              </button>
            </div>
          ))}
        </div>

        <Button type="button" variant="outline" size="sm" className="nodrag h-8 w-full gap-1.5" onClick={() => data.onAddColumn(id)}>
          <HiOutlinePlus size={14} />
          Add Column
        </Button>
      </div>
    </div>
  );
});

TableNodeComponent.displayName = 'TableNodeComponent';

const StickyNoteNodeComponent = memo(({ id, data, selected }: NodeProps<NoteFlowNode>) => {
  return (
    <div
      className={cn(
        'w-[230px] rounded-xl border bg-amber-100/95 p-3 shadow-md backdrop-blur-sm',
        selected ? 'border-amber-500 ring-2 ring-amber-400/40' : 'border-amber-300/70'
      )}
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">Sticky Note</p>
      <textarea
        value={data.text}
        onChange={(event) => data.onTextChange(id, event.target.value)}
        className="nodrag h-28 w-full resize-none rounded-lg border border-amber-300/70 bg-white/85 p-2 text-sm text-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
        placeholder="Add context, reminders, and architecture notes..."
      />
    </div>
  );
});

StickyNoteNodeComponent.displayName = 'StickyNoteNodeComponent';

const GroupNodeComponent = memo(({ id, data, selected }: NodeProps<GroupFlowNode>) => {
  return (
    <div
      className={cn(
        'h-full w-full rounded-xl border-2 border-dashed bg-primary/5 p-2',
        selected ? 'border-primary/80 ring-2 ring-primary/40' : 'border-primary/35'
      )}
    >
      <Input
        value={data.title}
        onChange={(event) => data.onTitleChange(id, event.target.value)}
        className="nodrag h-8 w-44 border-primary/40 bg-background/80 text-xs"
        placeholder="Group"
      />
    </div>
  );
});

GroupNodeComponent.displayName = 'GroupNodeComponent';

const nodeTypes = {
  table: TableNodeComponent,
  note: StickyNoteNodeComponent,
  group: GroupNodeComponent,
};

function downloadData(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function LocalSchemaCanvas() {
  const [outputTab, setOutputTab] = useState<OutputTab>('sql');
  const [manualSql, setManualSql] = useState('');
  const [activeTool, setActiveTool] = useState<ActiveTool>('select');
  const [activeRelationType, setActiveRelationType] = useState<RelationType>('1:n');
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [panelWidth, setPanelWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);
  const [parseMessage, setParseMessage] = useState('');
  const [panMode, setPanMode] = useState(false);

  const splitRef = useRef<HTMLDivElement | null>(null);
  const captureRef = useRef<HTMLDivElement | null>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance<FlowNode, FlowEdge> | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);

  useEffect(() => {
    if (!isResizing) return;

    const onMove = (event: MouseEvent) => {
      if (!splitRef.current) return;

      const rect = splitRef.current.getBoundingClientRect();
      const desired = rect.right - event.clientX;
      const clamped = Math.min(760, Math.max(320, desired));
      setPanelWidth(clamped);
    };

    const onUp = () => setIsResizing(false);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isResizing]);

  const onTableNameChange = useCallback((nodeId: string, value: string) => {
    setNodes((current) =>
      current.map((node) =>
        node.id === nodeId && node.type === 'table' ? { ...node, data: { ...node.data, tableName: value } } : node
      )
    );
  }, [setNodes]);

  const onColumnChange = useCallback((nodeId: string, columnId: string, patch: Partial<Pick<TableColumn, 'name' | 'type'>>) => {
    setNodes((current) =>
      current.map((node) => {
        if (node.id !== nodeId || node.type !== 'table') return node;

        return {
          ...node,
          data: {
            ...node.data,
            columns: node.data.columns.map((column) => (column.id === columnId ? { ...column, ...patch } : column)),
          },
        };
      })
    );
  }, [setNodes]);

  const onAddColumn = useCallback((nodeId: string) => {
    setNodes((current) =>
      current.map((node) => {
        if (node.id !== nodeId || node.type !== 'table') return node;

        return {
          ...node,
          data: {
            ...node.data,
            columns: [...node.data.columns, createColumn(node.data.columns.length)],
          },
        };
      })
    );
  }, [setNodes]);

  const onDeleteColumn = useCallback((nodeId: string, columnId: string) => {
    setNodes((current) =>
      current.map((node) => {
        if (node.id !== nodeId || node.type !== 'table') return node;

        const remaining = node.data.columns.filter((column) => column.id !== columnId);

        return {
          ...node,
          data: {
            ...node.data,
            columns: remaining.length > 0 ? remaining : [createColumn(0)],
          },
        };
      })
    );
  }, [setNodes]);

  const onStickyTextChange = useCallback((nodeId: string, text: string) => {
    setNodes((current) =>
      current.map((node) => (node.id === nodeId && node.type === 'note' ? { ...node, data: { ...node.data, text } } : node))
    );
  }, [setNodes]);

  const onGroupTitleChange = useCallback((nodeId: string, title: string) => {
    setNodes((current) =>
      current.map((node) => (node.id === nodeId && node.type === 'group' ? { ...node, data: { ...node.data, title } } : node))
    );
  }, [setNodes]);

  const addTable = () => {
    const tableCount = nodes.filter((node) => node.type === 'table').length;
    const id = `table-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const next: TableFlowNode = {
      id,
      type: 'table',
      position: {
        x: 80 + (tableCount % 3) * 330,
        y: 80 + Math.floor(tableCount / 3) * 260,
      },
      data: {
        tableName: `table_${tableCount + 1}`,
        columns: [createColumn(0), createColumn(1)],
        onTableNameChange,
        onColumnChange,
        onAddColumn,
        onDeleteColumn,
      },
    };

    setNodes((current) => [...current, next]);
  };

  const addStickyNote = (position?: { x: number; y: number }) => {
    const id = `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const next: NoteFlowNode = {
      id,
      type: 'note',
      position: position ?? { x: 180, y: 160 },
      data: {
        text: '',
        onTextChange: onStickyTextChange,
      },
    };

    setNodes((current) => [...current, next]);
  };

  const groupSelectedTables = () => {
    const selectedTables = nodes.filter((node): node is TableFlowNode => node.type === 'table' && !!node.selected);
    if (selectedTables.length < 2) return;

    const minX = Math.min(...selectedTables.map((node) => node.position.x));
    const minY = Math.min(...selectedTables.map((node) => node.position.y));
    const maxX = Math.max(...selectedTables.map((node) => node.position.x + (node.width ?? 300)));
    const maxY = Math.max(...selectedTables.map((node) => node.position.y + (node.height ?? 220)));

    const groupId = `group-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const groupX = minX - 40;
    const groupY = minY - 50;
    const groupWidth = maxX - minX + 80;
    const groupHeight = maxY - minY + 90;

    const groupedChildren = selectedTables.map((node) => ({
      ...node,
      selected: false,
      parentId: groupId,
      extent: 'parent' as const,
      position: {
        x: node.position.x - groupX,
        y: node.position.y - groupY,
      },
    }));

    const groupNode: GroupFlowNode = {
      id: groupId,
      type: 'group',
      position: { x: groupX, y: groupY },
      style: { width: groupWidth, height: groupHeight },
      data: {
        title: `Group ${nodes.filter((node) => node.type === 'group').length + 1}`,
        onTitleChange: onGroupTitleChange,
      },
    };

    setNodes((current) => {
      const keep = current.filter((node) => !(node.type === 'table' && node.selected));
      return [...keep, ...groupedChildren, groupNode];
    });
  };

  const ungroupSelected = () => {
    const selectedGroupIds = new Set(nodes.filter((node) => node.type === 'group' && node.selected).map((node) => node.id));
    if (selectedGroupIds.size === 0) return;

    const parentMap = new Map(
      nodes
        .filter((node): node is GroupFlowNode => node.type === 'group')
        .map((group) => [group.id, group.position])
    );

    setNodes((current) =>
      current
        .filter((node) => !(node.type === 'group' && selectedGroupIds.has(node.id)))
        .map((node) => {
          if (!node.parentId || !selectedGroupIds.has(node.parentId)) return node;

          const parentPosition = parentMap.get(node.parentId);
          if (!parentPosition) return node;

          return {
            ...node,
            parentId: undefined,
            extent: undefined,
            position: {
              x: parentPosition.x + node.position.x,
              y: parentPosition.y + node.position.y,
            },
          };
        })
    );
  };

  const clearCanvas = () => {
    setNodes([]);
    setEdges([]);
    setParseMessage('');
  };

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;

    const nextEdge: FlowEdge = {
      id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      type: 'smoothstep',
      label: activeRelationType,
      markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' },
      style: { stroke: 'hsl(var(--primary) / 0.8)', strokeWidth: 1.8 },
      data: { relationType: activeRelationType },
    };

    setEdges((current) => addEdge(nextEdge, current) as FlowEdge[]);
  }, [activeRelationType, setEdges]);

  const generated = useMemo(() => {
    const sql = buildSql(nodes, edges);
    const prisma = buildPrisma(nodes, edges);
    return { sql, prisma };
  }, [nodes, edges]);

  const activeOutput = outputTab === 'sql' ? generated.sql : generated.prisma;

  const copyOutput = async () => {
    const value = outputTab === 'manual' ? manualSql : activeOutput;
    if (!value.trim()) return;

    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const applyManualSqlToCanvas = () => {
    const { tables, relations } = parseCreateTableSql(manualSql);
    if (tables.length === 0) {
      setParseMessage('No valid CREATE TABLE statements were found.');
      return;
    }

    const idByTable = new Map<string, string>();
    const nextNodes: FlowNode[] = tables.map((table, index) => {
      const tableId = `table-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`;
      idByTable.set(table.name.toLowerCase(), tableId);

      const tableNode: TableFlowNode = {
        id: tableId,
        type: 'table',
        position: {
          x: 90 + (index % 3) * 330,
          y: 90 + Math.floor(index / 3) * 260,
        },
        data: {
          tableName: table.name,
          columns: table.columns.length > 0 ? table.columns : [createColumn(0)],
          onTableNameChange,
          onColumnChange,
          onAddColumn,
          onDeleteColumn,
        },
      };

      return tableNode;
    });

    const nextEdges: FlowEdge[] = relations
      .map((relation, index) => {
        const source = idByTable.get(relation.sourceTable.toLowerCase());
        const target = idByTable.get(relation.targetTable.toLowerCase());
        if (!source || !target) return null;

        return {
          id: `edge-import-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
          source,
          target,
          type: 'smoothstep',
          label: relation.relationType,
          markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' },
          style: { stroke: 'hsl(var(--primary) / 0.8)', strokeWidth: 1.8 },
          data: { relationType: relation.relationType },
        } as FlowEdge;
      })
      .filter((edge): edge is FlowEdge => edge !== null);

    setNodes(nextNodes);
    setEdges(nextEdges);
    setParseMessage(`Applied ${tables.length} table(s) and ${nextEdges.length} relation(s) from SQL.`);
  };

  const exportSqlFile = () => {
    downloadData('schema.sql', generated.sql, 'text/sql;charset=utf-8');
  };

  const exportCanvasImage = async (format: 'png' | 'jpg' | 'svg') => {
    if (!captureRef.current) return;

    const target = captureRef.current.querySelector('.react-flow') as HTMLElement | null;
    if (!target) return;

    const options = {
      cacheBust: true,
      backgroundColor: 'hsl(224 24% 7%)',
      pixelRatio: 2,
    };

    let dataUrl = '';

    if (format === 'png') {
      dataUrl = await toPng(target, options);
    } else if (format === 'jpg') {
      dataUrl = await toJpeg(target, { ...options, quality: 0.94 });
    } else {
      dataUrl = await toSvg(target, options);
    }

    const link = document.createElement('a');
    link.download = `schema-canvas.${format === 'jpg' ? 'jpg' : format}`;
    link.href = dataUrl;
    link.click();
  };

  const updateRelationType = (relationType: RelationType) => {
    setActiveRelationType(relationType);

    if (!selectedEdgeId) return;

    setEdges((current) =>
      current.map((edge) =>
        edge.id === selectedEdgeId
          ? {
              ...edge,
              label: relationType,
              data: { ...(edge.data ?? {}), relationType },
            }
          : edge
      )
    );
  };

  const onPaneClick = (event: React.MouseEvent) => {
    if (activeTool !== 'note' || !rfInstance) return;

    const position = rfInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    addStickyNote(position);
    setActiveTool('select');
  };

  const onSelectionChange = ({ edges: selectedEdges }: OnSelectionChangeParams<FlowNode, FlowEdge>) => {
    setSelectedEdgeId(selectedEdges[0]?.id ?? null);
  };

  const selectedEdgeRelation = selectedEdgeId
    ? edges.find((edge) => edge.id === selectedEdgeId)?.data?.relationType ?? activeRelationType
    : activeRelationType;

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <div className="mb-2 flex items-center gap-3 px-4 pt-3 md:px-5 md:pt-4">
        <div className="rounded-lg border border-border bg-card p-2.5">
          <HiOutlineCubeTransparent size={22} className="text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Local Database Schema Canvas</h2>
          <p className="text-sm text-muted-foreground">
            Visual modeling studio with grouping, sticky notes, manual SQL import, and live SQL/Prisma export.
          </p>
        </div>
      </div>

      <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-xl border border-border bg-card/55">
        <div ref={splitRef} className="flex h-full min-h-0 w-full items-stretch">
          <div ref={captureRef} className="relative h-full min-h-0 min-w-0 flex-1">
            <div className="pointer-events-none absolute inset-x-4 top-4 z-20 flex flex-wrap items-start justify-between gap-3">
              <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-2 rounded-xl border border-border bg-card/90 p-2 backdrop-blur-sm">
                <Button size="sm" variant={activeTool === 'select' ? 'default' : 'ghost'} className="h-8 gap-1.5" onClick={() => setActiveTool('select')}>
                  <HiOutlineCursorArrowRays size={14} />
                  Select Tool
                </Button>
                <Button size="sm" variant={activeTool === 'group' ? 'default' : 'ghost'} className="h-8 gap-1.5" onClick={() => setActiveTool('group')}>
                  <HiOutlineSquaresPlus size={14} />
                  Group Tool
                </Button>
                <Button size="sm" variant={activeTool === 'note' ? 'default' : 'ghost'} className="h-8 gap-1.5" onClick={() => setActiveTool('note')}>
                  <HiOutlineDocumentText size={14} />
                  Sticky Notes Tool
                </Button>

                <span className="mx-1 h-6 w-px bg-border" />

                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={addTable}>
                  <HiOutlinePlus size={14} />
                  Add Table
                </Button>
                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={groupSelectedTables}>
                  <HiOutlineSquaresPlus size={14} />
                  Group Selected
                </Button>
                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={ungroupSelected}>
                  <HiOutlineArrowsPointingOut size={14} />
                  Ungroup
                </Button>
                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={clearCanvas}>
                  <HiOutlineTrash size={14} />
                  Clear
                </Button>

                <span className="mx-1 h-6 w-px bg-border" />

                <label className="text-xs text-muted-foreground">Relation</label>
                <select
                  value={selectedEdgeRelation}
                  onChange={(event) => updateRelationType(event.target.value as RelationType)}
                  className={cn(CANVAS_NATIVE_SELECT_CLASS, 'w-20')}
                >
                  <option value="1:1">1:1</option>
                  <option value="1:n">1:n</option>
                  <option value="n:m">n:m</option>
                </select>
              </div>

              <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/90 p-2 backdrop-blur-sm">
                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={exportSqlFile}>
                  <HiOutlineDocumentArrowDown size={14} />
                  Export SQL
                </Button>
                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => exportCanvasImage('png')}>
                  <HiOutlinePhoto size={14} />
                  PNG
                </Button>
                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => exportCanvasImage('jpg')}>
                  <HiOutlinePhoto size={14} />
                  JPG
                </Button>
                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => exportCanvasImage('svg')}>
                  <HiOutlinePhoto size={14} />
                  SVG
                </Button>
              </div>
            </div>

            <ReactFlow<FlowNode, FlowEdge>
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onPaneClick={onPaneClick}
              onSelectionChange={onSelectionChange}
              onInit={setRfInstance}
              nodeTypes={nodeTypes}
              fitView
              className={cn(
                'h-full w-full bg-gradient-to-br from-background via-background to-card/70',
                activeTool === 'note' && 'cursor-copy',
                panMode && 'cursor-grab'
              )}
              defaultEdgeOptions={{
                type: 'smoothstep',
                markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' },
                style: { stroke: 'hsl(var(--primary) / 0.8)', strokeWidth: 1.8 },
              }}
              proOptions={{ hideAttribution: true }}
              panOnDrag={panMode}
              selectionOnDrag={!panMode}
              selectionMode={SelectionMode.Partial}
            >
              <Background variant="dots" color="hsl(var(--muted-foreground) / 0.45)" gap={22} size={1.9} />
              <MiniMap
                position="bottom-right"
                pannable
                zoomable
                className="!bottom-16 !right-4 !h-40 !w-60 !rounded-lg !border !border-border !bg-card !shadow-2xl"
                nodeColor={(node) => {
                  if (node.type === 'table') return 'hsl(var(--primary) / 0.75)';
                  if (node.type === 'group') return 'hsl(var(--primary) / 0.3)';
                  return '#f59e0b';
                }}
                maskColor="hsl(var(--background) / 0.45)"
                nodeStrokeColor={() => 'hsl(var(--border))'}
                nodeBorderRadius={6}
              />
            </ReactFlow>

            <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 rounded-lg border border-border bg-card/95 p-2 shadow-xl backdrop-blur-sm">
              <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => rfInstance?.zoomOut()} title="Zoom out">
                <HiOutlineMinus size={14} />
              </Button>
              <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => rfInstance?.zoomIn()} title="Zoom in">
                <HiOutlinePlus size={14} />
              </Button>
              <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => rfInstance?.fitView()} title="Fit view">
                <HiOutlineArrowsPointingIn size={14} />
              </Button>
              <Button
                size="sm"
                variant={panMode ? 'default' : 'outline'}
                className="h-8 gap-1.5 px-2"
                onClick={() => setPanMode((current) => !current)}
                title="Pan mode"
              >
                Pan
              </Button>
            </div>
          </div>

          <div
            className="w-1 shrink-0 cursor-col-resize bg-border/40 transition-colors hover:bg-primary/60"
            onMouseDown={() => setIsResizing(true)}
            aria-label="Resize output panel"
            role="separator"
          />

          <aside style={{ width: panelWidth }} className="flex h-full min-h-0 shrink-0 flex-col bg-card/90">
            <div className="border-b border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant={outputTab === 'sql' ? 'default' : 'ghost'} onClick={() => setOutputTab('sql')}>
                  SQL
                </Button>
                <Button size="sm" variant={outputTab === 'prisma' ? 'default' : 'ghost'} onClick={() => setOutputTab('prisma')}>
                  schema.prisma
                </Button>
                <Button size="sm" variant={outputTab === 'manual' ? 'default' : 'ghost'} onClick={() => setOutputTab('manual')}>
                  Manual SQL Editor
                </Button>
                <Button size="sm" variant="outline" className="ml-auto gap-1.5" onClick={copyOutput}>
                  {copied ? <HiOutlineCheck size={14} /> : <HiOutlineClipboardDocument size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 p-4">
              {outputTab === 'manual' ? (
                <Card className="flex h-full min-h-0 flex-col">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Manual SQL to Canvas</CardTitle>
                    <CardDescription>
                      Paste CREATE TABLE statements and apply them to generate visual tables and relations.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
                    <Textarea
                      rows={14}
                      value={manualSql}
                      onChange={(event) => setManualSql(event.target.value)}
                      className="min-h-0 flex-1 font-mono text-xs"
                      placeholder="CREATE TABLE users (\n  id INT PRIMARY KEY,\n  email VARCHAR(255),\n  role_id INT,\n  FOREIGN KEY (role_id) REFERENCES roles(id)\n);"
                    />
                    <div className="flex items-center gap-2">
                      <Button className="gap-1.5" onClick={applyManualSqlToCanvas} disabled={!manualSql.trim()}>
                        <HiOutlinePencilSquare size={14} />
                        Apply SQL to Canvas
                      </Button>
                      {parseMessage && <p className="text-xs text-muted-foreground">{parseMessage}</p>}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="flex h-full min-h-0 flex-col">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Generated Output</CardTitle>
                    <CardDescription>Real-time schema generated from current canvas state.</CardDescription>
                  </CardHeader>
                  <CardContent className="min-h-0 flex-1">
                    <pre className="h-full overflow-auto rounded-lg border border-border bg-background/60 p-3 text-xs text-foreground/90">
                      <code>{activeOutput}</code>
                    </pre>
                  </CardContent>
                </Card>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
