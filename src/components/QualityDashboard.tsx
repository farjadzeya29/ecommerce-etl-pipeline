import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  AlertOctagon, 
  CheckCircle2, 
  Clock, 
  Database, 
  FileSpreadsheet, 
  Filter,
  Layers
} from 'lucide-react';

interface QualityAssertion {
  name: string;
  table: string;
  category: 'Uniqueness' | 'Non-Null' | 'Referential' | 'Domain Range' | 'Reconciliation';
  observed: string | number;
  expected: string | number;
  status: 'PASSED' | 'FAILED';
  description: string;
}

export const QualityDashboard: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  const assertions: QualityAssertion[] = [
    {
      name: 'NOT_NULL_CUSTOMER_ID',
      table: 'customers',
      category: 'Non-Null',
      observed: 0,
      expected: 0,
      status: 'PASSED',
      description: 'Zero null or whitespace values in primary key customer_id.'
    },
    {
      name: 'PK_UNIQUENESS_CUSTOMERS',
      table: 'customers',
      category: 'Uniqueness',
      observed: 0,
      expected: 0,
      status: 'PASSED',
      description: 'Zero duplicate customer identifiers in dimension table.'
    },
    {
      name: 'NOT_NULL_PRODUCT_ID',
      table: 'products',
      category: 'Non-Null',
      observed: 0,
      expected: 0,
      status: 'PASSED',
      description: 'Zero null values in catalog primary key product_id.'
    },
    {
      name: 'PK_UNIQUENESS_PRODUCTS',
      table: 'products',
      category: 'Uniqueness',
      observed: 0,
      expected: 0,
      status: 'PASSED',
      description: 'Zero duplicate catalog SKU codes in products table.'
    },
    {
      name: 'NOT_NULL_ORDER_ID',
      table: 'orders',
      category: 'Non-Null',
      observed: 0,
      expected: 0,
      status: 'PASSED',
      description: 'Zero null values in primary key order_id.'
    },
    {
      name: 'PK_UNIQUENESS_ORDERS',
      table: 'orders',
      category: 'Uniqueness',
      observed: 0,
      expected: 0,
      status: 'PASSED',
      description: 'Zero duplicate order transaction numbers.'
    },
    {
      name: 'FK_ORDERS_TO_CUSTOMERS',
      table: 'orders',
      category: 'Referential',
      observed: '0 orphans',
      expected: '0 orphans',
      status: 'PASSED',
      description: '100% of order customer_id values exist in the customers master table.'
    },
    {
      name: 'FK_ORDER_ITEMS_TO_ORDERS',
      table: 'order_items',
      category: 'Referential',
      observed: '0 orphans',
      expected: '0 orphans',
      status: 'PASSED',
      description: 'Every line item order_id maps to an active order header.'
    },
    {
      name: 'FK_ORDER_ITEMS_TO_PRODUCTS',
      table: 'order_items',
      category: 'Referential',
      observed: '0 orphans',
      expected: '0 orphans',
      status: 'PASSED',
      description: 'Every line item product_id maps to a valid catalog product.'
    },
    {
      name: 'POSITIVE_ITEM_PRICE',
      table: 'order_items',
      category: 'Domain Range',
      observed: 0,
      expected: 0,
      status: 'PASSED',
      description: 'All unit price values are strictly positive float numbers (> $0.00).'
    },
    {
      name: 'NON_NEGATIVE_FREIGHT',
      table: 'order_items',
      category: 'Domain Range',
      observed: 0,
      expected: 0,
      status: 'PASSED',
      description: 'All shipping freight values are non-negative (>= $0.00).'
    },
    {
      name: 'ROW_COUNT_RECONCILIATION',
      table: 'pipeline_summary',
      category: 'Reconciliation',
      observed: 'Delta: 0',
      expected: 'Delta: 0',
      status: 'PASSED',
      description: 'Total Extracted (76) == Cleaned & Loaded (73) + Quarantined (3).'
    },
  ];

  const quarantinedRecords = [
    {
      table: 'orders',
      id: 'ORD-BAD1',
      reason: "Missing mandatory field 'customer_id'",
      timestamp: '2026-10-08 10:00:02',
      snippet: 'customer_id: [NULL], status: delivered, purchase_ts: 2024-02-26 09:00:00'
    },
    {
      table: 'orders',
      id: 'ORD-7005',
      reason: "Duplicate primary key ['order_id'] in raw batch",
      timestamp: '2026-10-08 10:00:02',
      snippet: 'order_id: ORD-7005 already ingested in baseline records'
    },
    {
      table: 'order_items',
      id: 'ORD-BAD2 (Item 1)',
      reason: 'Price must be positive float (Observed: -$25.00)',
      timestamp: '2026-10-08 10:00:02',
      snippet: 'product_id: PROD-101, price: -25.00, freight: 10.00'
    },
  ];

  const auditHistory = [
    {
      runId: 'RUN-20261008100518-a3f12c',
      mode: 'INCREMENTAL',
      status: 'SUCCESS',
      extracted: 15,
      cleaned: 15,
      quarantined: 0,
      loaded: 15,
      duration: '2.84s',
      timestamp: '2026-10-08 10:05:18'
    },
    {
      runId: 'RUN-20261008100003-8f2e91',
      mode: 'FULL',
      status: 'SUCCESS',
      extracted: 76,
      cleaned: 73,
      quarantined: 3,
      loaded: 73,
      duration: '3.42s',
      timestamp: '2026-10-08 10:00:03'
    },
  ];

  const filteredAssertions = activeFilter === 'ALL'
    ? assertions
    : assertions.filter(a => a.category === activeFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Data Quality & Observability Suite</span>
            </div>
            <h2 className="text-xl font-bold text-white">
              Automated Quality Assertions & Quarantine Audit
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Guarantees zero silent corruption through programmatic pre-load gates, 
              isolated quarantine routing, and execution audit history.
            </p>
          </div>
          <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-emerald-400 font-semibold font-mono">12/12 Gates Passing</span>
          </div>
        </div>
      </div>

      {/* Section 1: Assertions Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">
              Pre-Load Quality Assertion Gates
            </h3>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-1">
            {['ALL', 'Non-Null', 'Uniqueness', 'Referential', 'Domain Range', 'Reconciliation'].map(cat => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  activeFilter === cat
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'text-slate-400 hover:text-white bg-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider bg-slate-900/40">
                <th className="py-2.5 px-3">Assertion Rule</th>
                <th className="py-2.5 px-3">Target Table</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Observed Value</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Rule Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {filteredAssertions.map((a, i) => (
                <tr key={i} className="hover:bg-slate-900/30">
                  <td className="py-2.5 px-3 font-bold text-slate-200">
                    {a.name}
                  </td>
                  <td className="py-2.5 px-3 text-cyan-400">
                    {a.table}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px]">
                      {a.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {String(a.observed)} (Exp: {String(a.expected)})
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>{a.status}</span>
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-sans text-slate-400">
                    {a.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Quarantined Records Viewer */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center space-x-2 mb-3">
          <AlertOctagon className="w-4 h-4 text-rose-400" />
          <h3 className="font-bold text-sm text-white">
            Quarantine Records Store (data/quarantine/)
          </h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Instead of discarding corrupted records silently or aborting the batch, flawed records are 
          diverted to quarantine with automated reason tags for engineer audit.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {quarantinedRecords.map((item, idx) => (
            <div key={idx} className="bg-slate-900/70 border border-rose-900/40 rounded-lg p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-rose-300">{item.id}</span>
                <span className="text-[10px] font-mono text-slate-500">{item.table}</span>
              </div>
              <div className="text-xs font-semibold text-rose-400 bg-rose-950/40 px-2 py-1 rounded border border-rose-900/50">
                {item.reason}
              </div>
              <div className="text-[11px] font-mono text-slate-400 truncate bg-slate-950 p-1.5 rounded border border-slate-800">
                {item.snippet}
              </div>
              <div className="text-[10px] text-slate-500 text-right">
                Quarantined: {item.timestamp}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Watermark & Audit Log Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Watermarks */}
        <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center space-x-2 mb-3">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-white">
              State Store: etl_watermarks
            </h3>
          </div>
          <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Pipeline Name:</span>
              <span className="font-mono text-white">ecommerce_orders_daily</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Target Table:</span>
              <span className="font-mono text-cyan-400">orders</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Watermark Column:</span>
              <span className="font-mono text-slate-300">order_purchase_timestamp</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">High-Watermark:</span>
              <span className="font-mono text-emerald-400 font-bold">2024-03-12 18:00:20</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Last Advance:</span>
              <span className="font-mono text-slate-400">2026-10-08 10:05:22</span>
            </div>
          </div>
        </div>

        {/* Audit Log */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center space-x-2 mb-3">
            <Database className="w-4 h-4 text-purple-400" />
            <h3 className="font-bold text-sm text-white">
              Execution Ledger: etl_audit_log
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2 px-2.5">Run ID</th>
                  <th className="py-2 px-2.5">Mode</th>
                  <th className="py-2 px-2.5">Loaded</th>
                  <th className="py-2 px-2.5">Quarantined</th>
                  <th className="py-2 px-2.5">Duration</th>
                  <th className="py-2 px-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {auditHistory.map(run => (
                  <tr key={run.runId} className="hover:bg-slate-900/30">
                    <td className="py-2 px-2.5 text-slate-300">{run.runId.substring(0, 16)}...</td>
                    <td className="py-2 px-2.5 text-cyan-400">{run.mode}</td>
                    <td className="py-2 px-2.5 text-emerald-400 font-bold">{run.loaded}</td>
                    <td className="py-2 px-2.5 text-rose-400">{run.quarantined}</td>
                    <td className="py-2 px-2.5 text-slate-400">{run.duration}</td>
                    <td className="py-2 px-2.5">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-semibold text-[10px] border border-emerald-800">
                        {run.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
