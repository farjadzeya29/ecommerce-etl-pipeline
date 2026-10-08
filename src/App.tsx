import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { ArchitectureView } from './components/ArchitectureView';
import { PipelineRunner } from './components/PipelineRunner';
import { CodeExplorer } from './components/CodeExplorer';
import { SqlExplorer } from './components/SqlExplorer';
import { QualityDashboard } from './components/QualityDashboard';
import { ResumeGuide } from './components/ResumeGuide';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('pipeline');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Navigation */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'architecture' && <ArchitectureView />}
        {activeTab === 'pipeline' && <PipelineRunner />}
        {activeTab === 'code' && <CodeExplorer />}
        {activeTab === 'sql' && <SqlExplorer />}
        {activeTab === 'quality' && <QualityDashboard />}
        {activeTab === 'resume' && <ResumeGuide />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>End-to-End E-Commerce ETL Pipeline · Junior Data Engineer Portfolio Project</span>
          <span className="font-mono text-slate-600">Python 3.10 · pandas · MySQL 8.0 · SQL · Docker</span>
        </div>
      </footer>
    </div>
  );
}
