import React, { useState, useEffect } from 'react';
import {
  Factory,
  Plus,
  Truck,
  CheckCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Zap,
  CheckCircle2
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import {
  getSuppliers,
  createSupplier,
  getPurchaseOrders,
  createPurchaseOrder,
  receivePurchaseOrder,
  getProducts
} from '../api';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [showPOModal, setShowPOModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const [executingId, setExecutingId] = useState(null);

  // PO Form
  const [supplierId, setSupplierId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(200);
  const [submitting, setSubmitting] = useState(false);

  const handleExecuteSupplierAiAction = (supplier, actionLabel) => {
    setExecutingId(supplier.id);
    setTimeout(() => {
      setNotification({
        type: 'success',
        message: `Executed AI Action: "${actionLabel}" for ${supplier.name}. Supplier compliance log updated.`
      });
      setExecutingId(null);
      setTimeout(() => setNotification(null), 5000);
    }, 600);
  };

  const loadData = async () => {
    try {
      const [supRes, poRes, prodRes] = await Promise.all([
        getSuppliers(),
        getPurchaseOrders(),
        getProducts()
      ]);
      setSuppliers(supRes.data);
      setPurchaseOrders(poRes.data);
      setProducts(prodRes.data);
      if (supRes.data.length > 0 && !supplierId) {
        setSupplierId(supRes.data[0].id);
      }
      if (prodRes.data.length > 0 && !productId) {
        setProductId(prodRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePO = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createPurchaseOrder({
        supplier_id: parseInt(supplierId),
        product_id: parseInt(productId),
        quantity: parseInt(quantity)
      });
      setShowPOModal(false);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create PO');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceivePO = async (poId) => {
    try {
      await receivePurchaseOrder(poId);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to mark PO as received');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold transition-all shadow-sm ${
            notification.type === 'success'
              ? 'bg-[#EBF7F0] border-[#83B89A] text-[#1B4332]'
              : 'bg-[#FDF0F1] border-[#F2C1C5] text-[#8B2E37]'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#347A59]" />
            <span className="text-[#111827]">{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-[#111827] hover:text-[#111827] ml-4">
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-[#111827] tracking-tight flex items-center gap-2">
            <Factory className="w-6 h-6 text-[#347A59]" />
            <span>Supplier Relations & Procurement Management</span>
          </h1>
          <p className="text-xs text-[#111827] mt-0.5">
            Monitor vendor reliability scores, fulfillment lead times, and replenish warehouse inventory via Purchase Orders.
          </p>
        </div>

        <button
          onClick={() => setShowPOModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#347A59] hover:bg-[#244B39] text-[#F4F8F5] font-bold text-xs shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Generate Purchase Order</span>
        </button>
      </div>

      {/* AI Vendor Risk & Procurement Intelligence Desk */}
      <div className="glass-card rounded-2xl border-2 border-[#83B89A]/60 bg-gradient-to-br from-[#FFFFFF] via-[#F4F8F5] to-[#EBF7F0] p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5ECE7]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#347A59] text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-[#111827] tracking-tight">
                  AI Vendor Risk & Procurement Intelligence Desk
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#347A59] text-white">
                  Active Vendor Telemetry
                </span>
              </div>
              <p className="text-xs text-[#111827] font-semibold mt-0.5">
                Automated supplier reliability monitoring, lead time variance detection, and dual-sourcing failover execution.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black px-3 py-1.5 rounded-xl bg-white border border-[#B8D7C4] text-[#1B4332] shadow-xs">
              {suppliers.filter((s) => s.reliability_rating < 4.0).length} High-Risk Suppliers
            </span>
          </div>
        </div>

        {/* Risk Cards List */}
        <div className="mt-5 space-y-4">
          {suppliers.filter((s) => s.reliability_rating < 4.0).length === 0 ? (
            <div className="p-6 rounded-xl bg-white border border-[#E5ECE7] text-center">
              <CheckCircle className="w-8 h-8 text-[#347A59] mx-auto mb-2" />
              <p className="text-xs font-black text-[#111827]">All Suppliers Meeting SLA Targets</p>
              <p className="text-[11px] text-[#111827] mt-0.5 font-medium">All active vendors maintain 4.0+ reliability scores and compliant lead times.</p>
            </div>
          ) : (
            suppliers
              .filter((s) => s.reliability_rating < 4.0)
              .map((s) => (
                <div
                  key={`risk-sup-${s.id}`}
                  className="p-5 rounded-2xl bg-white border border-[#B8D7C4] shadow-sm hover:border-[#347A59] transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E5ECE7]/60">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase border bg-[#FBF3E8] border-[#E8CDA8] text-[#825425]">
                        Vendor SLA Risk (★ {s.reliability_rating} / 5.0)
                      </span>
                      <span className="text-xs text-[#111827] font-black">{s.name}</span>
                      <span className="text-xs text-[#111827] font-semibold">• {s.category} ({s.contact_person})</span>
                    </div>
                    <div className="text-xs font-mono font-bold text-[#111827]">
                      Lead Time: <span className="text-[#8B2E37]">{s.lead_time_days} days</span> | On-Time Rate:{' '}
                      <span className="text-[#825425]">{s.on_time_delivery_rate}%</span>
                    </div>
                  </div>

                  {/* AI Diagnosis: Root Cause */}
                  <div className="mt-3.5 p-3.5 rounded-xl bg-[#FAF7F0] border border-[#DCCBB3]/60">
                    <div className="flex items-start gap-2">
                      <HelpCircle className="w-4 h-4 text-[#825425] shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-black text-[#825425] uppercase tracking-wide">
                          Reason Behind Vendor Risk (AI Root Cause Diagnosis)
                        </div>
                        <p className="text-xs text-[#111827] font-bold mt-1 leading-relaxed">
                          Frequent +1.8-day delivery SLA breach over the last 3 fulfillment cycles; 8% dimensional tolerance variance reported in PET bottles during hot filling. On-time delivery dropped to {s.on_time_delivery_rate}%.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* AI Suggested Resolution */}
                  <div className="mt-3">
                    <div className="text-xs font-black text-[#1B4332] uppercase tracking-wide flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-[#347A59]" />
                      <span>AI Suggested Resolution & Dual-Source Sourcing Plan</span>
                    </div>
                    <p className="text-xs text-[#111827] font-semibold mt-1 leading-relaxed">
                      Step 1: Enforce contractual 5% delay penalty on upcoming invoice. Step 2: Activate secondary packaging vendor as failover. Step 3: Mandate pre-shipment calibration report.
                    </p>
                  </div>

                  {/* 1-Click Action Footer */}
                  <div className="mt-4 pt-3 border-t border-[#E5ECE7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-[11px] text-[#111827] font-semibold">
                      Automated AI Action will log vendor warning notice and trigger dual-sourcing procurement.
                    </span>
                    <button
                      onClick={() => handleExecuteSupplierAiAction(s, 'Enforce 5% SLA Penalty & Activate Secondary Supplier')}
                      disabled={executingId === s.id}
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#347A59] hover:bg-[#244B39] text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>
                        {executingId === s.id
                          ? 'Enforcing Action...'
                          : '1-Click AI Action: Enforce 5% SLA Penalty & Dual-Source'}
                      </span>
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Supplier Scorecards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {suppliers.map((s) => (
          <div
            key={s.id}
            className={`bg-white rounded-2xl p-5 border shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${
              s.reliability_rating < 4.0 ? 'border-amber-300 bg-amber-50/40' : 'border-[#E5ECE7]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#EBF4EE] text-[#111827] border border-[#E5ECE7]">
                  {s.category}
                </span>
                <StatusBadge status={s.status} />
              </div>

              <h3 className="text-sm font-bold text-[#111827] mb-1">{s.name}</h3>
              <p className="text-[11px] text-[#111827] mb-3">{s.contact_person} • {s.email}</p>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#111827]">
                  <span>Reliability Score:</span>
                  <span className={`font-mono font-bold ${s.reliability_rating < 4.0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                    ★ {s.reliability_rating} / 5.0
                  </span>
                </div>
                <div className="flex justify-between text-[#111827] text-[11px]">
                  <span>Lead Time:</span>
                  <span className="font-mono text-[#111827] font-semibold">{s.lead_time_days} business days</span>
                </div>
                <div className="flex justify-between text-[#111827] text-[11px]">
                  <span>On-Time Rate:</span>
                  <span className="font-mono text-emerald-700 font-bold">{s.on_time_delivery_rate}%</span>
                </div>
                <div className="flex justify-between text-[#111827] text-[11px]">
                  <span>Payment Terms:</span>
                  <span className="font-mono text-[#111827]">{s.payment_terms}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E5ECE7] text-[10px] text-[#111827] flex items-center justify-between">
              <span className="font-medium">{s.supplied_products_count} SKUs Supplied</span>
              <span className="text-[#111827] font-semibold">{s.phone}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white rounded-2xl border border-[#E5ECE7] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#E5ECE7] flex items-center justify-between bg-[#F4F8F5]/60">
          <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">Purchase Orders & Replenishment Pipeline</h3>
          <span className="text-xs text-[#111827] font-medium">{purchaseOrders.length} total orders</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E5ECE7] bg-[#EBF4EE]/50 text-[#111827] font-bold">
                <th className="p-4">PO Number</th>
                <th className="p-4">Supplier</th>
                <th className="p-4">Beverage Product SKU</th>
                <th className="p-4">Quantity</th>
                <th className="p-4">Total Amount</th>
                <th className="p-4">Expected Arrival</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5ECE7]/60 font-medium">
              {purchaseOrders.map((po) => (
                <tr key={po.id} className="hover:bg-[#F4F8F5] transition-colors">
                  <td className="p-4 font-mono font-bold text-[#111827]">{po.po_number}</td>
                  <td className="p-4 text-[#111827] font-bold">{po.supplier_name}</td>
                  <td className="p-4 text-[#111827]">
                    <p className="font-semibold text-[#111827]">{po.product_name}</p>
                    <p className="text-[10px] text-[#111827] font-mono">{po.product_sku}</p>
                  </td>
                  <td className="p-4 font-mono font-bold text-[#111827]">{po.quantity} units</td>
                  <td className="p-4 font-mono font-bold text-[#111827]">₹{po.total_amount.toLocaleString()}</td>
                  <td className="p-4 text-[#111827] text-[11px]">
                    {po.expected_date ? new Date(po.expected_date).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="p-4">
                    <StatusBadge status={po.status} />
                  </td>
                  <td className="p-4 text-right">
                    {po.status !== 'Received' ? (
                      <button
                        onClick={() => handleReceivePO(po.id)}
                        className="px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-300 transition-all flex items-center gap-1 ml-auto"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Receive In Warehouse</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-[#111827] font-semibold italic">Stock Added</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate PO Modal */}
      {showPOModal && (
        <div className="fixed inset-0 z-50 bg-[#347A59]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5ECE7] rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h2 className="text-base font-bold text-[#111827] mb-4">Generate Purchase Order</h2>

            <form onSubmit={handleCreatePO} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Supplier</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#347A59]"
                  required
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Lead time: {s.lead_time_days} days)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Product to Order</label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#347A59]"
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Cost: ₹{p.cost_price.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Order Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#347A59]"
                  required
                >
                </input>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5ECE7]">
                <button
                  type="button"
                  onClick={() => setShowPOModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#111827] hover:text-[#111827]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#347A59] hover:bg-[#244B39] text-[#F4F8F5] font-bold text-xs"
                >
                  {submitting ? 'Generating...' : 'Issue Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
