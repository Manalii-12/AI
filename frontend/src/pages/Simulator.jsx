import React, { useState, useEffect } from 'react';
import {
  Sliders,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Package,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Info
} from 'lucide-react';
import { runWhatIfSimulation } from '../api';

export default function Simulator() {
  const [demandPct, setDemandPct] = useState(30); // +30%
  const [supplierDelay, setSupplierDelay] = useState(5); // +5 days
  const [pricePct, setPricePct] = useState(0); // 0%
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const simulate = async (d, s, p) => {
    setLoading(true);
    try {
      const res = await runWhatIfSimulation({
        demand_increase_pct: parseFloat(d),
        supplier_delay_days: parseInt(s),
        price_change_pct: parseFloat(p)
      });
      setResults(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    simulate(demandPct, supplierDelay, pricePct);
  }, [demandPct, supplierDelay, pricePct]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-[#111827] tracking-tight flex items-center gap-2">
            <Sliders className="w-6 h-6 text-[#347A59]" />
            <span>What-If Scenario Simulator & Stress Tester</span>
          </h1>
          <p className="text-xs text-[#111827] mt-0.5">
            Model operational and financial shockwaves on demand spikes, supplier delays, and pricing elasticity grounded in actual business data.
          </p>
        </div>
      </div>

      {/* Interactive Controls Card */}
      <div className="bg-white rounded-2xl p-6 border border-[#E5ECE7] shadow-sm">
        <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider mb-4">
          Simulation Parameters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Slider 1: Demand Change */}
          <div className="p-4 rounded-xl bg-[#F4F8F5] border border-[#E5ECE7] space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-[#111827]">Demand Volume Shock</span>
              <span className="font-mono font-bold text-emerald-700">{demandPct > 0 ? `+${demandPct}%` : `${demandPct}%`}</span>
            </div>
            <input
              type="range"
              min="-30"
              max="80"
              step="5"
              value={demandPct}
              onChange={(e) => setDemandPct(e.target.value)}
              className="w-full accent-[#244B39] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#111827] font-mono">
              <span>-30% Downturn</span>
              <span>Baseline</span>
              <span>+80% Surge</span>
            </div>
          </div>

          {/* Slider 2: Supplier Delay */}
          <div className="p-4 rounded-xl bg-[#F4F8F5] border border-[#E5ECE7] space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-[#111827]">Supplier Transit Delay</span>
              <span className="font-mono font-bold text-amber-700">+{supplierDelay} Days</span>
            </div>
            <input
              type="range"
              min="0"
              max="15"
              step="1"
              value={supplierDelay}
              onChange={(e) => setSupplierDelay(e.target.value)}
              className="w-full accent-[#347A59] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#111827] font-mono">
              <span>On Time (0d)</span>
              <span>+7 Days</span>
              <span>+15 Days Crisis</span>
            </div>
          </div>

          {/* Slider 3: Price Adjustment */}
          <div className="p-4 rounded-xl bg-[#F4F8F5] border border-[#E5ECE7] space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-[#111827]">Beverage Price Adjustment</span>
              <span className="font-mono font-bold text-[#2C4E6F]">{pricePct > 0 ? `+${pricePct}%` : `${pricePct}%`}</span>
            </div>
            <input
              type="range"
              min="-15"
              max="25"
              step="1"
              value={pricePct}
              onChange={(e) => setPricePct(e.target.value)}
              className="w-full accent-[#244B39] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#111827] font-mono">
              <span>-15% Discount</span>
              <span>0% Flat</span>
              <span>+25% Premium</span>
            </div>
          </div>
        </div>
      </div>

      {/* Simulation Output Metrics */}
      {results && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-[#E5ECE7] shadow-sm">
              <span className="text-[10px] font-bold text-[#111827] uppercase">Projected 30-Day Revenue</span>
              <h3 className="text-2xl font-extrabold text-[#111827] mt-1">
                ${results.projected_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <p className={`text-xs font-semibold mt-1 ${results.revenue_delta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {results.revenue_delta >= 0 ? `+${results.revenue_delta.toFixed(2)}` : `-${Math.abs(results.revenue_delta).toFixed(2)}`} vs Baseline
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-[#E5ECE7] shadow-sm">
              <span className="text-[10px] font-bold text-[#111827] uppercase">Projected Gross Margin</span>
              <h3 className="text-2xl font-extrabold text-[#2C4E6F] mt-1">{results.projected_margin}%</h3>
              <p className="text-xs text-[#111827] mt-1">Elasticity-adjusted product margin</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-[#E5ECE7] shadow-sm">
              <span className="text-[10px] font-bold text-[#111827] uppercase">Stockout Risk SKUs</span>
              <h3 className="text-2xl font-extrabold text-rose-700 mt-1">
                {results.stockout_risk_products.length} SKUs
              </h3>
              <p className="text-xs text-[#111827] mt-1">Runway exceeds replenishment arrival</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-[#E5ECE7] shadow-sm">
              <span className="text-[10px] font-bold text-[#111827] uppercase">Required Buffer Capital</span>
              <h3 className="text-2xl font-extrabold text-amber-800 mt-1">
                ${results.cash_flow_impact.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-[#111827] mt-1">Capital needed to pre-fund buffer stock</p>
            </div>
          </div>

          {/* Stockout Risk Breakdown */}
          {results.stockout_risk_products.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-rose-300 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">
                  Vulnerable Products Under This Scenario
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E5ECE7] bg-[#EBF4EE]/50 text-[#111827] font-bold">
                      <th className="p-3">Product Name & SKU</th>
                      <th className="p-3">Available Stock</th>
                      <th className="p-3">Simulated Runway</th>
                      <th className="p-3">Effective Lead Time</th>
                      <th className="p-3">Estimated Shortage</th>
                      <th className="p-3 text-right">Recommended Buffer Order</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5ECE7]/60 font-medium">
                    {results.stockout_risk_products.map((p) => (
                      <tr key={p.sku} className="hover:bg-[#F4F8F5] transition-colors">
                        <td className="p-3 font-bold text-[#111827]">{p.name} ({p.sku})</td>
                        <td className="p-3 font-mono text-[#111827]">{p.available_stock}</td>
                        <td className="p-3 font-mono text-rose-700 font-bold">{p.simulated_runway_days} days</td>
                        <td className="p-3 font-mono text-[#111827]">{p.effective_lead_time_days} days</td>
                        <td className="p-3 font-mono text-amber-700 font-semibold">{p.estimated_units_shortage} units</td>
                        <td className="p-3 font-mono font-bold text-emerald-700 text-right">
                          +{p.recommended_buffer_order} units
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Strategic Recommendations & Assumptions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-5 border border-[#E5ECE7] shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-[#347A59]" />
                <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider">
                  AI Strategic Recommendations for Scenario
                </h4>
              </div>
              <ul className="space-y-2 text-xs">
                {results.strategic_recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-[#111827]">
                    <span className="text-[#347A59] font-bold">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#E5ECE7] shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-[#111827]" />
                <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider">
                  Model Assumptions Applied
                </h4>
              </div>
              <ul className="space-y-1.5 text-[11px] text-[#111827]">
                {results.assumptions_applied.map((asm, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#347A59]">→</span>
                    <span>{asm}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
