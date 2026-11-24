import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import CrossModuleVisualizer from '../components/CrossModuleVisualizer';
import HealthScoreWidget from '../components/HealthScoreWidget';
import RootCauseModal from '../components/RootCauseModal';
import {
  getAiInsights,
  getHealthScore,
  getDailyBriefing,
  triggerProactiveScan
} from '../api';

export default function AiIntelligence({ onSelectInsight, onNavigateTo }) {
  const [insights, setInsights] = useState([]);
  const [healthData, setHealthData] = useState(null);
  const [briefing, setBriefing] = useState(null);
  const [activeSeverity, setActiveSeverity] = useState('ALL');
  const [activeModule, setActiveModule] = useState('ALL');
  const [selectedInsightForModal, setSelectedInsightForModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [insRes, healthRes, briefRes] = await Promise.all([
        getAiInsights({ status: 'ALL' }),
        getHealthScore(),
        getDailyBriefing()
      ]);
      setInsights(insRes.data);
      setHealthData(healthRes.data);
      setBriefing(briefRes.data);
    } catch (err) {
      console.error('Failed to load AI intelligence data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleManualScan = async () => {
    setIsScanning(true);
    try {
      await triggerProactiveScan();
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  const filteredInsights = insights.filter((ins) => {
    if (activeSeverity !== 'ALL' && ins.severity !== activeSeverity) return false;
    if (activeModule !== 'ALL' && !ins.affected_module.toLowerCase().includes(activeModule.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#EBF4EE] border border-[#E5ECE7] text-[#111827]">
              <BrainCircuit className="w-6 h-6 text-[#347A59]" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-[#111827] tracking-tight flex items-center gap-2">
                Proactive Decision Intelligence Engine
              </h1>
              <p className="text-xs text-[#111827] mt-0.5">
                Autonomous multi-module diagnostics: detecting problems, root causes, and recommended solutions without manual querying.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleManualScan}
            disabled={isScanning}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#347A59] hover:bg-[#244B39] text-[#F4F8F5] text-xs font-bold shadow-md transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Diagnosing System...' : 'Re-run Full Diagnostics'}</span>
          </button>
        </div>
      </div>

      {/* 2-Column: Health Score + Daily Briefing Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HealthScoreWidget healthData={healthData} />

        {briefing && (
          <div className="bg-white rounded-2xl p-6 border border-[#E5ECE7] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#E5ECE7]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#347A59]" />
                  <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">
                    Executive Morning Briefing
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-[#111827]">{briefing.briefing_date}</span>
              </div>

              <p className="text-xs text-[#111827] mt-4 leading-relaxed font-medium">
                {briefing.summary_text}
              </p>

              {/* Key Identified Operational Risks */}
              {briefing.risks && briefing.risks.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[#E5ECE7]">
                  <h4 className="text-[11px] font-bold text-rose-800 uppercase tracking-wider mb-2">
                    Primary Operational Vulnerabilities
                  </h4>
                  <ul className="space-y-1.5 text-xs">
                    {briefing.risks.map((risk, i) => (
                      <li key={i} className="flex items-start gap-2 text-[#111827]">
                        <span className="text-rose-600 font-bold">•</span>
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-[#E5ECE7] flex items-center justify-between">
              <span className="text-xs text-[#111827]">
                Action Items: <strong className="text-emerald-700 font-bold">{briefing.action_items?.length || 0} Ready</strong>
              </span>
              <button
                onClick={() => onNavigateTo('action-center')}
                className="text-xs font-bold text-[#111827] hover:text-[#2F2922] flex items-center gap-1"
              >
                <span>Go to AI Action Center</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cross-Module Intelligence Visualizer */}
      <CrossModuleVisualizer />

      {/* Deep Root Cause Insights Section */}
      <div className="bg-white rounded-2xl p-6 border border-[#E5ECE7] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E5ECE7] gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">
              Autonomous Root Cause Diagnostic Findings
            </h3>
            <p className="text-xs text-[#111827] mt-0.5">
              Click any finding to inspect the 5-step investigative chain and execute the countermeasure.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {['ALL', 'CRITICAL', 'WARNING'].map((sev) => (
              <button
                key={sev}
                onClick={() => setActiveSeverity(sev)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeSeverity === sev
                    ? 'bg-[#347A59] text-[#F4F8F5] font-bold'
                    : 'text-[#111827] hover:text-[#111827] bg-[#F4F8F5] border border-[#E5ECE7]'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {/* Findings List */}
        <div className="mt-5 space-y-3">
          {filteredInsights.length === 0 ? (
            <div className="text-center py-12 text-[#111827] text-xs">
              No active diagnostics matching selected filters.
            </div>
          ) : (
            filteredInsights.map((ins) => (
              <div
                key={ins.id}
                onClick={() => setSelectedInsightForModal(ins)}
                className={`p-5 rounded-xl border transition-all cursor-pointer group shadow-sm hover:shadow-md ${
                  ins.severity === 'CRITICAL'
                    ? 'bg-rose-50/40 border-rose-300 hover:border-rose-400'
                    : 'bg-[#F4F8F5] border-[#E5ECE7] hover:border-[#347A59]'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={ins.severity} />
                    <span className="text-xs font-bold text-[#111827] uppercase tracking-wider">
                      {ins.affected_module}
                    </span>
                    {ins.status === 'APPROVED' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        EXECUTED
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#111827] font-mono">
                    Detected: {new Date(ins.created_at).toLocaleDateString()} {new Date(ins.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-[#111827] group-hover:text-[#2F2922] transition-colors">
                  {ins.title}
                </h4>

                <div className="mt-2.5 grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-white border border-[#E5ECE7]">
                    <span className="text-[#111827] font-bold block mb-1">Root Cause:</span>
                    <p className="text-[#111827] line-clamp-2 leading-relaxed">{ins.root_cause}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-[#E5ECE7]">
                    <span className="text-rose-700 font-bold block mb-1">Business Impact:</span>
                    <p className="text-[#111827] line-clamp-2 leading-relaxed">{ins.business_impact}</p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-[#E5ECE7] flex items-center justify-between">
                  <div className="text-xs text-[#111827] font-medium truncate max-w-xl">
                    <strong className="text-[#111827]">Recommended Action:</strong> {ins.recommended_solution}
                  </div>
                  <span className="text-xs font-bold text-[#111827] flex items-center gap-1 group-hover:translate-x-1 transition-transform shrink-0 ml-4">
                    <span>Inspect Investigation</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Root Cause Inspection Modal */}
      {selectedInsightForModal && (
        <RootCauseModal
          insight={selectedInsightForModal}
          onClose={() => setSelectedInsightForModal(null)}
          onActionSuccess={() => {
            fetchData();
          }}
        />
      )}
    </div>
  );
}
