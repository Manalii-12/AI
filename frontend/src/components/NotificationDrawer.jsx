import React, { useState } from 'react';
import {
  X,
  Bell,
  AlertTriangle,
  Info,
  CheckCircle,
  Zap,
  ArrowRight
} from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function NotificationDrawer({ isOpen, onClose, insights = [], onSelectInsight }) {
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, CRITICAL, WARNING, RECOMMENDATIONS

  if (!isOpen) return null;

  const filteredInsights = insights.filter((item) => {
    if (activeTab === 'CRITICAL') return item.severity === 'CRITICAL';
    if (activeTab === 'WARNING') return item.severity === 'WARNING';
    if (activeTab === 'RECOMMENDATIONS') return item.action_type !== null;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#244B39]/40 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-white border-l border-[#E5ECE7] h-full shadow-2xl flex flex-col animate-slide-left">
        {/* Header */}
        <div className="p-5 border-b border-[#E5ECE7] flex items-center justify-between bg-[#FFFFFF]">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#347A59]" />
            <h3 className="text-sm font-black text-[#111827] uppercase tracking-wider">
              Notification Center
            </h3>
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-[#EBF4EE] text-[#347A59] border border-[#B8DFCA]">
              {insights.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#111827] hover:text-[#111827] hover:bg-[#F4F8F5] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="px-5 pt-3 pb-2.5 flex items-center gap-1.5 border-b border-[#E5ECE7] bg-[#F4F8F5] overflow-x-auto">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'CRITICAL', label: 'Critical' },
            { id: 'WARNING', label: 'Warnings' },
            { id: 'RECOMMENDATIONS', label: 'Actionable' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-[#347A59] text-white shadow-xs'
                  : 'text-[#111827] hover:text-[#111827]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F4F8F5]">
          {filteredInsights.length === 0 ? (
            <div className="text-center py-12 text-[#111827] text-xs font-medium">
              No notifications found for this category.
            </div>
          ) : (
            filteredInsights.map((ins) => (
              <div
                key={ins.id}
                onClick={() => {
                  if (onSelectInsight) onSelectInsight(ins);
                }}
                className="p-4 rounded-xl bg-white hover:bg-[#EBF4EE] border border-[#E5ECE7] shadow-xs transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-2">
                  <StatusBadge status={ins.severity} />
                  <span className="text-[10px] text-[#111827] font-mono">
                    {new Date(ins.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h4 className="text-xs font-black text-[#111827] group-hover:text-[#347A59] transition-colors line-clamp-1">
                  {ins.title}
                </h4>
                <p className="text-[11px] text-[#111827] mt-1 line-clamp-2 leading-relaxed">
                  {ins.problem}
                </p>

                <div className="mt-3 pt-2.5 border-t border-[#E5ECE7] flex items-center justify-between text-[11px]">
                  <span className="text-[#111827] font-semibold text-[10px]">
                    Module: <strong className="text-[#111827]">{ins.affected_module}</strong>
                  </span>
                  <span className="text-[#347A59] font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Inspect</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

