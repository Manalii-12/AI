import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  Volume2,
  VolumeX,
  Copy,
  Check,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  CreditCard,
  Truck,
  MessageSquareWarning,
  Package
} from 'lucide-react';
import { triggerProactiveScan, getDailyBriefing } from '../api';

export default function DailyBriefingCard({ initialBriefing, onUpdateComplete, onNavigateTo }) {
  const [briefing, setBriefing] = useState(initialBriefing);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showFullDetails, setShowFullDetails] = useState(false);

  useEffect(() => {
    if (initialBriefing) {
      setBriefing(initialBriefing);
    }
  }, [initialBriefing]);

  // Clean up speech when unmounting
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleRunDailyUpdate = async () => {
    setIsUpdating(true);
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    try {
      await triggerProactiveScan();
      const res = await getDailyBriefing(true); // force_refresh=true
      setBriefing(res.data);
      if (onUpdateComplete) onUpdateComplete(res.data);
    } catch (err) {
      console.error('Failed to run daily AI update:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleSpeak = () => {
    if (!window.speechSynthesis) {
      alert('Text-to-speech is not supported by your browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel(); // Cancel any existing speech
      const textToRead = `${briefing?.summary_text || ''}. Key operational risks: ${(briefing?.risks || []).join('. ')}. Recommended priority: ${(briefing?.action_items || []).join('. ')}`;
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const handleCopy = () => {
    if (!briefing) return;
    const formatted = `📅 HUGG BEVERAGES - DAILY AI OPERATIONAL UPDATE (${briefing.briefing_date})\n\n${briefing.summary_text}\n\n⚠️ KEY OPERATIONAL RISKS:\n${(briefing.risks || []).map((r) => `• ${r}`).join('\n')}\n\n🎯 PRIORITY DIRECTIVES:\n${(briefing.action_items || []).map((a) => `• ${a}`).join('\n')}`;
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (!briefing) return null;

  const snapshot = briefing.metrics_snapshot || {};

  return (
    <div className="glass-card rounded-2xl p-6 border border-[#E5ECE7] bg-[#FFFFFF] relative overflow-hidden shadow-xs">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#DCEFE3]/30 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E5ECE7] gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#347A59] text-white flex items-center justify-center font-black shadow-xs">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#347A59] bg-[#DCEFE3] px-2 py-0.5 rounded border border-[#B8DFCA]">
                Autonomous Intelligence
              </span>
              <span className="text-xs text-[#111827] font-mono font-bold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#347A59]" />
                <span>{briefing.briefing_date}</span>
              </span>
            </div>
            <h2 className="text-base font-black text-[#111827] tracking-tight mt-0.5">
              Hello Aarav — Daily AI Executive Briefing & Decision Update
            </h2>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Audio Read Aloud Button */}
          <button
            onClick={handleToggleSpeak}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              isSpeaking
                ? 'bg-[#111827] text-white border-[#111827] shadow-xs font-black animate-pulse'
                : 'bg-[#F4F8F5] hover:bg-[#DCEFE3] text-[#111827] border-[#E5ECE7]'
            }`}
            title="Read update aloud using AI voice"
          >
            {isSpeaking ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-[#347A59]" />}
            <span>{isSpeaking ? 'Pause Audio' : 'Listen Aloud'}</span>
          </button>

          {/* Copy Report */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-xl bg-[#F4F8F5] hover:bg-[#DCEFE3] text-[#111827] border border-[#E5ECE7] transition-colors"
            title="Copy briefing text to clipboard"
          >
            {copied ? <Check className="w-4 h-4 text-[#347A59]" /> : <Copy className="w-4 h-4 text-[#111827]" />}
          </button>

          {/* Run Update Now Button */}
          <button
            onClick={handleRunDailyUpdate}
            disabled={isUpdating}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#347A59] hover:bg-[#244B39] text-white text-xs font-black shadow-xs transition-all disabled:opacity-50 border border-[#347A59]"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-white ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{isUpdating ? 'Re-analyzing Data...' : 'Run Daily AI Update'}</span>
          </button>
        </div>
      </div>

      {/* Main Executive Summary Speech Bubble */}
      <div className="mt-4 p-4 rounded-xl bg-[#F4F8F5] border border-[#E5ECE7] relative shadow-2xs">
        {isSpeaking && (
          <div className="flex items-center gap-1 mb-2 text-[#347A59] text-[10px] font-mono font-bold uppercase tracking-wider animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-[#347A59]"></span>
            <span>AI Voice Synthesizer Speaking...</span>
          </div>
        )}
        <p className="text-xs text-[#111827] leading-relaxed font-semibold">
          "{briefing.summary_text}"
        </p>
      </div>

      {/* Quick Database Snapshot Strip */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
        <div className="p-2.5 rounded-xl bg-[#FFFFFF] border border-[#E5ECE7] text-center shadow-2xs">
          <span className="text-[10px] text-[#111827] block uppercase font-black">Today's Orders</span>
          <span className="font-black text-[#111827] font-mono text-sm">{snapshot.today_orders || 0}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-[#FFFFFF] border border-[#E5ECE7] text-center shadow-2xs">
          <span className="text-[10px] text-[#111827] block uppercase font-black">Today's Revenue</span>
          <span className="font-black text-[#347A59] font-mono text-sm">${(snapshot.today_revenue || 0).toLocaleString()}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-[#FFFFFF] border border-[#E5ECE7] text-center shadow-2xs">
          <span className="text-[10px] text-[#111827] block uppercase font-black">Fulfillment Backlog</span>
          <span className="font-black text-[#111827] font-mono text-sm">{snapshot.pending_orders || 0} Orders</span>
        </div>
        <div className="p-2.5 rounded-xl bg-[#FFFFFF] border border-[#E5ECE7] text-center shadow-2xs">
          <span className="text-[10px] text-[#111827] block uppercase font-black">Low Stock SKUs</span>
          <span className={`font-black font-mono text-sm ${(snapshot.low_stock_count || 0) > 0 ? 'text-[#8B2E37]' : 'text-[#111827]'}`}>
            {snapshot.low_stock_count || 0} Products
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-[#FFFFFF] border border-[#E5ECE7] text-center shadow-2xs">
          <span className="text-[10px] text-[#111827] block uppercase font-black">Delayed Dispatches</span>
          <span className={`font-black font-mono text-sm ${(snapshot.delayed_dispatches || 0) > 0 ? 'text-[#8B2E37]' : 'text-[#111827]'}`}>
            {snapshot.delayed_dispatches || 0} Shipments
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-[#FFFFFF] border border-[#E5ECE7] text-center shadow-2xs">
          <span className="text-[10px] text-[#111827] block uppercase font-black">Open Complaints</span>
          <span className={`font-black font-mono text-sm ${(snapshot.open_complaints || 0) > 0 ? 'text-[#825425]' : 'text-[#111827]'}`}>
            {snapshot.open_complaints || 0} Tickets
          </span>
        </div>
      </div>

      {/* Two Column: Risks vs Recommended Action Checklist */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Identified Risks */}
        <div className="p-4 rounded-xl bg-[#F4F8F5] border border-[#E5ECE7] shadow-2xs">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-[#8B2E37]" />
            <h4 className="text-xs font-black text-[#111827] uppercase tracking-wide">
              Identified Operational Risks ({briefing.risks?.length || 0})
            </h4>
          </div>
          <ul className="space-y-1.5 text-xs">
            {briefing.risks && briefing.risks.length > 0 ? (
              briefing.risks.map((risk, idx) => (
                <li key={idx} className="flex items-start gap-2 text-[#111827] font-medium">
                  <span className="text-[#8B2E37] font-black">•</span>
                  <span>{risk}</span>
                </li>
              ))
            ) : (
              <li className="text-[#111827] italic font-medium">No critical risks identified.</li>
            )}
          </ul>
        </div>

        {/* Action Directives */}
        <div className="p-4 rounded-xl bg-[#F4F8F5] border border-[#E5ECE7] shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-[#347A59]" />
              <h4 className="text-xs font-black text-[#111827] uppercase tracking-wide">
                Priority Action Directives
              </h4>
            </div>
            <ul className="space-y-1.5 text-xs">
              {briefing.action_items && briefing.action_items.length > 0 ? (
                briefing.action_items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-[#111827] font-semibold">
                    <span className="text-[#347A59] font-black">✓</span>
                    <span>{item}</span>
                  </li>
                ))
              ) : (
                <li className="text-[#111827] italic font-medium">No immediate action required.</li>
              )}
            </ul>
          </div>

          {onNavigateTo && (
            <div className="mt-3 pt-2 border-t border-[#E5ECE7] flex items-center justify-end">
              <button
                onClick={() => onNavigateTo('action-center')}
                className="text-[11px] font-black text-[#347A59] hover:text-[#244B39] flex items-center gap-1 transition-colors"
              >
                <span>Authorize in AI Action Center</span>
                <ArrowRight className="w-3 h-3 text-[#347A59]" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Owner Executive Root-Cause Diagnostic & Solution Matrix */}
      <div className="mt-5 pt-4 border-t border-[#E5ECE7] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#347A59] animate-ping" />
            <h3 className="text-xs font-black uppercase tracking-wider text-[#111827] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#347A59]" />
              <span>Owner Operations Report — Root Causes & Step-by-Step AI Solutions</span>
            </h3>
          </div>
          <span className="text-[10px] text-[#111827] font-medium hidden sm:inline">Transparent reason diagnosis for every issue</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* 1. Pending & Overdue Balance */}
          <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E5ECE7] flex flex-col justify-between space-y-2 shadow-2xs">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-[#E5ECE7]">
                <div className="flex items-center gap-1.5 text-[#111827] font-black">
                  <CreditCard className="w-4 h-4 text-[#347A59]" />
                  <span>Pending & Overdue Balance (${(snapshot.outstanding_payments || 0).toLocaleString()})</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#DCEFE3] text-[#111827] border border-[#B8DFCA] font-bold font-mono">
                  FINANCE
                </span>
              </div>
              <div className="mt-2 space-y-2">
                <div className="text-[11px] text-[#111827] bg-[#FDF0F1] p-2.5 rounded-lg border border-[#F2C1C5] leading-relaxed font-medium">
                  <strong className="text-[#8B2E37] font-black block mb-1">🔍 Why Overdue Balance is Pending (Reason):</strong>
                  Wholesale credit terms were extended without advance payment verification or escrow hold. Customer accounts (e.g. Urban Roastery) delayed settlement past the 14-day net terms following receipt of goods.
                </div>
                <div className="text-[11px] text-[#111827] bg-[#EBF4EE] p-2.5 rounded-lg border border-[#B8D7C4] leading-relaxed font-semibold">
                  <strong className="text-[#1B4332] font-black block mb-1">💡 How We Can Solve It (AI Recommended Solution):</strong>
                  Dispatch automated 1-click settlement payment links via WhatsApp/SMS, and automatically enforce a dispatch-hold on wholesale accounts with overdue balances exceeding ₹40,000.
                </div>
              </div>
            </div>
            {onNavigateTo && (
              <button
                onClick={() => onNavigateTo('payments')}
                className="w-full mt-2 py-2 px-2.5 rounded-lg bg-[#F4F8F5] hover:bg-[#DCEFE3] border border-[#E5ECE7] text-[#111827] font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Review Payments & Collect Receivables</span>
                <ArrowRight className="w-3 h-3 text-[#347A59]" />
              </button>
            )}
          </div>

          {/* 2. Order Delays & Logistics */}
          <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E5ECE7] flex flex-col justify-between space-y-2 shadow-2xs">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-[#E5ECE7]">
                <div className="flex items-center gap-1.5 text-[#111827] font-black">
                  <Truck className="w-4 h-4 text-[#347A59]" />
                  <span>Order Delays & Dispatches ({snapshot.delayed_dispatches || 0} Delayed)</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#DCEFE3] text-[#111827] border border-[#B8DFCA] font-bold font-mono">
                  LOGISTICS
                </span>
              </div>
              <div className="mt-2 space-y-2">
                <div className="text-[11px] text-[#111827] bg-[#FDF0F1] p-2.5 rounded-lg border border-[#F2C1C5] leading-relaxed font-medium">
                  <strong className="text-[#8B2E37] font-black block mb-1">🔍 Why Orders Are Getting Delayed (Reason):</strong>
                  Delhivery regional transit hub bottleneck and courier vehicle breakdowns on the coastal corridor created a 48-hour delivery SLA breach on active shipments.
                </div>
                <div className="text-[11px] text-[#111827] bg-[#EBF4EE] p-2.5 rounded-lg border border-[#B8D7C4] leading-relaxed font-semibold">
                  <strong className="text-[#1B4332] font-black block mb-1">💡 Suggested Solution:</strong>
                  Auto-escalate carrier SLA penalty ticket to Delhivery logistics manager, re-route urgent shipments via Hugg Express air corridor, and push live GPS tracking link to customer.
                </div>
              </div>
            </div>
            {onNavigateTo && (
              <button
                onClick={() => onNavigateTo('dispatch')}
                className="w-full mt-2 py-2 px-2.5 rounded-lg bg-[#F4F8F5] hover:bg-[#DCEFE3] border border-[#E5ECE7] text-[#111827] font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all"
              >
                <span>View & Resolve Dispatch Delays</span>
                <ArrowRight className="w-3 h-3 text-[#347A59]" />
              </button>
            )}
          </div>

          {/* 3. Customer Complaints */}
          <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E5ECE7] flex flex-col justify-between space-y-2 shadow-2xs">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-[#E5ECE7]">
                <div className="flex items-center gap-1.5 text-[#111827] font-black">
                  <MessageSquareWarning className="w-4 h-4 text-[#347A59]" />
                  <span>Customer Complaints ({snapshot.open_complaints || 0} Open)</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#DCEFE3] text-[#111827] border border-[#B8DFCA] font-bold font-mono">
                  CUSTOMER CARE
                </span>
              </div>
              <div className="mt-2 space-y-2">
                <div className="text-[11px] text-[#111827] bg-[#FDF0F1] p-2.5 rounded-lg border border-[#F2C1C5] leading-relaxed font-medium">
                  <strong className="text-[#8B2E37] font-black block mb-1">🔍 Why Complaints Are There (Reason):</strong>
                  Customers reported delayed deliveries beyond promised arrival windows, and warehouse batch #EB-44 suffered from bottle cap micro-cracking causing carbonation leakage.
                </div>
                <div className="text-[11px] text-[#111827] bg-[#EBF4EE] p-2.5 rounded-lg border border-[#B8D7C4] leading-relaxed font-semibold">
                  <strong className="text-[#1B4332] font-black block mb-1">💡 How We Can Solve It:</strong>
                  Immediately quarantine warehouse batch #EB-44, alert EcoPack Glass quality control, and auto-dispatch free express replacement cartons with proactive apologies.
                </div>
              </div>
            </div>
            {onNavigateTo && (
              <button
                onClick={() => onNavigateTo('complaints')}
                className="w-full mt-2 py-2 px-2.5 rounded-lg bg-[#F4F8F5] hover:bg-[#DCEFE3] border border-[#E5ECE7] text-[#111827] font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Manage Customer Complaints Desk</span>
                <ArrowRight className="w-3 h-3 text-[#347A59]" />
              </button>
            )}
          </div>

          {/* 4. Inventory Deficit & Restock */}
          <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E5ECE7] flex flex-col justify-between space-y-2 shadow-2xs">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-[#E5ECE7]">
                <div className="flex items-center gap-1.5 text-[#111827] font-black">
                  <Package className="w-4 h-4 text-[#347A59]" />
                  <span>Inventory Restock Deficit ({snapshot.low_stock_count || 0} Low SKUs)</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#DCEFE3] text-[#111827] border border-[#B8DFCA] font-bold font-mono">
                  SUPPLY CHAIN
                </span>
              </div>
              <div className="mt-2 space-y-2">
                <div className="text-[11px] text-[#111827] bg-[#FDF0F1] p-2.5 rounded-lg border border-[#F2C1C5] leading-relaxed font-medium">
                  <strong className="text-[#8B2E37] font-black block mb-1">🔍 Reason Behind Low Stock:</strong>
                  Wholesale sales velocity surged 140% this week, outpacing raw ingredient arrival from Equator Coffee for Hugg Cold Brew Classic.
                </div>
                <div className="text-[11px] text-[#111827] bg-[#EBF4EE] p-2.5 rounded-lg border border-[#B8D7C4] leading-relaxed font-semibold">
                  <strong className="text-[#1B4332] font-black block mb-1">💡 AI Recommended Solution:</strong>
                  Approve emergency Purchase Order PO-5003 for 250 units to immediately release blocked orders in warehouse processing.
                </div>
              </div>
            </div>
            {onNavigateTo && (
              <button
                onClick={() => onNavigateTo('inventory')}
                className="w-full mt-2 py-2 px-2.5 rounded-lg bg-[#F4F8F5] hover:bg-[#DCEFE3] border border-[#E5ECE7] text-[#111827] font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Restock Inventory & Release Orders</span>
                <ArrowRight className="w-3 h-3 text-[#347A59]" />
              </button>
            )}
          </div>
        </div>

        {/* Big Step-by-Step Action Center Redirect Button */}
        {onNavigateTo && (
          <button
            onClick={() => onNavigateTo('action-center')}
            className="w-full mt-3 py-3 px-4 rounded-xl bg-[#347A59] hover:bg-[#244B39] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs transition-all transform active:scale-98 border border-[#347A59]"
          >
            <Sparkles className="w-4 h-4 text-[#DCEFE3]" />
            <span className="text-white">Open Step-by-Step AI Action Center Dashboard (Execute AI Solutions for All Bottlenecks)</span>
            <ArrowRight className="w-4 h-4 text-[#DCEFE3]" />
          </button>
        )}
      </div>
    </div>
  );
}
