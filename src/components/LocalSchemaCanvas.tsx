import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  addEdge,
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  HiOutlineCubeTransparent,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineClipboardDocument,
  HiOutlineCheck,
} from 'react-icons/hi2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '../lib/utils';

type ColumnType = 'Int' | 'VarChar' | 'Boolean' | 'UUID';
type OutputMode = 'sql' | 'prisma';

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

interface RelationInfo {
  sourceId: string;
  targetId: string;
  fkName: string;
  fkType: 'Int' | 'UUID';
  targetPkName: string;
}

type TableFlowNode = Node<TableNodeData, 'table'>;

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

  if (words.length === 0) {
    return 'Model';
  }

  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('');
}

function toCamelCase(value: string): string {
  const pascal = toPascalCase(value);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function createColumn(seed: number): TableColumn {
  return {
    id: `column-${seed}-${Math.random().toString(36).slice(2, 7)}`,
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

function buildRelations(nodes: TableFlowNode[], edges: Edge[]): RelationInfo[] {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  return edges
    .map((edge) => {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source || !target || source.id === target.id) return null;

      const targetPk = inferPrimaryColumn(target.data.columns);
      const fkType: ColumnType = targetPk.type === 'UUID' ? 'UUID' : 'Int';

      return {
        sourceId: source.id,
        targetId: target.id,
        fkName: `${toCamelCase(target.data.tableName || 'target')}Id`,
        fkType,
        targetPkName: toSnakeCase(targetPk.name),
      };
    })
    .filter((value): value is RelationInfo => value !== null);
}

function buildSql(nodes: TableFlowNode[], relations: RelationInfo[]): string {
  if (nodes.length === 0) {
    return '-- Add tables to start generating SQL';
  }

  const relationMap = new Map<string, RelationInfo[]>();
  relations.forEach((relation) => {
    relationMap.set(relation.sourceId, [...(relationMap.get(relation.sourceId) ?? []), relation]);
  });

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  return nodes
    .map((node) => {
      const tableName = toSnakeCase(node.data.tableName || 'table_name');
      const tableColumns = node.data.columns.filter((column) => column.name.trim().length > 0);
      const existingNames = new Set(tableColumns.map((column) => toSnakeCase(column.name)));

      const columnLines = tableColumns.map((column) => `  ${toSnakeCase(column.name)} ${SQL_TYPE_MAP[column.type]}`);

      if (columnLines.length === 0) {
        columnLines.push('  id INT PRIMARY KEY');
      }

      const relationLines: string[] = [];

      (relationMap.get(node.id) ?? []).forEach((relation) => {
        const targetNode = nodeMap.get(relation.targetId);
        if (!targetNode) return;

        const targetName = toSnakeCase(targetNode.data.tableName || 'table_name');
        const fkColumn = toSnakeCase(relation.fkName);

        if (!existingNames.has(fkColumn)) {
          columnLines.push(`  ${fkColumn} ${SQL_TYPE_MAP[relation.fkType]}`);
          existingNames.add(fkColumn);
        }

        relationLines.push(`  FOREIGN KEY (${fkColumn}) REFERENCES ${targetName}(${relation.targetPkName})`);
      });

      const mergedLines = [...columnLines, ...relationLines];

      return `CREATE TABLE ${tableName} (\n${mergedLines.join(',\n')}\n);`;
    })
    .join('\n\n');
}

function buildPrisma(nodes: TableFlowNode[], relations: RelationInfo[]): string {
  if (nodes.length === 0) {
    return '// Add tables to start generating schema.prisma output';
  }

  const relationMap = new Map<string, RelationInfo[]>();
  relations.forEach((relation) => {
    relationMap.set(relation.sourceId, [...(relationMap.get(relation.sourceId) ?? []), relation]);
  });

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  return nodes
    .map((node) => {
      const modelName = toPascalCase(node.data.tableName || 'Model');
      const columns = node.data.columns.filter((column) => column.name.trim().length > 0);
      const lines: string[] = [];
      const fieldNames = new Set<string>();

      let hasPrimaryKey = false;

      columns.forEach((column) => {
        const fieldName = toCamelCase(column.name);
        const attrs: string[] = [];

        if (fieldName === 'id') {
          hasPrimaryKey = true;
          if (column.type === 'UUID') {
            attrs.push('@id', '@default(uuid())', '@db.Uuid');
          } else {
            attrs.push('@id');
          }
        } else if (column.type === 'UUID') {
          attrs.push('@db.Uuid');
        }

        fieldNames.add(fieldName);
        lines.push(`  ${fieldName} ${PRISMA_TYPE_MAP[column.type]}${attrs.length > 0 ? ` ${attrs.join(' ')}` : ''}`);
      });

      if (!hasPrimaryKey) {
        lines.unshift('  id Int @id @default(autoincrement())');
        fieldNames.add('id');
      }

      const relationLines: string[] = [];

      (relationMap.get(node.id) ?? []).forEach((relation, index) => {
        const targetNode = nodeMap.get(relation.targetId);
        if (!targetNode) return;

        const targetModel = toPascalCase(targetNode.data.tableName || 'Model');
        const targetPk = inferPrimaryColumn(targetNode.data.columns);
        const targetPkField = toCamelCase(targetPk.name);

        const baseFkName = toCamelCase(relation.fkName);
        const fkField = fieldNames.has(baseFkName) ? `${baseFkName}_${index + 1}` : baseFkName;
        const relationFieldBase = toCamelCase(targetModel);
        const relationField = fieldNames.has(relationFieldBase) ? `${relationFieldBase}Ref${index + 1}` : relationFieldBase;

        const fkType = relation.fkType === 'UUID' ? 'String @db.Uuid' : 'Int';

        if (!fieldNames.has(fkField)) {
          relationLines.push(`  ${fkField} ${fkType}`);
          fieldNames.add(fkField);
        }

        relationLines.push(`  ${relationField} ${targetModel} @relation(fields: [${fkField}], references: [${targetPkField}])`);
        fieldNames.add(relationField);
      });

      return `model ${modelName} {\n${[...lines, ...relationLines].join('\n')}\n}`;
    })
    .join('\n\n');
}

const TableNodeComponent = memo(({ id, data, selected }: NodeProps<TableFlowNode>) => {
  return (
    <div
      className={cn(
        'w-[280px] rounded-xl border bg-card p-3 shadow-md',
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
            <div key={column.id} className="grid grid-cols-[1fr_110px_30px] items-center gap-1.5">
              <Input
                value={column.name}
                onChange={(event) => data.onColumnChange(id, column.id, { name: event.target.value })}
                className="nodrag h-8 text-xs"
                placeholder="column"
              />
              <select
                value={column.type}
                onChange={(event) => data.onColumnChange(id, column.id, { type: event.target.value as ColumnType })}
                className="nodrag h-8 rounded-lg border border-input bg-background px-2 text-xs"
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

const nodeTypes = {
  table: TableNodeComponent,
};

export default function LocalSchemaCanvas() {
  const [outputMode, setOutputMode] = useState<OutputMode>('sql');
  const [copied, setCopied] = useState(false);

  const onTableNameChange = useCallback((nodeId: string, value: string) => {
    setNodes((current) =>
      current.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, tableName: value } } : node))
    );
  }, []);

  const onColumnChange = useCallback((nodeId: string, columnId: string, patch: Partial<Pick<TableColumn, 'name' | 'type'>>) => {
    setNodes((current) =>
      current.map((node) => {
        if (node.id !== nodeId) return node;

        return {
          ...node,
          data: {
            ...node.data,
            columns: node.data.columns.map((column) => (column.id === columnId ? { ...column, ...patch } : column)),
          },
        };
      })
    );
  }, []);

  const onAddColumn = useCallback((nodeId: string) => {
    setNodes((current) =>
      current.map((node) => {
        if (node.id !== nodeId) return node;

        return {
          ...node,
          data: {
            ...node.data,
            columns: [...node.data.columns, createColumn(node.data.columns.length)],
          },
        };
      })
    );
  }, []);

  const onDeleteColumn = useCallback((nodeId: string, columnId: string) => {
    setNodes((current) =>
      current.map((node) => {
        if (node.id !== nodeId) return node;

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
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState<TableFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const addTable = () => {
    const index = nodes.length;
    const nextId = `table-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const nextNode: TableFlowNode = {
      id: nextId,
      type: 'table',
      position: {
        x: 80 + (index % 3) * 320,
        y: 80 + Math.floor(index / 3) * 240,
      },
      data: {
        tableName: `table_${index + 1}`,
        columns: [createColumn(0), createColumn(1)],
        onTableNameChange,
        onColumnChange,
        onAddColumn,
        onDeleteColumn,
      },
    };

    setNodes((current) => [...current, nextNode]);
  };

  const clearCanvas = () => {
    setNodes([]);
    setEdges([]);
  };

  const onConnect = useCallback((connection: Connection) => {
    setEdges((current) =>
      addEdge(
        {
          ...connection,
          type: 'smoothstep',
          animated: false,
          style: { stroke: 'hsl(var(--primary) / 0.7)', strokeWidth: 1.5 },
        },
        current
      )
    );
  }, []);

  const generated = useMemo(() => {
    const relations = buildRelations(nodes, edges);
    return {
      sql: buildSql(nodes, relations),
      prisma: buildPrisma(nodes, relations),
      relationCount: relations.length,
    };
  }, [nodes, edges]);

  const activeOutput = outputMode === 'sql' ? generated.sql : generated.prisma;

  const copyOutput = async () => {
    await navigator.clipboard.writeText(activeOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="space-y-6">
      <div className="mb-2 flex items-center gap-3">
        <div className="rounded-lg border border-border bg-card p-2.5">
          <HiOutlineCubeTransparent size={22} className="text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Local Database Schema Canvas</h2>
          <p className="text-sm text-muted-foreground">
            Build tables visually, connect relations, and export SQL plus schema.prisma in real time.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Canvas</CardTitle>
              <CardDescription>Drag tables, add columns, and connect handles to model relations.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={addTable} className="gap-1.5">
                <HiOutlinePlus size={16} />
                Add Table
              </Button>
              <Button onClick={clearCanvas} variant="outline" className="gap-1.5" disabled={nodes.length === 0 && edges.length === 0}>
                <HiOutlineTrash size={16} />
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[70vh] overflow-hidden rounded-xl border border-border bg-background/60">
              <ReactFlow<TableFlowNode, Edge>
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                className="bg-gradient-to-br from-background via-background to-card/70"
              >
                <Background color="hsl(var(--border))" gap={24} />
                <MiniMap
                  pannable
                  zoomable
                  nodeColor={() => 'hsl(var(--primary) / 0.55)'}
                  className="!border !border-border !bg-card"
                />
                <Controls className="!border !border-border !bg-card" />
              </ReactFlow>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={outputMode === 'sql' ? 'default' : 'ghost'}
                onClick={() => setOutputMode('sql')}
                className={cn(outputMode !== 'sql' && 'border border-input')}
              >
                SQL
              </Button>
              <Button
                size="sm"
                variant={outputMode === 'prisma' ? 'default' : 'ghost'}
                onClick={() => setOutputMode('prisma')}
                className={cn(outputMode !== 'prisma' && 'border border-input')}
              >
                schema.prisma
              </Button>
              <Button size="sm" variant="outline" className="ml-auto gap-1.5" onClick={copyOutput} disabled={!activeOutput.trim()}>
                {copied ? <HiOutlineCheck size={14} /> : <HiOutlineClipboardDocument size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <CardTitle>Generated Output</CardTitle>
            <CardDescription>
              {nodes.length} table{nodes.length === 1 ? '' : 's'} and {generated.relationCount} relation
              {generated.relationCount === 1 ? '' : 's'} detected.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="h-[63vh] overflow-auto rounded-lg border border-border bg-background/55 p-3 text-xs text-foreground/90">
              <code>{activeOutput}</code>
            </pre>
            <div className="rounded-lg border border-border bg-background/40 px-3 py-2 text-xs text-muted-foreground">
              Edges are interpreted as source table referencing target table with a generated foreign key.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
