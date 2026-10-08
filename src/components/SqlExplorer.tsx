import React, { useState } from 'react';
import { 
  Database, 
  Table, 
  Key, 
  Play, 
  Copy, 
  Check, 
  ArrowRight, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { DATABASE_SCHEMAS, VALIDATION_QUERIES, TableSchema, SqlQueryExample } from '../data/sampleDatabase';

export const SqlExplorer: React.FC = () => {
  const [selectedTable, setSelectedTable] = useState<string>('orders');
  const [selectedQueryId, setSelectedQueryId] = useState<string>('financial_reconciliation');
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryResults, setQueryResults] = useState<{ columns: string[]; rows: (string | number)[][] } | null>({
    columns: VALIDATION_QUERIES[0].resultsColumns,
    rows: VALIDATION_QUERIES[0].resultsRows,
  });
  const [copiedQuery, setCopiedQuery] = useState(false);
  const [executionTime, setExecutionTime] = useState<string>('0.042s');

  const currentSchema: TableSchema = 
    DATABASE_SCHEMAS.find(t => t.name === selectedTable) || DATABASE_SCHEMAS[2];

  const currentQuery: SqlQueryExample = 
    VALIDATION_QUERIES.find(q => q.id === selectedQueryId) || VALIDATION_QUERIES[0];

  const handleRunQuery = () => {
    setIsExecuting(true);
    setTimeout(() => {
      setQueryResults({
        columns: currentQuery.resultsColumns,
        rows: currentQuery.resultsRows,
      });
      setExecutionTime(`${(Math.random() * 0.05 + 0.015).toFixed(3)}s`);
      setIsExecuting(false);
    }, 280);
  };

  const copySql = () => {
    navigator.clipboard.writeText(currentQuery.sql);
    setCopiedQuery(true);
    setTimeout(() => setCopiedQuery(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-xs tracking-wider uppercase mb-1">
              <Database className="w-4 h-4" />
              <span>Relational Modeling & SQL Certification</span>
            </div>
            <h2 className="text-xl font-bold text-white">
              MySQL 8.0 Schema & Post-Load Analytics
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Inspect 3NF normalized tables, foreign keys, compound indexes, and execute 
              post-load data certification queries used to verify data integrity.
            </p>
          </div>
          <div className="text-xs text-slate-400 font-mono bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 self-start sm:self-auto">
            <span>Database: </span>
            <span className="text-cyan-400 font-semibold">ecommerce_dw</span>
          </div>
        </div>
      </div>

      {/* Section 1: Interactive Table Schema Inspector */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center space-x-2">
            <Table className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">
              Warehouse Tables & Indexes (3NF)
            </h3>
          </div>

          {/* Table Selector Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {DATABASE_SCHEMAS.map(table => (
              <button
                key={table.name}
                onClick={() => setSelectedTable(table.name)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-colors ${
                  selectedTable === table.name
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-700 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {table.name}
              </button>
            ))}
          </div>
        </div>

        {/* Current Table Description */}
        <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 mb-4 text-xs text-slate-300">
          <span className="font-semibold text-white mr-2">{currentSchema.name}:</span>
          {currentSchema.description}
        </div>

        {/* Column Definition Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider bg-slate-900/40">
                <th className="py-2.5 px-3">Column Name</th>
                <th className="py-2.5 px-3">Data Type</th>
                <th className="py-2.5 px-3">Key & Constraints</th>
                <th className="py-2.5 px-3">Indexes</th>
                <th className="py-2.5 px-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {currentSchema.columns.map(col => (
                <tr key={col.name} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-slate-200">
                    {col.name}
                  </td>
                  <td className="py-2.5 px-3 text-cyan-400">
                    {col.type}
                  </td>
                  <td className="py-2.5 px-3">
                    {col.keyType === 'PK' ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                        <Key className="w-2.5 h-2.5" />
                        <span>PRIMARY KEY</span>
                      </span>
                    ) : col.keyType === 'COMPOSITE_PK' ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] bg-amber-950/80 text-amber-300 border border-amber-800/80 font-bold">
                        <span>COMPOSITE PK</span>
                      </span>
                    ) : col.keyType === 'FK' ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] bg-blue-950 text-blue-300 border border-blue-800">
                        <span>FK &rarr; {col.references}</span>
                      </span>
                    ) : (
                      <span className="text-slate-500 font-sans">
                        {col.nullable ? 'NULLABLE' : 'NOT NULL'}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">
                    {col.index ? (
                      <span className="text-emerald-400 text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                        {col.index}
                      </span>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-sans text-slate-400">
                    {col.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Interactive SQL Validation & Certification Queries */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-sm text-white flex items-center space-x-2">
              <Play className="w-4 h-4 text-cyan-400 fill-current" />
              <span>Live Post-Load Validation Queries</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select an analytical verification query to review the SQL and test execution against MySQL 8.0.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={copySql}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs border border-slate-800"
            >
              {copiedQuery ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedQuery ? 'Copied SQL' : 'Copy Query'}</span>
            </button>
            <button
              onClick={handleRunQuery}
              disabled={isExecuting}
              className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-sm transition-all"
            >
              {isExecuting ? (
                <>
                  <div className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Executing...</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-current" />
                  <span>Execute SQL</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Query Selector Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mb-5">
          {VALIDATION_QUERIES.map(q => {
            const isSelected = q.id === selectedQueryId;
            return (
              <button
                key={q.id}
                onClick={() => {
                  setSelectedQueryId(q.id);
                  setQueryResults({ columns: q.resultsColumns, rows: q.resultsRows });
                }}
                className={`p-3 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'bg-slate-900 border-cyan-500/80 shadow-md shadow-cyan-950/30'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className={`px-1.5 py-0.2 rounded font-semibold ${
                    q.category === 'Reconciliation' ? 'bg-amber-950 text-amber-300' :
                    q.category === 'Integrity' ? 'bg-rose-950 text-rose-300' :
                    q.category === 'Observability' ? 'bg-purple-950 text-purple-300' :
                    'bg-emerald-950 text-emerald-300'
                  }`}>
                    {q.category}
                  </span>
                </div>
                <h4 className="font-semibold text-xs text-white truncate">{q.title}</h4>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{q.description}</p>
              </button>
            );
          })}
        </div>

        {/* SQL Code Display */}
        <div className="bg-slate-900 rounded-lg p-3.5 border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto mb-4">
          <pre className="text-cyan-300 whitespace-pre-wrap">{currentQuery.sql}</pre>
        </div>

        {/* Query Results Table */}
        {queryResults && (
          <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
            <div className="bg-slate-900/80 px-3.5 py-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-white">
                Query Results ({queryResults.rows.length} rows returned)
              </span>
              <span className="font-mono text-emerald-400 text-[11px]">
                Execution Time: {executionTime}
              </span>
            </div>

            {queryResults.rows.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                <span className="font-semibold text-white block">0 Anomalous Records Returned</span>
                <span>Referential integrity check passed completely — all foreign keys match parent entities.</span>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[300px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/50 uppercase text-[10px]">
                      {queryResults.columns.map((col, idx) => (
                        <th key={idx} className="py-2 px-3 font-semibold">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {queryResults.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-900/30">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="py-2 px-3 text-slate-300">
                            {cell === 'BALANCED' ? (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-800">
                                BALANCED
                              </span>
                            ) : cell === 'VARIANCE_FLAGGED' ? (
                              <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 font-bold border border-rose-800">
                                VARIANCE_FLAGGED
                              </span>
                            ) : (
                              String(cell)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
