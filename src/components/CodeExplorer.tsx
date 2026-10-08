import React, { useState } from 'react';
import { 
  FileCode, 
  Folder, 
  FolderOpen, 
  Copy, 
  Check, 
  Download, 
  ChevronRight, 
  ChevronDown, 
  FileText, 
  Database, 
  Terminal,
  ExternalLink
} from 'lucide-react';
import { PROJECT_FILES, ProjectFile } from '../data/projectFiles';

export const CodeExplorer: React.FC = () => {
  const [selectedPath, setSelectedPath] = useState<string>('src/pipeline.py');
  const [copied, setCopied] = useState(false);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    src: true,
    sql: true,
    root: true,
    tests: true,
  });

  const selectedFile: ProjectFile = 
    PROJECT_FILES.find(f => f.path === selectedPath) || PROJECT_FILES[0];

  const toggleFolder = (folderName: string) => {
    setOpenFolders(prev => ({ ...prev, [folderName]: !prev[folderName] }));
  };

  const copyCode = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = () => {
    const blob = new Blob([selectedFile.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filesByFolder = {
    src: PROJECT_FILES.filter(f => f.folder === 'src'),
    sql: PROJECT_FILES.filter(f => f.folder === 'sql'),
    tests: PROJECT_FILES.filter(f => f.folder === 'tests'),
    root: PROJECT_FILES.filter(f => f.folder === 'root'),
  };

  const renderFileIcon = (lang: string) => {
    switch (lang) {
      case 'python':
        return <span className="text-yellow-400 font-bold text-xs">PY</span>;
      case 'sql':
        return <Database className="w-3.5 h-3.5 text-cyan-400" />;
      case 'bash':
        return <Terminal className="w-3.5 h-3.5 text-emerald-400" />;
      case 'yaml':
        return <span className="text-rose-400 font-bold text-[10px]">YML</span>;
      default:
        return <FileText className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Overview Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase mb-1">
              <FileCode className="w-4 h-4" />
              <span>Modular Repository Codebase</span>
            </div>
            <h2 className="text-xl font-bold text-white">
              Production Python & SQL Source Files
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Inspect modular data engineering components: ingestion, quarantine validation, 
              transformation, assertions, and transactional upsert loading.
            </p>
          </div>
          <div className="text-xs text-slate-400 font-mono bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 self-start sm:self-auto">
            <span>Repo Root: </span>
            <span className="text-emerald-400 font-semibold">ecommerce-etl-pipeline/</span>
          </div>
        </div>
      </div>

      {/* Split Code Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[640px]">
        {/* Left File Tree Sidebar */}
        <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-1 flex items-center justify-between">
              <span>Repository Tree</span>
              <span className="text-[10px] font-mono text-slate-600">{PROJECT_FILES.length} files</span>
            </div>

            <div className="space-y-1 text-xs">
              {/* SRC FOLDER */}
              <div>
                <button
                  onClick={() => toggleFolder('src')}
                  className="w-full flex items-center space-x-2 px-2 py-1.5 rounded text-slate-300 hover:bg-slate-900 font-medium text-left"
                >
                  {openFolders.src ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
                  {openFolders.src ? <FolderOpen className="w-4 h-4 text-emerald-400" /> : <Folder className="w-4 h-4 text-emerald-400" />}
                  <span>src/</span>
                </button>
                {openFolders.src && (
                  <div className="pl-6 space-y-0.5 mt-0.5 border-l border-slate-800/80 ml-3">
                    {filesByFolder.src.map(file => (
                      <button
                        key={file.path}
                        onClick={() => setSelectedPath(file.path)}
                        className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded font-mono text-xs text-left transition-colors ${
                          selectedPath === file.path
                            ? 'bg-slate-800 text-emerald-400 font-semibold'
                            : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                        }`}
                      >
                        {renderFileIcon(file.language)}
                        <span className="truncate">{file.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* SQL FOLDER */}
              <div>
                <button
                  onClick={() => toggleFolder('sql')}
                  className="w-full flex items-center space-x-2 px-2 py-1.5 rounded text-slate-300 hover:bg-slate-900 font-medium text-left"
                >
                  {openFolders.sql ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
                  {openFolders.sql ? <FolderOpen className="w-4 h-4 text-cyan-400" /> : <Folder className="w-4 h-4 text-cyan-400" />}
                  <span>sql/</span>
                </button>
                {openFolders.sql && (
                  <div className="pl-6 space-y-0.5 mt-0.5 border-l border-slate-800/80 ml-3">
                    {filesByFolder.sql.map(file => (
                      <button
                        key={file.path}
                        onClick={() => setSelectedPath(file.path)}
                        className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded font-mono text-xs text-left transition-colors ${
                          selectedPath === file.path
                            ? 'bg-slate-800 text-cyan-400 font-semibold'
                            : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                        }`}
                      >
                        {renderFileIcon(file.language)}
                        <span className="truncate">{file.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* TESTS FOLDER */}
              <div>
                <button
                  onClick={() => toggleFolder('tests')}
                  className="w-full flex items-center space-x-2 px-2 py-1.5 rounded text-slate-300 hover:bg-slate-900 font-medium text-left"
                >
                  {openFolders.tests ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
                  {openFolders.tests ? <FolderOpen className="w-4 h-4 text-purple-400" /> : <Folder className="w-4 h-4 text-purple-400" />}
                  <span>tests/</span>
                </button>
                {openFolders.tests && (
                  <div className="pl-6 space-y-0.5 mt-0.5 border-l border-slate-800/80 ml-3">
                    {filesByFolder.tests.map(file => (
                      <button
                        key={file.path}
                        onClick={() => setSelectedPath(file.path)}
                        className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded font-mono text-xs text-left transition-colors ${
                          selectedPath === file.path
                            ? 'bg-slate-800 text-purple-400 font-semibold'
                            : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                        }`}
                      >
                        {renderFileIcon(file.language)}
                        <span className="truncate">{file.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ROOT CONFIG FILES */}
              <div>
                <button
                  onClick={() => toggleFolder('root')}
                  className="w-full flex items-center space-x-2 px-2 py-1.5 rounded text-slate-300 hover:bg-slate-900 font-medium text-left"
                >
                  {openFolders.root ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
                  <Folder className="w-4 h-4 text-amber-400" />
                  <span>config & root/</span>
                </button>
                {openFolders.root && (
                  <div className="pl-6 space-y-0.5 mt-0.5 border-l border-slate-800/80 ml-3">
                    {filesByFolder.root.map(file => (
                      <button
                        key={file.path}
                        onClick={() => setSelectedPath(file.path)}
                        className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded font-mono text-xs text-left transition-colors ${
                          selectedPath === file.path
                            ? 'bg-slate-800 text-amber-400 font-semibold'
                            : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                        }`}
                      >
                        {renderFileIcon(file.language)}
                        <span className="truncate">{file.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-900 text-[11px] text-slate-500">
            <span className="block text-slate-400 font-medium mb-1">Testing Tip:</span>
            <span>Run <code className="text-emerald-400">pytest tests/</code> in terminal to execute all test assertions.</span>
          </div>
        </div>

        {/* Right Code Display Area */}
        <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          {/* File Header */}
          <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-slate-300 font-mono text-sm font-bold">
                  {selectedFile.path}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono uppercase">
                  {selectedFile.language}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                {selectedFile.description}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={downloadFile}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                title="Download this file"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save File</span>
              </button>
              <button
                onClick={copyCode}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-sm"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Syntax Highlighted Code Viewer */}
          <div className="p-4 flex-1 overflow-x-auto overflow-y-auto max-h-[600px] font-mono text-xs text-slate-200 bg-slate-950 scrollbar-thin scrollbar-thumb-slate-800">
            <pre className="leading-relaxed">
              <code>
                {selectedFile.content.split('\n').map((line, idx) => (
                  <div key={idx} className="flex hover:bg-slate-900/50 py-0.5">
                    <span className="w-10 text-right pr-4 text-slate-600 select-none text-[11px]">
                      {idx + 1}
                    </span>
                    <span className="flex-1 whitespace-pre">{line || ' '}</span>
                  </div>
                ))}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
