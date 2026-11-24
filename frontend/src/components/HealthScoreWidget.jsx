import React from 'react';
import {
  Activity,
  CheckCircle,
  AlertOctagon,
  ChevronRight,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

export default function HealthScoreWidget({ healthData }) {
  if (!healthData) return null;

  const { overall_score, status, category_scores, max_category_scores, deduction_reasons, positive_factors } = healthData;

  const getScoreBadge = (score) => {
    if (score >= 80) return 'text-[#347A59] border-[#B8DFCA] bg-[#EBF4EE]';
    if (score >= 60) return 'text-[#111827] border-[#E5ECE7] bg-[#F4F8F5]';
    if (score >= 45) return 'text-[#825425] border-[#E8CDA8] bg-[#FBF3E8]';
    return 'text-[#8B2E37] border-[#F2C1C5] bg-[#FDF0F1]';
  };

  const categories = [
    { key: 'order_fulfillment', label: 'Order Fulfillment', score: category_scores?.order_fulfillment || 0, max: 25 },
    { key: 'payment_collection', label: 'Payment Collection', score: category_scores?.payment_collection || 0, max: 20 },
    { key: 'inventory_availability', label: 'Inventory Availability', score: category_scores?.inventory_availability || 0, max: 20 },
    { key: 'ontime_dispatch', label: 'On-Time Dispatch', score: category_scores?.ontime_dispatch || 0, max: 20 },
    { key: 'complaint_resolution', label: 'Complaint Resolution', score: category_scores?.complaint_resolution || 0, max: 15 },
  ];

  return (
    <div className="glass-card rounded-2xl p-6 border border-[#E5ECE7] bg-white shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-[#E5ECE7]">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-[#EBF4EE] border border-[#B8DFCA] text-[#347A59]">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#111827] uppercase tracking-wider">
              AI Business Health Score
            </h3>
            <p className="text-xs text-[#111827]">Continuous weighted evaluation across 5 operational dimensions</p>
          </div>
        </div>

        {/* Big Health Score Badge */}
        <div className={`flex items-baseline gap-1 px-4 py-2 rounded-xl border ${getScoreBadge(overall_score)}`}>
          <span className="text-3xl font-black tracking-tight">{overall_score}</span>
          <span className="text-xs font-bold text-[#111827]">/100</span>
          <span className="ml-2 text-xs font-extrabold uppercase tracking-wide">({status})</span>
        </div>
      </div>

      {/* Category Progress Bars */}
      <div className="mt-5 space-y-3.5">
        {categories.map((cat) => {
          const pct = Math.min(100, (cat.score / cat.max) * 100);
          return (
            <div key={cat.key} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#111827] font-bold">{cat.label}</span>
                <span className="text-[#111827] font-mono text-[11px]">
                  <strong className="text-[#347A59] font-bold">{cat.score}</strong> / {cat.max} pts ({Math.round(pct)}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#F4F8F5] overflow-hidden border border-[#E5ECE7]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    pct >= 80 ? 'bg-[#347A59]' : pct >= 50 ? 'bg-[#83B89A]' : 'bg-[#8B2E37]'
                  }`}
                  style={{ width: `${pct}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Deductions & Positive Factors */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#E5ECE7]">
        {/* Factors Affecting Score */}
        <div className="p-3.5 rounded-xl bg-[#FDF0F1] border border-[#F2C1C5]">
          <h4 className="text-xs font-bold text-[#8B2E37] flex items-center gap-1.5 mb-2">
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Score Deductions ({deduction_reasons?.length || 0})</span>
          </h4>
          <ul className="space-y-1.5 text-[11px] text-[#632026]">
            {deduction_reasons && deduction_reasons.length > 0 ? (
              deduction_reasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-[#8B2E37] font-bold">•</span>
                  <span>{reason}</span>
                </li>
              ))
            ) : (
              <li className="text-[#111827] italic">No score deductions detected.</li>
            )}
          </ul>
        </div>

        {/* Positive Factors */}
        <div className="p-3.5 rounded-xl bg-[#EBF4EE] border border-[#B8DFCA]">
          <h4 className="text-xs font-bold text-[#347A59] flex items-center gap-1.5 mb-2">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Operational Strengths ({positive_factors?.length || 0})</span>
          </h4>
          <ul className="space-y-1.5 text-[11px] text-[#1E3E2E]">
            {positive_factors && positive_factors.length > 0 ? (
              positive_factors.map((factor, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-[#347A59] font-bold">✓</span>
                  <span>{factor}</span>
                </li>
              ))
            ) : (
              <li className="text-[#111827] italic">Evaluating baseline strengths...</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

