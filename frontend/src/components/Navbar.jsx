import React, { useState } from 'react';
import {
  Bell,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Mic
} from 'lucide-react';
import { triggerProactiveScan } from '../api';

export default function Navbar({
  activeRole = 'Owner/Admin',
  setActiveRole,
  unreadAlertCount = 0,
  onOpenNotifications,
  onRefreshData,
  onToggleVoice,
  isVoiceOpen
}) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState(null);

  const handleScanNow = async () => {
    setIsScanning(true);
    setScanMessage(null);
    try {
      const res = await triggerProactiveScan();
      setScanMessage(res.data.message || 'AI Business Scan Completed!');
      if (onRefreshData) onRefreshData();
      setTimeout(() => setScanMessage(null), 4000);
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <header className="h-16 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-[#E5ECE7] px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Left Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F4F8F5] border border-[#E5ECE7] text-[#111827] text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5 text-[#347A59]" />
          <span>Proactive Decision Engine: Live</span>
        </div>

        {scanMessage && (
          <div className="flex items-center gap-1.5 text-xs text-[#111827] font-bold bg-[#DCEFE3] px-3 py-1 rounded-md border border-[#B8DFCA] animate-fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#347A59]" />
            <span>{scanMessage}</span>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Trigger Proactive Scan Button */}
        <button
          onClick={handleScanNow}
          disabled={isScanning}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#F4F8F5] hover:bg-[#DCEFE3] text-[#111827] text-xs font-bold border border-[#E5ECE7] transition-all disabled:opacity-50"
          title="Run instant proactive AI multi-module business audit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-[#347A59]' : 'text-[#347A59]'}`} />
          <span>{isScanning ? 'Scanning Modules...' : 'Trigger Proactive Scan'}</span>
        </button>

        {/* Role Badge: Owner/Admin Only */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F4F8F5] border border-[#E5ECE7] text-xs text-[#111827] font-semibold shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-[#347A59]" />
          <span>Role: <strong className="text-[#111827] font-black">Owner/Admin</strong></span>
        </div>

        {/* Voice Assistant Copilot Toggle */}
        <button
          onClick={onToggleVoice}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
            isVoiceOpen
              ? 'bg-[#244B39] border-[#244B39] text-white shadow-xs'
              : 'bg-[#347A59] hover:bg-[#244B39] border-[#347A59] text-white'
          }`}
          title="Toggle Voice Copilot Assistant"
        >
          <Mic className={`w-3.5 h-3.5 ${isVoiceOpen ? 'text-[#DCEFE3]' : 'text-white'} animate-pulse`} />
          <span className="hidden sm:inline">Voice Copilot</span>
        </button>

        {/* Notifications Bell */}
        <button
          onClick={onOpenNotifications}
          className="p-2 rounded-lg bg-[#F4F8F5] hover:bg-[#DCEFE3] text-[#111827] relative border border-[#E5ECE7] transition-colors"
          title="Open Notification Center"
        >
          <Bell className="w-4 h-4 text-[#111827]" />
          {unreadAlertCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
              {unreadAlertCount}
            </span>
          )}
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#E5ECE7]">
          <div className="w-8 h-8 rounded-full bg-[#347A59] flex items-center justify-center text-xs font-black text-white shadow-xs">
            AM
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-black text-[#111827] leading-tight">Aarav Mehta</p>
            <p className="text-[10px] text-[#111827] font-semibold">Founder & CEO</p>
          </div>
        </div>
      </div>
    </header>
  );
}
