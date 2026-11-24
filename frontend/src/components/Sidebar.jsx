import React from 'react';
import {
  LayoutDashboard,
  BrainCircuit,
  Zap,
  ShoppingCart,
  Users,
  CreditCard,
  Package,
  Truck,
  MessageSquareWarning,
  Coffee,
  Factory,
  Sliders,
  ShieldCheck,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export default function Sidebar({ activePage, setActivePage, activeRiskCount = 0, onOpenVoice }) {
  const menuItems = [
    { id: 'dashboard', label: 'Owner Dashboard', icon: LayoutDashboard },
    { id: 'ai-intel', label: 'AI Intelligence', icon: BrainCircuit, badge: activeRiskCount > 0 ? `${activeRiskCount} Alerts` : null, badgeColor: 'bg-rose-50 text-rose-700 border border-rose-200' },
    { id: 'action-center', label: 'AI Action Center', icon: Zap, badge: 'Actionable', badgeColor: 'bg-[#DCEFE3] text-[#244B39] border border-[#B8DFCA]' },
    { id: 'orders', label: 'Order Management', icon: ShoppingCart },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'payments', label: 'Payments & Revenue', icon: CreditCard },
    { id: 'inventory', label: 'Inventory & Stock', icon: Package },
    { id: 'dispatch', label: 'Dispatch & Delivery', icon: Truck },
    { id: 'complaints', label: 'Customer Complaints', icon: MessageSquareWarning },
    { id: 'products', label: 'Beverage Catalog', icon: Coffee },
    { id: 'suppliers', label: 'Suppliers & POs', icon: Factory },
    { id: 'simulator', label: 'What-If Simulator', icon: Sliders },
    { id: 'employees', label: 'Staff & Audit Trail', icon: ShieldCheck },
  ];

  return (
    <aside className="w-64 bg-[#FFFFFF] border-r border-[#E5ECE7] flex flex-col shrink-0 min-h-screen shadow-xs">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-[#E5ECE7] gap-3 bg-[#FFFFFF]">
        <div className="w-9 h-9 rounded-xl bg-[#347A59] text-white flex items-center justify-center shadow-sm">
          <Coffee className="w-5 h-5 text-white font-bold" />
        </div>
        <div>
          <h1 className="text-base font-extrabold tracking-tight text-[#111827] flex items-center gap-1.5">
            Hugg <span className="text-[#347A59] font-bold text-xs px-1.5 py-0.5 rounded bg-[#DCEFE3] border border-[#B8DFCA]">AI OPS</span>
          </h1>
          <p className="text-[10px] text-[#111827] font-semibold">Beverage Decision Intelligence</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* Dedicated Voice Assistant Mode Button */}
        {onOpenVoice && (
          <div className="mb-4">
            <button
              onClick={onOpenVoice}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#347A59] hover:bg-[#244B39] text-white font-black text-xs shadow-sm hover:scale-[1.01] transition-all"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#DCEFE3] animate-pulse" />
                <span className="text-white">AI Voice Assistant</span>
              </div>
              <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold">
                Voice Only
              </span>
            </button>
          </div>
        )}

        <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-wider text-[#111827]">
          Operations Core
        </p>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs transition-all group ${
                isActive
                  ? 'bg-[#EBF4EE] text-[#111827] font-black border border-[#B8DFCA] shadow-2xs'
                  : 'text-[#111827] font-semibold hover:text-black hover:bg-[#F4F8F5]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-[#347A59]' : 'text-[#347A59] group-hover:text-black'
                  }`}
                />
                <span className={isActive ? 'text-[#111827] font-black' : 'text-[#111827] font-semibold group-hover:text-black'}>{item.label}</span>
              </div>
              <div className="flex items-center gap-1">
                {item.badge && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-[#DCEFE3] text-[#111827] border border-[#B8DFCA]'}`}>
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#347A59]" />}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Proactive Engine Footer Badge */}
      <div className="p-3.5 border border-[#E5ECE7] m-3 bg-[#F4F8F5] rounded-xl shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-[#347A59] animate-pulse"></span>
          <span className="text-[11px] font-black text-[#111827]">AI Background Sentry</span>
        </div>
        <p className="text-[10px] text-[#111827] font-medium leading-relaxed">
          APScheduler evaluating 7 operational cross-module vectors.
        </p>
      </div>
    </aside>
  );
}
