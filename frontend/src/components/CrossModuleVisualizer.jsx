import React, { useState } from 'react';
import {
  Package,
  ShoppingCart,
  Truck,
  MessageSquareWarning,
  DollarSign,
  ArrowRight,
  ShieldAlert,
  Info
} from 'lucide-react';

export default function CrossModuleVisualizer() {
  const [selectedChain, setSelectedChain] = useState(0);

  const chains = [
    {
      id: 'chain-1',
      title: 'Supply Chain Cascade: Inventory Stockout to SLA Breach & Complaints',
      revenueImpact: '₹3,45,000 Exposure',
      severity: 'CRITICAL',
      nodes: [
        {
          stage: '1. Inventory Bottleneck',
          icon: Package,
          color: 'border-[#F2C1C5] bg-[#FDF0F1] text-[#8B2E37]',
          metric: 'Hugg Cold Brew Classic stock = 0',
          detail: 'Available stock depleted due to high sales velocity and EcoPack supplier delay of 7 days.'
        },
        {
          stage: '2. Blocked Orders',
          icon: ShoppingCart,
          color: 'border-[#E8CDA8] bg-[#FBF3E8] text-[#825425]',
          metric: '2 Orders Choked (HUG-1006, 1007)',
          detail: 'Warehouse cannot pick and pack orders waiting for 250ml cold brew bottles.'
        },
        {
          stage: '3. Dispatch SLA Breach',
          icon: Truck,
          color: 'border-[#E5ECE7] bg-[#F4F8F5] text-[#111827]',
          metric: '3 Shipments Delayed',
          detail: 'Consignments with Delhivery held past estimated delivery SLA of 48 hours.'
        },
        {
          stage: '4. Customer Complaints',
          icon: MessageSquareWarning,
          color: 'border-[#D3BEDF] bg-[#F4EEF7] text-[#56386C]',
          metric: '3 Grievances Logged',
          detail: 'Green Sprout & TechHub filed complaints regarding delayed weekend restocks.'
        },
        {
          stage: '5. Business Outcome',
          icon: DollarSign,
          color: 'border-[#B8DFCA] bg-[#EBF4EE] text-[#347A59]',
          metric: '35% Churn Risk on VIPs',
          detail: 'Critical accounts at risk of defection unless expedited PO and credits are dispatched.'
        }
      ]
    },
    {
      id: 'chain-2',
      title: 'Financial Working Capital Cascade: Failed Payment to Revenue At Risk',
      revenueImpact: '₹1,02,400 Uncollected',
      severity: 'CRITICAL',
      nodes: [
        {
          stage: '1. Billing Gateway Failure',
          icon: DollarSign,
          color: 'border-[#F2C1C5] bg-[#FDF0F1] text-[#8B2E37]',
          metric: 'Card Charge Declined',
          detail: 'Transaction CRD-UR-FAIL-01 failed due to insufficient customer credit line.'
        },
        {
          stage: '2. Unpaid Dispatched Order',
          icon: ShoppingCart,
          color: 'border-[#E8CDA8] bg-[#FBF3E8] text-[#825425]',
          metric: 'Order HUG-1005 in Transit',
          detail: 'Wholesale order was dispatched on good faith prior to payment clearance.'
        },
        {
          stage: '3. Carrier Handoff',
          icon: Truck,
          color: 'border-[#B7CEE2] bg-[#EBF1F7] text-[#2C4E6F]',
          metric: 'Out for Delivery (Shiprocket)',
          detail: 'Goods are in courier possession and approaching customer doorstep.'
        },
        {
          stage: '4. Bad Debt Risk',
          icon: ShieldAlert,
          color: 'border-[#D3BEDF] bg-[#F4EEF7] text-[#56386C]',
          metric: '₹1,02,400 Receivable Exposure',
          detail: 'If customer receives merchandise without paying, collection difficulty spikes 60%.'
        }
      ]
    }
  ];

  const current = chains[selectedChain];

  return (
    <div className="glass-card rounded-2xl p-6 border border-[#E5ECE7] bg-white shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E5ECE7] gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#347A59]"></span>
            <h3 className="text-sm font-black text-[#111827] uppercase tracking-wider">
              Cross-Module Intelligence: Causality Chains
            </h3>
          </div>
          <p className="text-xs text-[#111827] mt-0.5">
            Demonstrating how upstream issues in one department cascade into fulfillment, complaints, and financial exposure.
          </p>
        </div>

        {/* Chain selector pills */}
        <div className="flex items-center gap-1.5 bg-[#F4F8F5] p-1 rounded-xl border border-[#E5ECE7]">
          {chains.map((chain, idx) => (
            <button
              key={chain.id}
              onClick={() => setSelectedChain(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedChain === idx
                  ? 'bg-[#347A59] text-white shadow-sm'
                  : 'text-[#111827] hover:text-[#111827]'
              }`}
            >
              Scenario #{idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Chain Banner */}
      <div className="mt-4 p-3.5 rounded-xl bg-[#F4F8F5] border border-[#E5ECE7] flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-[#111827]">{current.title}</h4>
          <span className="text-[11px] text-[#111827]">Total Quantified Exposure: <strong className="text-rose-700 font-bold">{current.revenueImpact}</strong></span>
        </div>
        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#FDF0F1] text-[#8B2E37] border border-[#F2C1C5]">
          {current.severity} CASCADE
        </span>
      </div>

      {/* Visual Chain Flow */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 relative">
        {current.nodes.map((node, i) => {
          const NodeIcon = node.icon;
          return (
            <div key={i} className="relative group">
              <div className={`p-4 rounded-xl border ${node.color} h-full flex flex-col justify-between transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-md`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <NodeIcon className="w-5 h-5 opacity-90" />
                    <span className="text-[10px] font-extrabold opacity-70">Step {i + 1}</span>
                  </div>
                  <h5 className="text-xs font-black mb-1">{node.stage}</h5>
                  <p className="text-[11px] font-bold mb-2 opacity-95">{node.metric}</p>
                </div>
                <p className="text-[10px] font-medium leading-relaxed opacity-90">
                  {node.detail}
                </p>
              </div>

              {/* Arrow connector */}
              {i < current.nodes.length - 1 && (
                <div className="hidden lg:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-4 h-4 rounded-full bg-white border border-[#E5ECE7] items-center justify-center text-[#111827] shadow-xs">
                  <ArrowRight className="w-2.5 h-2.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

