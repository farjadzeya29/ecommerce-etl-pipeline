import React, { useState } from 'react';
import { 
  Briefcase, 
  Copy, 
  Check, 
  Sparkles, 
  MessageSquare, 
  HelpCircle, 
  CheckCircle2, 
  ShieldCheck, 
  Database,
  ArrowRight
} from 'lucide-react';

export const ResumeGuide: React.FC = () => {
  const [copiedBullets, setCopiedBullets] = useState(false);
  const [copiedPitch, setCopiedPitch] = useState(false);

  const resumeBullets = [
    "Architected and implemented an end-to-end e-commerce ETL pipeline in Python and pandas, automating ingestion, schema validation, data cleaning, and transactional loading into a 3NF MySQL relational database.",
    "Engineered an incremental loading mechanism leveraging high-watermark timestamp tracking and idempotent upserts (INSERT ... ON DUPLICATE KEY UPDATE) to safely ingest delta records without duplicate data on pipeline re-runs.",
    "Implemented automated pre-load data quality gates and bad-record quarantine routing, auditing referential integrity across 5 core entities and maintaining execution audit logging with structured file and console outputs."
  ];

  const elevatorPitch = "I built an end-to-end e-commerce ETL pipeline in Python, pandas, and MySQL. It extracts transactional datasets across orders, items, and payments, validates schemas, diverts corrupted records into an isolated quarantine store, and transforms raw strings into normalized datatypes. I implemented an incremental loading mechanism using high-watermark state tracking to process delta batches efficiently, combined with idempotent upserts to make repeated executions completely safe. Before loading into MySQL, the pipeline runs 12 automated data quality assertions verifying referential integrity and zero null primary keys, and logs all execution metadata to an audit ledger.";

  const interviewQuestions = [
    {
      q: "How does your incremental loading mechanism work?",
      a: "The pipeline maintains a metadata state table called `etl_watermarks` storing the latest processed transaction timestamp (`order_purchase_timestamp`). During delta ingestion, the extractor queries this watermark and filters for new records. Once the batch is loaded through idempotent upserts, the watermark is atomically updated with the new maximum timestamp, preventing redundant reprocessing."
    },
    {
      q: "How do you ensure idempotency when the pipeline runs multiple times?",
      a: "I designed the database loader using parameterized `INSERT INTO ... ON DUPLICATE KEY UPDATE` statements in MySQL. Because tables have strict primary and composite keys (e.g. `(order_id, order_item_id)`), re-running the exact same batch updates records in place rather than inserting duplicate rows, guaranteeing identical state."
    },
    {
      q: "How do you handle dirty data and schema issues without crashing the whole job?",
      a: "Rather than letting an entire batch fail on a single faulty row or silently dropping corrupted data, I implemented a quarantine pattern in `validate.py`. Records with negative prices, null keys, or invalid statuses are separated into timestamped quarantine CSVs tagged with an explicit failure reason, allowing clean rows to proceed while preserving an audit trail for data stewards."
    },
    {
      q: "Why use Python and pandas instead of loading raw data directly into SQL staging tables?",
      a: "Processing raw files in Python before hitting the database allows robust data quality checks—such as verifying referential integrity between parent orders and child line items—prior to initiating database transactions. This catches data corruption in memory and prevents costly rollback overhead and database lock contention."
    },
    {
      q: "How do you verify data accuracy after loading into MySQL?",
      a: "I wrote post-load validation queries in `sql/validation_queries.sql`. These include financial reconciliation checking that line item amounts plus freight match payment gateway capture totals, referential audits checking for orphaned foreign keys via outer joins, and row count reconciliations confirming that extracted rows match cleaned plus quarantined rows."
    }
  ];

  const handleCopyBullets = () => {
    navigator.clipboard.writeText(resumeBullets.map(b => `• ${b}`).join('\n\n'));
    setCopiedBullets(true);
    setTimeout(() => setCopiedBullets(false), 2000);
  };

  const handleCopyPitch = () => {
    navigator.clipboard.writeText(elevatorPitch);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase mb-1">
              <Briefcase className="w-4 h-4" />
              <span>Career & Interview Readiness</span>
            </div>
            <h2 className="text-xl font-bold text-white">
              Junior Data Engineer Resume Bullets & Interview Guide
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Concise, high-impact resume bullet points tailored for Data Engineering roles, 
              paired with interview answers to explain this project with authority.
            </p>
          </div>
        </div>
      </div>

      {/* Section 1: Resume Bullets */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">
              Targeted Resume Bullet Points (Copy & Paste)
            </h3>
          </div>
          <button
            onClick={handleCopyBullets}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-sm active:scale-95"
          >
            {copiedBullets ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy 3 Bullets</span>
              </>
            )}
          </button>
        </div>

        <div className="space-y-3">
          {resumeBullets.map((bullet, idx) => (
            <div key={idx} className="bg-slate-900/70 border border-slate-800/80 rounded-lg p-4 text-xs text-slate-200 leading-relaxed font-sans relative hover:border-slate-700 transition-colors">
              <span className="text-emerald-400 font-bold mr-2 text-sm">•</span>
              {bullet}
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: 30-Second Interview Elevator Pitch */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-white">
              30-Second Interview Elevator Pitch
            </h3>
          </div>
          <button
            onClick={handleCopyPitch}
            className="inline-flex items-center space-x-1 px-3 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs border border-slate-800"
          >
            {copiedPitch ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedPitch ? 'Copied' : 'Copy Pitch'}</span>
          </button>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          When asked: <span className="text-slate-200 italic font-medium">"Tell me about a technical project you built."</span>
        </p>
        <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800 text-xs text-slate-300 italic leading-relaxed">
          "{elevatorPitch}"
        </div>
      </div>

      {/* Section 3: Deep-Dive Interview Q&A */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center space-x-2 mb-4">
          <HelpCircle className="w-4 h-4 text-purple-400" />
          <h3 className="font-bold text-sm text-white">
            Data Engineering Technical Interview Deep-Dives
          </h3>
        </div>

        <div className="space-y-4">
          {interviewQuestions.map((item, idx) => (
            <div key={idx} className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-2">
              <h4 className="text-xs font-bold text-emerald-400 flex items-start space-x-2">
                <span className="font-mono text-slate-500">Q{idx + 1}.</span>
                <span>{item.q}</span>
              </h4>
              <p className="text-xs text-slate-300 pl-6 leading-relaxed">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
