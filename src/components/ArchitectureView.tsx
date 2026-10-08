import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertOctagon, 
  Sliders, 
  ShieldCheck, 
  Database, 
  BarChart3, 
  ArrowRight, 
  Layers, 
  Clock, 
  FileCode,
  Info
} from 'lucide-react';

interface DagNode {
  id: string;
  title: string;
  subtitle: string;
  module: string;
  icon: React.ElementType;
  color: string;
  borderColor: string;
  bgLight: string;
  description: string;
  keyResponsibilities: string[];
  failureModes: string[];
  interviewTip: string;
}

export const ArchitectureView: React.FC = () => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('incremental');

  const nodes: DagNode[] = [
    {
      id: 'raw',
      title: '1. Raw Ingestion',
      subtitle: 'CSV & JSON Batches',
      module: 'src/extract.py',
      icon: FileSpreadsheet,
      color: 'text-amber-400',
      borderColor: 'border-amber-500/30',
      bgLight: 'bg-amber-950/20',
      description: 'Ingests multi-entity raw source dumps (customers, products, orders, items, payments) as strings to avoid premature type corruption.',
      keyResponsibilities: [
        'Reads baseline CSV/JSON files or delta timestamp batches',
        'Queries high-watermark timestamp from etl_watermarks',
        'Filters orders where purchase_timestamp > watermark for delta runs',
        'Records source file metadata and raw record counts',
      ],
      failureModes: [
        'Missing source file in ingestion bucket / directory',
        'Malformed CSV delimiters or corrupted JSON payloads',
      ],
      interviewTip: 'Always read initial raw files as strings before validation. Letting pandas infer types during ingestion causes silent type casting bugs (e.g. converting 5-digit ZIP codes with leading zeros to integers).'
    },
    {
      id: 'schema',
      title: '2. Schema & Quarantine',
      subtitle: 'Ingestion Quality Gate',
      module: 'src/validate.py',
      icon: AlertOctagon,
      color: 'text-rose-400',
      borderColor: 'border-rose-500/30',
      bgLight: 'bg-rose-950/20',
      description: 'Enforces required columns, detects nulls in critical primary/foreign keys, and diverts dirty records to quarantine.',
      keyResponsibilities: [
        'Validates mandatory column presence against config schema',
        'Detects nulls or blank strings in primary and foreign keys',
        'Detects duplicate business keys in raw ingestion',
        'Routes invalid rows to data/quarantine/* with explicit reason codes',
      ],
      failureModes: [
        'Upstream schema drift (missing required column)',
        'Corrupted rows with null order_id or missing customer_id',
      ],
      interviewTip: 'Rather than failing the entire pipeline on 1 dirty record or dropping it silently, a quarantine pattern preserves data lineage and enables data steward investigation.'
    },
    {
      id: 'transform',
      title: '3. Clean & Transform',
      subtitle: 'Standardization & Casing',
      module: 'src/transform.py',
      icon: Sliders,
      color: 'text-blue-400',
      borderColor: 'border-blue-500/30',
      bgLight: 'bg-blue-950/20',
      description: 'Standardizes types, cleans whitespace, casts datetimes to ISO-8601, and calculates derived business attributes.',
      keyResponsibilities: [
        'Trims strings and normalizes state codes to uppercase (TX, CA)',
        'Standardizes timestamps to uniform ISO format (YYYY-MM-DD HH:MM:SS)',
        'Rounds monetary fields (price, freight, payments) to 2 decimal places',
        'Deduplicates records keeping latest event state for idempotent updates',
      ],
      failureModes: [
        'Unparseable datetime strings with conflicting regional date formats',
        'Scientific notation in large numerical IDs',
      ],
      interviewTip: 'Transformations must be deterministic and side-effect free. Writing processed files to data/processed before loading allows reproducible troubleshooting.'
    },
    {
      id: 'assertions',
      title: '4. Quality Assertions',
      subtitle: 'Automated DQ Gate',
      module: 'src/quality_checks.py',
      icon: ShieldCheck,
      color: 'text-emerald-400',
      borderColor: 'border-emerald-500/30',
      bgLight: 'bg-emerald-950/20',
      description: 'Executes programmatic pre-load assertions verifying uniqueness, zero nulls in PKs, and 100% referential integrity.',
      keyResponsibilities: [
        'PK Uniqueness Assertion: 0 duplicate keys across all datasets',
        'Zero Null Assertion: 0 nulls in mandatory entity identifiers',
        'Referential Integrity: Order items map to valid orders & products',
        'Positive Pricing Constraint: All unit prices strictly > $0.00',
      ],
      failureModes: [
        'Orphaned items arriving before order header (breaks FK constraint)',
        'Negative or zero pricing in sales items',
      ],
      interviewTip: 'Explain how testing referential integrity in Python before loading prevents cryptic MySQL foreign key violation errors and aborted transactions.'
    },
    {
      id: 'incremental',
      title: '5. MySQL Upsert Load',
      subtitle: 'Idempotency & Watermark',
      module: 'src/load.py',
      icon: Database,
      color: 'text-cyan-400',
      borderColor: 'border-cyan-500/30',
      bgLight: 'bg-cyan-950/20',
      description: 'Loads records in relational dependency order using INSERT ... ON DUPLICATE KEY UPDATE and advances high-watermark state.',
      keyResponsibilities: [
        'Dependency order: customers/products -> orders -> items/payments',
        'Idempotent MySQL upserts prevent duplicate records on re-runs',
        'Atomically updates etl_watermarks with batch max purchase date',
        'Logs run metadata to etl_audit_log (rows, status, runtime duration)',
      ],
      failureModes: [
        'Deadlocks or connection timeouts under heavy batch inserts',
        'Foreign key constraint failures if loading order is reversed',
      ],
      interviewTip: 'Idempotency is the #1 question in Data Engineer interviews. "If the pipeline runs twice with the exact same data, the database state remains identical without duplicate rows."'
    },
    {
      id: 'sql',
      title: '6. Post-Load Validation',
      subtitle: 'Audit & Reconciliation',
      module: 'sql/validation_queries.sql',
      icon: BarChart3,
      color: 'text-purple-400',
      borderColor: 'border-purple-500/30',
      bgLight: 'bg-purple-950/20',
      description: 'Runs analytical verification queries certifying financial balance (items vs payments) and reporting KPIs.',
      keyResponsibilities: [
        'Row count reconciliation across staging vs warehouse tables',
        'Financial balance audit: Basket sum (price + freight) == payments',
        'Monthly GMV, AOV, and customer repeat purchase rate verification',
        'Zero orphaned records verification query',
      ],
      failureModes: [
        'Discrepancy between invoiced order items and payment collected',
        'Discrepancy between extracted rows count and target row count',
      ],
      interviewTip: 'Junior DEs who write post-load financial reconciliation queries stand out over those who just "load and hope".'
    },
  ];

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || nodes[4];

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-sm mb-1">
              <Layers className="w-4 h-4" />
              <span>END-TO-END PIPELINE ARCHITECTURE</span>
            </div>
            <h2 className="text-xl font-bold text-white">
              Data Engineering DAG & Idempotent Processing Flow
            </h2>
            <p className="text-sm text-slate-400 max-w-3xl mt-1">
              Click on any stage in the pipeline DAG below to inspect its responsibilities, code modules, 
              quarantine failure modes, and key interview explanations.
            </p>
          </div>
          <div className="flex items-center space-x-4 text-xs text-slate-400 bg-slate-950 px-4 py-2.5 rounded-lg border border-slate-800">
            <div>
              <span className="text-slate-500 block">Orchestrator:</span>
              <span className="text-emerald-400 font-mono font-medium">pipeline.py</span>
            </div>
            <div className="border-l border-slate-800 pl-4">
              <span className="text-slate-500 block">State Store:</span>
              <span className="text-cyan-400 font-mono font-medium">etl_watermarks</span>
            </div>
            <div className="border-l border-slate-800 pl-4">
              <span className="text-slate-500 block">Audit Log:</span>
              <span className="text-purple-400 font-mono font-medium">etl_audit_log</span>
            </div>
          </div>
        </div>
      </div>

      {/* DAG Flow Visualizer */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 overflow-x-auto shadow-inner">
        <div className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-4">
          Interactive Pipeline Execution DAG (Click a node to inspect)
        </div>
        <div className="flex items-center space-x-3 min-w-[960px] pb-2">
          {nodes.map((node, index) => {
            const Icon = node.icon;
            const isSelected = node.id === selectedNodeId;
            return (
              <React.Fragment key={node.id}>
                <button
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`flex-1 text-left p-4 rounded-xl border transition-all cursor-pointer relative group ${
                    isSelected
                      ? `bg-slate-900 border-2 ${node.borderColor} shadow-lg shadow-emerald-950/20 scale-[1.02]`
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg ${node.bgLight} ${node.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800">
                      Step {index + 1}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-white group-hover:text-emerald-300 transition-colors">
                    {node.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{node.subtitle}</p>
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>{node.module.replace('src/', '')}</span>
                  </div>
                </button>
                {index < nodes.length - 1 && (
                  <div className="text-slate-600 flex-shrink-0">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Selected Node Deep Dive Inspector */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-xl ${selectedNode.bgLight} ${selectedNode.color} border ${selectedNode.borderColor}`}>
              {React.createElement(selectedNode.icon, { className: 'w-6 h-6' })}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-white">{selectedNode.title}</h3>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                  {selectedNode.module}
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1">{selectedNode.description}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Key Responsibilities */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Core Responsibilities</span>
            </h4>
            <ul className="space-y-2 text-xs text-slate-300">
              {selectedNode.keyResponsibilities.map((resp, i) => (
                <li key={i} className="flex items-start space-x-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>{resp}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: Potential Failure Modes */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              <span>Handled Edge Cases</span>
            </h4>
            <ul className="space-y-2 text-xs text-slate-300">
              {selectedNode.failureModes.map((fm, i) => (
                <li key={i} className="flex items-start space-x-2">
                  <span className="text-rose-400 font-bold">•</span>
                  <span>{fm}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Data Engineer Interview Talking Point */}
          <div className="bg-slate-950/60 border border-emerald-900/30 rounded-lg p-4 bg-emerald-950/10">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
              <Info className="w-4 h-4 text-emerald-400" />
              <span>Interview Talking Point</span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed italic">
              "{selectedNode.interviewTip}"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
