import React, { useState, useEffect } from 'react';
import {
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Package,
  Truck,
  DollarSign,
  FileText,
  Sparkles,
  HelpCircle,
  Layers,
  ChevronRight,
  Activity
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { getAiInsights, approveAiAction, dismissAiInsight, getAuditLogs } from '../api';

export default function AiActionCenter({ onSelectInsight }) {
  const [insights, setInsights] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [executingId, setExecutingId] = useState(null);
  const [notification, setNotification] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [insRes, logsRes] = await Promise.all([
        getAiInsights({ status: 'ALL' }),
        getAuditLogs(30)
      ]);
      setInsights(insRes.data);
      setAuditLogs(logsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (insight) => {
    setExecutingId(insight.id);
    try {
      const res = await approveAiAction({
        insight_id: insight.id,
        action_type: insight.action_type || 'SYSTEM_DEFAULT'
      });
      setNotification({ type: 'success', message: res.data.message });
      await loadData();
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      setNotification({ type: 'error', message: err.response?.data?.detail || 'Execution failed' });
    } finally {
      setExecutingId(null);
    }
  };

  const handleReject = async (insight) => {
    setExecutingId(insight.id);
    try {
      await dismissAiInsight(insight.id);
      await loadData();
      setNotification({ type: 'info', message: `Dismissed recommendation: ${insight.title}` });
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setExecutingId(null);
    }
  };

  const pendingActions = insights.filter((i) => i.status === 'ACTIVE' && i.action_type);
  const approvedActions = insights.filter((i) => i.status === 'APPROVED');

  // Format steps if the solution contains numbered steps
  const formatSolutionSteps = (solutionText) => {
    if (!solutionText) return null;
    // Check if it has numbered steps like "1) ... 2) ..." or "Step 1: ... Step 2: ..."
    const stepRegex = /(?:Step\s*\d+:|\d+\))\s*([^1-9\)]+)/g;
    const matches = [];
    let match;
    while ((match = stepRegex.exec(solutionText)) !== null) {
      matches.push(match[1].trim());
    }

    if (matches.length > 1) {
      return (
        <div className="space-y-2.5 mt-2.5">
          {matches.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-xs text-[#111827]">
              <span className="shrink-0 w-5 h-5 rounded-full bg-[#347A59] text-white font-bold flex items-center justify-center text-[10px] shadow-xs">
                {idx + 1}
              </span>
              <span className="leading-relaxed font-semibold text-[#111827]">{step}</span>
            </div>
          ))}
        </div>
      );
    }

    return <p className="text-xs text-[#111827] font-semibold leading-relaxed mt-1.5">{solutionText}</p>;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="p-2.5 rounded-xl bg-[#EBF4EE] border border-[#E5ECE7] text-[#111827]">
            <Zap className="w-6 h-6 text-[#347A59]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#111827] tracking-tight">AI Action Center & Approvals</h1>
            <p className="text-xs text-[#111827] font-medium mt-0.5">
              Review and authorize high-impact business actions recommended by the AI. Clear root causes, quantified financial impacts, and concrete executable solutions.
            </p>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between border shadow-xs ${
            notification.type === 'success'
              ? 'bg-[#EBF4EE] text-[#1B4332] border-[#B8D7C4]'
              : notification.type === 'info'
              ? 'bg-[#F4F8F5] text-[#111827] border-[#E5ECE7]'
              : 'bg-[#FDF0F1] text-[#8B2E37] border-[#F2C1C5]'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-[#111827] hover:text-black font-bold">✕</button>
        </div>
      )}

      {/* Summary Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-[#E8CDA8] bg-[#FBF3E8] shadow-xs">
          <p className="text-xs font-black text-[#825425] uppercase tracking-wide flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Authorizations</span>
          </p>
          <h3 className="text-2xl font-black text-[#111827] mt-1">{pendingActions.length} Actions</h3>
          <p className="text-[11px] text-[#111827] font-medium mt-1">Requires owner approval before system execution</p>
        </div>
        <div className="glass-card rounded-2xl p-5 border border-[#B8D7C4] bg-[#EBF4EE] shadow-xs">
          <p className="text-xs font-black text-[#347A59] uppercase tracking-wide flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Completed AI Actions</span>
          </p>
          <h3 className="text-2xl font-black text-[#111827] mt-1">{approvedActions.length} Executed</h3>
          <p className="text-[11px] text-[#111827] font-medium mt-1">Directly updated in inventory, POs, or dispatch</p>
        </div>
        <div className="glass-card rounded-2xl p-5 border border-[#E5ECE7] bg-white shadow-xs">
          <p className="text-xs font-black text-[#347A59] uppercase tracking-wide flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#347A59]" />
            <span>Audit Trail Records</span>
          </p>
          <h3 className="text-2xl font-black text-[#111827] mt-1">{auditLogs.length} Logged</h3>
          <p className="text-[11px] text-[#111827] font-medium mt-1">Immutable change history across modules</p>
        </div>
      </div>

      {/* Pending Actions Queue */}
      <div className="glass-card rounded-2xl p-6 border border-[#E5ECE7] bg-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-[#E5ECE7]">
          <div>
            <h3 className="text-sm font-black text-[#111827] uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#347A59]" />
              <span>Awaiting Owner Authorization Queue</span>
            </h3>
            <p className="text-xs text-[#111827] font-medium mt-0.5">
              Each recommendation clearly highlights the root cause, financial exposure, and step-by-step AI solution ready for 1-click execution.
            </p>
          </div>
          <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-[#EBF4EE] text-[#111827] border border-[#E5ECE7]">
            {pendingActions.length} Pending Approval
          </span>
        </div>

        {pendingActions.length === 0 ? (
          <div className="text-center py-12 text-[#111827] text-xs">
            <CheckCircle2 className="w-8 h-8 mx-auto text-[#347A59] mb-2" />
            <span className="font-bold">All AI operational recommendations have been addressed! No pending actions in queue.</span>
          </div>
        ) : (
          <div className="space-y-6">
            {pendingActions.map((action) => (
              <div
                key={action.id}
                className="p-6 rounded-2xl bg-[#F4F8F5] border border-[#E5ECE7] hover:border-[#347A59] transition-all shadow-xs"
              >
                {/* Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-[#E5ECE7]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={action.severity} />
                    <span className="text-xs font-bold text-[#111827] px-2.5 py-0.5 rounded-lg bg-[#EBF4EE] border border-[#E5ECE7]">
                      {action.affected_module}
                    </span>
                    <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded bg-white text-[#111827] border border-[#E5ECE7]">
                      ⚡ Action: {action.action_type}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#111827] font-mono font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Detected: {new Date(action.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </span>
                </div>

                {/* Main Title */}
                <h4 className="text-base font-black text-[#111827] mb-4 tracking-tight flex items-center gap-2">
                  <span>{action.title}</span>
                </h4>

                {/* 3 Prominent Pillar Sections */}
                <div className="space-y-3.5 mb-5">
                  {/* Pillar 1: Root Cause & Diagnostic Findings */}
                  <div className="p-4 rounded-xl bg-white border border-[#E5ECE7] shadow-xs">
                    <div className="flex items-center gap-1.5 text-xs font-black text-[#111827] uppercase tracking-wide mb-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-[#347A59]" />
                      <span>1. Problem & Root Cause Diagnosis</span>
                    </div>
                    <p className="text-xs text-[#111827] font-medium leading-relaxed">
                      {action.problem}
                    </p>
                    {action.root_cause && (
                      <div className="mt-2.5 pt-2 border-t border-[#E5ECE7] text-xs text-[#111827] flex items-start gap-1.5">
                        <strong className="text-[#111827] font-black shrink-0">Root Cause:</strong>
                        <span className="font-medium text-[#111827]">{action.root_cause}</span>
                      </div>
                    )}
                  </div>

                  {/* Pillar 2: Business & Financial Impact */}
                  <div className="p-4 rounded-xl bg-[#FDF0F1] border border-[#F2C1C5]">
                    <div className="flex items-center gap-1.5 text-xs font-black text-[#8B2E37] uppercase tracking-wide mb-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#8B2E37]" />
                      <span>2. Business Impact & Financial Exposure</span>
                    </div>
                    <p className="text-xs text-[#111827] leading-relaxed font-bold">
                      {action.business_impact}
                    </p>
                  </div>

                  {/* Pillar 3: AI Recommended Solution & Concrete Action Plan */}
                  <div className="p-4 rounded-xl bg-[#EBF4EE] border border-[#B8D7C4] shadow-xs">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-black text-[#1B4332] uppercase tracking-wide">
                        <Sparkles className="w-4 h-4 text-[#347A59]" />
                        <span>3. AI Recommended Solution & Step-by-Step Implementation Plan</span>
                      </div>
                      <span className="text-[10px] font-bold text-[#1B4332] px-2 py-0.5 rounded bg-white border border-[#B8D7C4]">
                        1-Click Ready
                      </span>
                    </div>

                    {formatSolutionSteps(action.recommended_solution)}
                  </div>
                </div>

                {/* Proposed Execution Payload */}
                {action.action_payload && Object.keys(action.action_payload).length > 0 && (
                  <div className="mb-5 p-3.5 rounded-xl bg-white border border-[#E5ECE7] text-xs font-mono">
                    <div className="flex items-center justify-between text-[#111827] text-[10px] uppercase font-black mb-2">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-[#347A59]" />
                        <span>System Execution Parameters (Payload)</span>
                      </span>
                      <span className="text-[#111827] font-semibold">Auto-injected into DB</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {Object.entries(action.action_payload).map(([k, v]) => (
                        <div key={k} className="p-2 rounded bg-[#F4F8F5] border border-[#E5ECE7]">
                          <span className="text-[#111827] block text-[10px] uppercase font-bold">{k.replace('_', ' ')}:</span>
                          <span className="text-[#111827] font-black truncate block">
                            {Array.isArray(v) ? v.join(', ') : String(v)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Execution Footer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-[#E5ECE7]">
                  <div className="flex items-center gap-2 text-xs text-[#111827] font-semibold">
                    <ShieldCheck className="w-4 h-4 text-[#347A59]" />
                    <span>Owner approval required. Action logs directly to immutable audit trail.</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleReject(action)}
                      disabled={executingId === action.id}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-[#111827] hover:text-black bg-[#E5ECE7] hover:bg-[#D5E0D8] transition-colors"
                    >
                      Dismiss / Reject
                    </button>
                    <button
                      onClick={() => handleApprove(action)}
                      disabled={executingId === action.id}
                      className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-[#347A59] hover:bg-[#244B39] shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {executingId === action.id ? (
                        <>
                          <Activity className="w-4 h-4 animate-spin text-[#E5ECE7]" />
                          <span>Applying Changes to DB...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 text-[#E5ECE7] fill-current" />
                          <span>Use AI: Approve & Execute Solution</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit Log Trail */}
      <div className="glass-card rounded-2xl p-6 border border-[#E5ECE7] bg-white shadow-sm">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E5ECE7]">
          <ShieldCheck className="w-4 h-4 text-[#347A59]" />
          <h3 className="text-sm font-black text-[#111827] uppercase tracking-wider">
            Operational Audit Trail
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E5ECE7] bg-[#F4F8F5] text-[#111827] font-black">
                <th className="p-3">Timestamp</th>
                <th className="p-3">User & Role</th>
                <th className="p-3">Module</th>
                <th className="p-3">Action Type</th>
                <th className="p-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5ECE7]/60 font-medium">
              {auditLogs.slice(0, 10).map((log) => (
                <tr key={log.id} className="hover:bg-[#F4F8F5]">
                  <td className="p-3 text-[#111827] font-mono text-[11px] font-medium">
                    {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-3 text-[#111827] font-bold">
                    {log.user_name} <span className="text-[#111827] text-[10px] font-normal">({log.user_role})</span>
                  </td>
                  <td className="p-3 text-[#1B4332] font-black">{log.module}</td>
                  <td className="p-3">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#EBF4EE] text-[#111827] border border-[#E5ECE7]">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 text-[#111827] font-medium max-w-md truncate">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

