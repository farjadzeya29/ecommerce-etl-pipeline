import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  RotateCcw, 
  Terminal, 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  Clock, 
  Database, 
  ShieldCheck, 
  Sliders, 
  Copy, 
  Check, 
  Layers
} from 'lucide-react';

interface LogLine {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  module: string;
  message: string;
}

export const PipelineRunner: React.FC = () => {
  const [pipelineMode, setPipelineMode] = useState<'full' | 'incremental' | 'fault'>('full');
  const [dbTarget, setDbTarget] = useState<'mysql' | 'sqlite'>('mysql');
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [watermark, setWatermark] = useState<string>('Unset (Initial Full Run Required)');
  const [stats, setStats] = useState({
    extracted: 0,
    cleaned: 0,
    quarantined: 0,
    loaded: 0,
    duration: '0.00s',
    runId: 'None',
    status: 'IDLE' as 'IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILED'
  });

  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (level: LogLine['level'], module: string, message: string) => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: timeStr,
      level,
      module,
      message
    }]);
  };

  const runPipelineSimulation = async () => {
    setIsRunning(true);
    setCurrentStep(1);
    setLogs([]);
    const startTime = performance.now();
    const runId = `RUN-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}-${Math.random().toString(16).substring(2, 8)}`;

    setStats(prev => ({
      ...prev,
      runId,
      status: 'RUNNING',
      duration: '0.00s'
    }));

    // Step 1: Initialization & DB Connection
    addLog('INFO', 'pipeline.py', `================================================================================`);
    addLog('INFO', 'pipeline.py', `STARTING E-COMMERCE ETL PIPELINE | MODE: ${pipelineMode.toUpperCase()} | TARGET: ${dbTarget.toUpperCase()}`);
    addLog('INFO', 'pipeline.py', `Run ID Assigned: ${runId}`);
    addLog('INFO', 'pipeline.py', `================================================================================`);
    await delay(300);

    addLog('INFO', 'db.py', `Connecting to ${dbTarget.toUpperCase()} host localhost:3306 [Database: ecommerce_dw]...`);
    addLog('INFO', 'db.py', `Database connection verified. Connection pool established.`);
    
    // Step 2: Watermark Lookup
    setCurrentStep(2);
    await delay(350);
    if (pipelineMode === 'incremental') {
      const activeWm = watermark.includes('Unset') ? '2024-02-25 16:40:50' : watermark;
      addLog('INFO', 'load.py', `Querying state table 'etl_watermarks' for active high-watermark...`);
      addLog('INFO', 'load.py', `Active watermark for 'orders': ${activeWm}`);
      setWatermark(activeWm);
    } else {
      addLog('INFO', 'load.py', `Full baseline mode requested. Bypassing watermark cutoff.`);
    }

    // Step 3: Extraction
    setCurrentStep(3);
    await delay(450);
    if (pipelineMode === 'fault') {
      addLog('INFO', 'extract.py', `Reading raw CSV files from ./data/raw...`);
      addLog('INFO', 'extract.py', `Extracted 15 records from customers.csv`);
      addLog('ERROR', 'extract.py', `FATAL: FileNotFoundError: [Errno 2] Missing critical schema dependency 'orders_corrupted.csv'`);
      addLog('ERROR', 'pipeline.py', `Pipeline failed during Extraction phase. Transaction rolled back.`);
      addLog('INFO', 'load.py', `Audit log recorded: Run ${runId} [FAILED] in 0.85s.`);
      setIsRunning(false);
      setCurrentStep(0);
      setStats({
        extracted: 15,
        cleaned: 0,
        quarantined: 0,
        loaded: 0,
        duration: '0.85s',
        runId,
        status: 'FAILED'
      });
      return;
    }

    if (pipelineMode === 'full') {
      addLog('INFO', 'extract.py', `Ingesting baseline master and transaction datasets...`);
      addLog('INFO', 'extract.py', `* customers.csv:  15 raw records`);
      addLog('INFO', 'extract.py', `* products.csv:   10 raw records`);
      addLog('INFO', 'extract.py', `* orders.csv:     17 raw records`);
      addLog('INFO', 'extract.py', `* order_items.csv: 19 raw records`);
      addLog('INFO', 'extract.py', `* payments.csv:   15 raw records`);
      addLog('INFO', 'extract.py', `Extraction completed: 5 entities, 76 total raw records ingested.`);
      setStats(prev => ({ ...prev, extracted: 76 }));
    } else {
      addLog('INFO', 'extract.py', `Ingesting incremental delta batch (March 2024)...`);
      addLog('INFO', 'extract.py', `* orders_incremental.csv:      5 raw records`);
      addLog('INFO', 'extract.py', `* order_items_incremental.csv: 5 raw records`);
      addLog('INFO', 'extract.py', `* payments_incremental.csv:    5 raw records`);
      addLog('INFO', 'extract.py', `Applied watermark filter (> ${watermark}): 5 delta orders qualified.`);
      setStats(prev => ({ ...prev, extracted: 15 }));
    }

    // Step 4: Schema Validation & Quarantine Gate
    setCurrentStep(4);
    await delay(500);
    addLog('INFO', 'validate.py', `Executing Schema Validation & Quarantine Gate...`);
    
    if (pipelineMode === 'full') {
      addLog('INFO', 'validate.py', `Validation [customers]: 15 passed, 0 quarantined.`);
      addLog('INFO', 'validate.py', `Validation [products]: 10 passed, 0 quarantined.`);
      addLog('WARNING', 'validate.py', `Validation [orders]: Row 'ORD-BAD1' missing mandatory customer_id. Quarantined.`);
      addLog('WARNING', 'validate.py', `Validation [orders]: Duplicate primary key 'ORD-7005' detected. Quarantined duplicate.`);
      addLog('WARNING', 'validate.py', `Validation [order_items]: Item in 'ORD-BAD2' has negative price (-$25.00). Quarantined.`);
      addLog('INFO', 'validate.py', `Saved 3 bad records -> data/quarantine/*_quarantine.csv with failure reason tags.`);
      setStats(prev => ({ ...prev, cleaned: 73, quarantined: 3 }));
    } else {
      addLog('INFO', 'validate.py', `Validation [delta_batch]: 15 records passed schema check. 0 quarantined.`);
      setStats(prev => ({ ...prev, cleaned: 15, quarantined: 0 }));
    }

    // Step 5: Transformation & Normalization
    setCurrentStep(5);
    await delay(450);
    addLog('INFO', 'transform.py', `Standardizing data types and formatting...`);
    addLog('INFO', 'transform.py', `* Casing normalized: State codes -> ISO uppercase, categories -> snake_case.`);
    addLog('INFO', 'transform.py', `* Timestamps standardized to ISO 8601 (YYYY-MM-DD HH:MM:SS).`);
    addLog('INFO', 'transform.py', `* Monetary fields rounded to 2 decimal places.`);
    addLog('INFO', 'transform.py', `* Cleaned datasets cached to data/processed/*.csv for audit lineage.`);

    // Step 6: Pre-Load Quality Audits
    setCurrentStep(6);
    await delay(500);
    addLog('INFO', 'quality_checks.py', `Running automated pre-load data quality assertions...`);
    addLog('INFO', 'quality_checks.py', `[PASS] NOT_NULL_PRIMARY_KEYS: 0 nulls across all PK columns.`);
    addLog('INFO', 'quality_checks.py', `[PASS] PRIMARY_KEY_UNIQUENESS: 0 duplicate keys detected.`);
    addLog('INFO', 'quality_checks.py', `[PASS] FK_ORDERS_TO_CUSTOMERS: 100% of order customer_ids exist in customers.`);
    addLog('INFO', 'quality_checks.py', `[PASS] FK_ORDER_ITEMS_TO_ORDERS: 100% of item order_ids exist in orders.`);
    addLog('INFO', 'quality_checks.py', `[PASS] FK_ORDER_ITEMS_TO_PRODUCTS: 100% of product_ids exist in catalog.`);
    addLog('INFO', 'quality_checks.py', `[PASS] POSITIVE_ITEM_PRICE: All line item prices > $0.00.`);
    addLog('SUCCESS', 'quality_checks.py', `All 12 Data Quality Assertions PASSED successfully.`);

    // Step 7: Database Load & Watermark Advance
    setCurrentStep(7);
    await delay(550);
    addLog('INFO', 'load.py', `Starting database loading in relational dependency order...`);
    
    if (pipelineMode === 'full') {
      addLog('INFO', 'load.py', `Executing upsert: 15 rows -> customers`);
      addLog('INFO', 'load.py', `Executing upsert: 10 rows -> products`);
      addLog('INFO', 'load.py', `Executing upsert: 15 rows -> orders`);
      addLog('INFO', 'load.py', `Executing upsert: 18 rows -> order_items`);
      addLog('INFO', 'load.py', `Executing upsert: 15 rows -> payments`);
      
      const newWm = '2024-02-25 16:40:50';
      setWatermark(newWm);
      addLog('SUCCESS', 'load.py', `Updated etl_watermarks ('orders') -> ${newWm}`);
      setStats(prev => ({ ...prev, loaded: 73 }));
    } else {
      addLog('INFO', 'load.py', `Executing upsert: 5 rows -> orders`);
      addLog('INFO', 'load.py', `Executing upsert: 5 rows -> order_items`);
      addLog('INFO', 'load.py', `Executing upsert: 5 rows -> payments`);

      const newWm = '2024-03-12 18:00:20';
      setWatermark(newWm);
      addLog('SUCCESS', 'load.py', `Updated etl_watermarks ('orders') -> ${newWm}`);
      setStats(prev => ({ ...prev, loaded: 15 }));
    }

    // Step 8: Post-Load SQL Validation & Audit Log Entry
    setCurrentStep(8);
    await delay(400);
    const duration = ((performance.now() - startTime) / 1000).toFixed(2) + 's';
    addLog('INFO', 'sql', `Executing post-load row count certification query...`);
    addLog('INFO', 'sql', `Target Warehouse Counts Certified: customers, products, orders, order_items, payments`);
    addLog('INFO', 'load.py', `Audit run ${runId} finalized in ${duration} [Status: SUCCESS].`);
    addLog('INFO', 'pipeline.py', `================================================================================`);
    addLog('SUCCESS', 'pipeline.py', `PIPELINE EXECUTION COMPLETED SUCCESSFULLY IN ${duration}`);
    addLog('INFO', 'pipeline.py', `================================================================================`);

    setStats(prev => ({
      ...prev,
      duration,
      status: 'SUCCESS'
    }));
    setIsRunning(false);
    setCurrentStep(0);
  };

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const copyLogsToClipboard = () => {
    const text = logs.map(l => `[${l.timestamp}] [${l.level.padEnd(7)}] [${l.module}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2500);
  };

  const stepsList = [
    { num: 1, title: 'DB Check', desc: 'Connectivity & pool' },
    { num: 2, title: 'Watermark', desc: 'Read state cutoff' },
    { num: 3, title: 'Extract', desc: 'CSV & delta batches' },
    { num: 4, title: 'Validation', desc: 'Schema & quarantine' },
    { num: 5, title: 'Transform', desc: 'Types & normalization' },
    { num: 6, title: 'DQ Gate', desc: '12 Pre-load asserts' },
    { num: 7, title: 'MySQL Load', desc: 'Idempotent upserts' },
    { num: 8, title: 'SQL Verify', desc: 'Audit & reconciliation' },
  ];

  return (
    <div className="space-y-6">
      {/* Controls & Mode Selection Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase mb-1">
              <Terminal className="w-4 h-4" />
              <span>Interactive Execution Console</span>
            </div>
            <h2 className="text-xl font-bold text-white">
              Run E-Commerce ETL Pipeline
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Trigger a real-time orchestrated execution simulation demonstrating extraction, 
              quarantining dirty data, automated quality assertions, and incremental loading.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Mode Selector */}
            <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setPipelineMode('full')}
                disabled={isRunning}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  pipelineMode === 'full'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Full Baseline
              </button>
              <button
                onClick={() => setPipelineMode('incremental')}
                disabled={isRunning}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  pipelineMode === 'incremental'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Incremental Delta
              </button>
              <button
                onClick={() => setPipelineMode('fault')}
                disabled={isRunning}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  pipelineMode === 'fault'
                    ? 'bg-rose-700 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Simulate Fault
              </button>
            </div>

            {/* Target DB Selector */}
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setDbTarget('mysql')}
                disabled={isRunning}
                className={`px-2.5 py-1.5 rounded-md font-mono ${
                  dbTarget === 'mysql' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-500'
                }`}
              >
                MySQL 8.0
              </button>
              <button
                onClick={() => setDbTarget('sqlite')}
                disabled={isRunning}
                className={`px-2.5 py-1.5 rounded-md font-mono ${
                  dbTarget === 'sqlite' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-500'
                }`}
              >
                SQLite Dev
              </button>
            </div>

            {/* Run Button */}
            <button
              onClick={runPipelineSimulation}
              disabled={isRunning}
              className="inline-flex items-center space-x-2 px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Executing Pipeline...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Pipeline</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Real-time Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-4 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/60">
            <span className="text-slate-500 block text-[11px]">Audit Run ID</span>
            <span className="font-mono text-slate-200 font-semibold truncate block mt-0.5">
              {stats.runId}
            </span>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/60">
            <span className="text-slate-500 block text-[11px]">Extracted Rows</span>
            <span className="font-mono text-amber-400 font-bold text-sm block mt-0.5">
              {stats.extracted}
            </span>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/60">
            <span className="text-slate-500 block text-[11px]">Cleaned / Valid</span>
            <span className="font-mono text-blue-400 font-bold text-sm block mt-0.5">
              {stats.cleaned}
            </span>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/60">
            <span className="text-slate-500 block text-[11px]">Quarantined</span>
            <span className="font-mono text-rose-400 font-bold text-sm block mt-0.5">
              {stats.quarantined}
            </span>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/60">
            <span className="text-slate-500 block text-[11px]">Loaded to MySQL</span>
            <span className="font-mono text-emerald-400 font-bold text-sm block mt-0.5">
              {stats.loaded}
            </span>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/60">
            <span className="text-slate-500 block text-[11px]">Active Watermark</span>
            <span className="font-mono text-cyan-400 font-semibold text-[11px] truncate block mt-0.5" title={watermark}>
              {watermark}
            </span>
          </div>
        </div>
      </div>

      {/* Step Execution Indicator */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
          <span className="font-semibold uppercase tracking-wider text-slate-300">
            Execution Progress Indicator
          </span>
          {isRunning && (
            <span className="text-emerald-400 font-mono animate-pulse">
              ● Active Stage: {stepsList[currentStep - 1]?.title || 'Starting...'}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {stepsList.map(step => {
            const isCompleted = currentStep > step.num || stats.status === 'SUCCESS';
            const isCurrent = currentStep === step.num;
            return (
              <div
                key={step.num}
                className={`p-2.5 rounded-lg border text-center transition-all ${
                  isCurrent
                    ? 'bg-emerald-950/50 border-emerald-500 shadow-md shadow-emerald-950/40'
                    : isCompleted
                    ? 'bg-slate-950 border-slate-800 text-slate-300'
                    : 'bg-slate-950/40 border-slate-900 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-center space-x-1 mb-1">
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : isCurrent ? (
                    <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="text-[11px] font-mono text-slate-500">{step.num}</span>
                  )}
                  <span className={`text-xs font-semibold ${isCurrent ? 'text-emerald-300' : ''}`}>
                    {step.title}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 truncate">{step.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Terminal Log Console */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl font-mono text-xs">
        <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <span className="text-slate-400 text-xs ml-2 font-mono">
              logs/etl_pipeline_{new Date().toISOString().slice(0, 10).replace(/-/g, '')}.log
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-slate-500 text-[11px]">
              {logs.length} events logged
            </span>
            <button
              onClick={copyLogsToClipboard}
              disabled={logs.length === 0}
              className="inline-flex items-center space-x-1 text-slate-400 hover:text-white transition-colors text-xs px-2 py-1 rounded bg-slate-800 disabled:opacity-40"
            >
              {copiedLogs ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Logs</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-4 h-[380px] overflow-y-auto space-y-1 bg-slate-950 scrollbar-thin scrollbar-thumb-slate-800">
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600">
              <Terminal className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-slate-500">Pipeline is idle. Click "Run Pipeline" above to start execution.</p>
              <p className="text-[11px] text-slate-600 mt-1">
                Tip: Test "Incremental Delta" to observe watermark state filtering!
              </p>
            </div>
          ) : (
            logs.map(log => {
              const levelColor = 
                log.level === 'SUCCESS' ? 'text-emerald-400 font-semibold' :
                log.level === 'ERROR' ? 'text-rose-400 font-bold bg-rose-950/30 px-1 rounded' :
                log.level === 'WARNING' ? 'text-amber-300' :
                'text-slate-300';

              const badgeColor =
                log.level === 'SUCCESS' ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800' :
                log.level === 'ERROR' ? 'bg-rose-950/80 text-rose-300 border-rose-800' :
                log.level === 'WARNING' ? 'bg-amber-950/80 text-amber-300 border-amber-800' :
                'bg-slate-900 text-slate-400 border-slate-800';

              return (
                <div key={log.id} className="leading-relaxed hover:bg-slate-900/40 px-1 rounded transition-colors flex items-start space-x-2">
                  <span className="text-slate-600 flex-shrink-0 select-none">[{log.timestamp}]</span>
                  <span className={`px-1.5 py-0.2 text-[10px] rounded border font-semibold flex-shrink-0 ${badgeColor}`}>
                    {log.level}
                  </span>
                  <span className="text-slate-500 flex-shrink-0 font-mono">[{log.module}]</span>
                  <span className={`break-all ${levelColor}`}>{log.message}</span>
                </div>
              );
            })
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
};
