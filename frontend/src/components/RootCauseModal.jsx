import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  HelpCircle,
  TrendingDown,
  Layers,
  ArrowRight,
  CheckCircle2,
  XCircle,
  FileText
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import { approveAiAction, dismissAiInsight } from '../api';

export default function RootCauseModal({ insight, onClose, onActionSuccess }) {
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  if (!insight) return null;

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      const res = await approveAiAction({
        insight_id: insight.id,
        action_type: insight.action_type || 'SYSTEM_DEFAULT',
      });
      setFeedback({ type: 'success', message: res.data.message });
      if (onActionSuccess) onActionSuccess();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Failed to approve action.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = async () => {
    setSubmitting(true);
    try {
      await dismissAiInsight(insight.id);
      if (onActionSuccess) onActionSuccess();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#244B39]/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-[#E5ECE7] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-6 border-b border-[#E5ECE7] flex items-start justify-between bg-[#FFFFFF]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge status={insight.severity} />
              <span className="text-xs font-bold text-[#111827] uppercase tracking-wider">
                {insight.affected_module}
              </span>
            </div>
            <h2 className="text-lg font-black text-[#111827] tracking-tight">{insight.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#111827] hover:text-[#111827] hover:bg-[#F4F8F5] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Message */}
        {feedback && (
          <div
            className={`p-3 text-xs font-bold flex items-center gap-2 ${
              feedback.type === 'success' ? 'bg-[#EBF4EE] text-[#347A59] border-b border-[#B8DFCA]' : 'bg-[#FDF0F1] text-[#8B2E37] border-b border-[#F2C1C5]'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{feedback.message}</span>
          </div>
        )}

        {/* 5-Step Deep Root Cause Investigation Body */}
        <div className="p-6 space-y-4 max-h-[68vh] overflow-y-auto">
          {/* Step 1: What Happened */}
          <div className="p-4 rounded-xl bg-[#F4F8F5] border border-[#E5ECE7]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#111827] uppercase tracking-wide mb-1.5">
              <span className="w-5 h-5 rounded-full bg-[#347A59] flex items-center justify-center text-[10px] text-white">1</span>
              <span>What Happened? (The Observation)</span>
            </div>
            <p className="text-xs text-[#111827] leading-relaxed pl-7">{insight.problem}</p>
          </div>

          {/* Step 2: Why Did It Happen */}
          <div className="p-4 rounded-xl bg-[#FFF6E9] border border-[#F2D7B2]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#825425] uppercase tracking-wide mb-1.5">
              <span className="w-5 h-5 rounded-full bg-[#825425] text-white flex items-center justify-center text-[10px]">2</span>
              <span>Why Did It Happen? (Root Cause Diagnostic)</span>
            </div>
            <p className="text-xs text-[#5C3B1A] leading-relaxed pl-7">{insight.root_cause}</p>
          </div>

          {/* Step 3: Affected Records & Entities */}
          {insight.affected_records && (
            <div className="p-4 rounded-xl bg-[#EBF1F7] border border-[#B7CEE2]">
              <div className="flex items-center gap-2 text-xs font-bold text-[#2C4E6F] uppercase tracking-wide mb-2">
                <span className="w-5 h-5 rounded-full bg-[#2C4E6F] text-white flex items-center justify-center text-[10px]">3</span>
                <span>Affected Entities & Records</span>
              </div>
              <div className="pl-7">
                <div className="bg-white rounded-lg p-3 text-xs font-mono text-[#111827] border border-[#B7CEE2] space-y-1">
                  {Object.entries(insight.affected_records).map(([key, val]) => (
                    <div key={key} className="flex flex-wrap gap-1">
                      <span className="text-[#111827] font-bold">{key}:</span>
                      <span className="text-[#347A59] font-bold">
                        {Array.isArray(val) ? val.join(', ') : typeof val === 'object' ? JSON.stringify(val) : String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Business Impact */}
          <div className="p-4 rounded-xl bg-[#FDF0F1] border border-[#F2C1C5]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#8B2E37] uppercase tracking-wide mb-1.5">
              <span className="w-5 h-5 rounded-full bg-[#8B2E37] text-white flex items-center justify-center text-[10px]">4</span>
              <span>Business Impact & Exposure</span>
            </div>
            <p className="text-xs text-[#632026] leading-relaxed pl-7">{insight.business_impact}</p>
          </div>

          {/* Step 5: Recommended Solution */}
          <div className="p-4 rounded-xl bg-[#EBF4EE] border border-[#B8DFCA]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#347A59] uppercase tracking-wide mb-1.5">
              <span className="w-5 h-5 rounded-full bg-[#347A59] text-white flex items-center justify-center text-[10px]">5</span>
              <span>Recommended Action & Resolution</span>
            </div>
            <p className="text-xs text-[#111827] leading-relaxed pl-7">{insight.recommended_solution}</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-[#E5ECE7] bg-[#FFFFFF] flex items-center justify-between">
          <button
            onClick={handleDismiss}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-xs font-bold text-[#111827] hover:text-[#111827] hover:bg-[#F4F8F5] transition-colors"
          >
            Dismiss Alert
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[#111827] bg-[#FFFFFF] border border-[#E5ECE7] hover:bg-[#F4F8F5] transition-colors"
            >
              Close
            </button>
            {insight.status !== 'APPROVED' && (
              <button
                onClick={handleApprove}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#347A59] hover:bg-[#244B39] shadow-sm transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-[#DCEFE3]" />
                <span>{submitting ? 'Executing in DB...' : 'Approve & Execute Action'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

