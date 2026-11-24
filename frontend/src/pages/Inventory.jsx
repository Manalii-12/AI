import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  ArrowUpDown,
  History,
  TrendingDown,
  Layers,
  CheckCircle,
  Truck,
  Sparkles,
  HelpCircle,
  Zap,
  CheckCircle2
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { getProducts, adjustStock, getStockMovements, getDemandForecasting, createPurchaseOrder } from '../api';

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [forecasts, setForecasts] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('catalog'); // catalog, movements, forecasting
  const [notification, setNotification] = useState(null);
  const [executingSku, setExecutingSku] = useState(null);

  // Adjust Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [movementType, setMovementType] = useState('IN');
  const [adjQuantity, setAdjQuantity] = useState(50);
  const [adjNotes, setAdjNotes] = useState('Stock delivery check');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [prodRes, moveRes, foreRes] = await Promise.all([
        getProducts({ search: search || undefined }),
        getStockMovements(),
        getDemandForecasting()
      ]);
      setProducts(prodRes.data);
      setMovements(moveRes.data);
      setForecasts(foreRes.data);
      if (prodRes.data.length > 0 && !selectedProduct) {
        setSelectedProduct(prodRes.data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setSubmitting(true);
    try {
      await adjustStock({
        product_id: selectedProduct.id,
        movement_type: movementType,
        quantity: parseInt(adjQuantity),
        notes: adjNotes,
        user_name: 'Dev Patel (Inventory Mgr)'
      });
      setShowAdjustModal(false);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Stock adjustment failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateEmergencyPO = async (product) => {
    setExecutingSku(product.sku);
    try {
      await createPurchaseOrder({
        supplier_id: product.supplier_id || 1,
        product_id: product.id,
        quantity: product.reorder_quantity || 200
      });
      setNotification({
        type: 'success',
        message: `Successfully issued Emergency PO for ${product.reorder_quantity || 200} units of ${product.name} to ${product.supplier_name || 'Vendor'}!`
      });
      await loadData();
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to issue emergency purchase order'
      });
    } finally {
      setExecutingSku(null);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (statusFilter && p.stock_status !== statusFilter) return false;
    return true;
  });

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
          <h1 className="text-xl font-black text-[#111827] tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-[#111827]" />
            <span>Inventory Management & Stock Ledger</span>
          </h1>
          <p className="text-xs text-[#111827] mt-0.5">
            Real-time available vs reserved stock tracking, stockout runway projections, and immutable movement history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdjustModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#347A59] hover:bg-[#244B39] text-white font-bold text-xs shadow-sm transition-all"
          >
            <ArrowUpDown className="w-4 h-4 text-[#E5ECE7]" />
            <span>Adjust / Receive Stock</span>
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5ECE7] pb-2">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'catalog'
              ? 'bg-[#347A59] text-white shadow-xs'
              : 'text-[#111827] hover:text-[#111827]'
          }`}
        >
          Stock Catalog ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('forecasting')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'forecasting'
              ? 'bg-[#347A59] text-white shadow-xs'
              : 'text-[#111827] hover:text-[#111827]'
          }`}
        >
          Demand Runway Projections
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'movements'
              ? 'bg-[#347A59] text-white shadow-xs'
              : 'text-[#111827] hover:text-[#111827]'
          }`}
        >
          Stock Movement Ledger
        </button>
      </div>

      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* AI Inventory Anomaly & Stock Health Advisory Desk */}
          <div className="glass-card rounded-2xl border-2 border-[#83B89A]/60 bg-gradient-to-br from-[#FFFFFF] via-[#F4F8F5] to-[#EBF7F0] p-6 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5ECE7]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#347A59] text-white flex items-center justify-center shadow-sm">
                  <Sparkles className="w-5 h-5 text-white animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-[#111827] tracking-tight">
                      AI Inventory Anomaly & Stock Health Advisory Desk
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#347A59] text-white">
                      Live Telemetry
                    </span>
                  </div>
                  <p className="text-xs text-[#111827] font-semibold mt-0.5">
                    Continuous monitoring of stockouts, depleted safety buffers, and overstock holding risks.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black px-3 py-1.5 rounded-xl bg-white border border-[#B8D7C4] text-[#1B4332] shadow-xs">
                  {products.filter((p) => p.is_anomaly).length} Stock Health Alerts
                </span>
              </div>
            </div>

            {/* Anomaly Cards List */}
            <div className="mt-5 space-y-4">
              {products.filter((p) => p.is_anomaly).map((p) => {
                let badgeColor = 'bg-[#FDF0F1] border-[#F2C1C5] text-[#8B2E37]';
                let actionLabel = `Issue Emergency PO (${p.reorder_quantity || 200} units)`;
                let actionType = 'PO';

                if (p.stock_status === 'Low Stock') {
                  badgeColor = 'bg-[#FBF3E8] border-[#E8CDA8] text-[#825425]';
                  actionLabel = `Issue Replenishment PO (${p.reorder_quantity || 200} units)`;
                } else if (p.stock_status === 'Excess') {
                  badgeColor = 'bg-[#F4EEF7] border-[#D3BEDF] text-[#56386C]';
                  actionLabel = 'Authorize 15% Clearance Promotion Bundle';
                  actionType = 'PROMO';
                }

                return (
                  <div
                    key={`inv-anomaly-${p.id}`}
                    className="p-5 rounded-2xl bg-white border border-[#B8D7C4] shadow-sm hover:border-[#347A59] transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E5ECE7]/60">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase border ${badgeColor}`}>
                          {p.stock_status}
                        </span>
                        <span className="font-mono text-xs font-black text-[#111827]">{p.sku}</span>
                        <span className="text-xs text-[#111827] font-bold">• {p.name}</span>
                        <span className="text-xs text-[#111827] font-semibold">({p.supplier_name})</span>
                      </div>
                      <div className="text-xs font-mono font-bold text-[#111827]">
                        Available: <span className="text-[#8B2E37]">{p.available_stock}</span> / Reorder Level:{' '}
                        <span className="text-[#1B4332]">{p.reorder_level}</span>
                      </div>
                    </div>

                    {/* AI Diagnosis: Root Cause */}
                    <div className="mt-3.5 p-3.5 rounded-xl bg-[#FAF7F0] border border-[#DCCBB3]/60">
                      <div className="flex items-start gap-2">
                        <HelpCircle className="w-4 h-4 text-[#825425] shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-black text-[#825425] uppercase tracking-wide">
                            Reason Behind Stock Status (AI Root Cause Diagnosis)
                          </div>
                          <p className="text-xs text-[#111827] font-bold mt-1 leading-relaxed">
                            {p.root_cause || 'Inventory condition evaluated by demand model.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* AI Suggested Resolution */}
                    <div className="mt-3">
                      <div className="text-xs font-black text-[#1B4332] uppercase tracking-wide flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-[#347A59]" />
                        <span>AI Suggested Resolution & Stock Recovery Plan</span>
                      </div>
                      <p className="text-xs text-[#111827] font-semibold mt-1 leading-relaxed">
                        {p.ai_suggested_resolution}
                      </p>
                    </div>

                    {/* 1-Click Action Footer */}
                    <div className="mt-4 pt-3 border-t border-[#E5ECE7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="text-[11px] text-[#111827] font-semibold">
                        Automated AI Action will generate PO with {p.supplier_name} or update pricing rules.
                      </span>
                      <button
                        onClick={() => {
                          if (actionType === 'PO') {
                            handleGenerateEmergencyPO(p);
                          } else {
                            setNotification({
                              type: 'success',
                              message: `Authorized 15% wholesale promotional bundle for ${p.name}. Marketing notification queued.`
                            });
                            setTimeout(() => setNotification(null), 5000);
                          }
                        }}
                        disabled={executingSku === p.sku}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#347A59] hover:bg-[#244B39] text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>{executingSku === p.sku ? 'Issuing PO...' : `1-Click AI Action: ${actionLabel}`}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filters */}
          <div className="glass-card rounded-2xl p-4 border border-[#E5ECE7] bg-white shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#111827] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search SKU or product name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#111827] placeholder-[#647568] focus:outline-none focus:border-[#347A59]"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {['', 'In Stock', 'Low Stock', 'Out of Stock', 'Excess'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    statusFilter === st ? 'bg-[#347A59] text-white shadow-xs' : 'text-[#111827] hover:text-[#111827]'
                  }`}
                >
                  {st || 'All Products'}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="glass-card rounded-2xl border border-[#E5ECE7] bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E5ECE7] bg-[#F4F8F5] text-[#111827] font-bold">
                    <th className="p-4">Product Name & SKU</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Physical Stock</th>
                    <th className="p-4">Reserved</th>
                    <th className="p-4">Available</th>
                    <th className="p-4">Reorder Level</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">AI Diagnosis & Action</th>
                    <th className="p-4">Supplier</th>
                    <th className="p-4 text-right">Unit Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5ECE7]/60 font-medium">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F4F8F5] transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-[#111827]">{p.name}</p>
                        <p className="text-[10px] text-[#111827] font-mono">{p.sku} • {p.unit}</p>
                      </td>
                      <td className="p-4 text-[#111827]">{p.category}</td>
                      <td className="p-4 font-mono font-bold text-[#111827]">{p.stock_quantity}</td>
                      <td className="p-4 font-mono font-bold text-[#825425]">{p.reserved_stock}</td>
                      <td className="p-4 font-mono font-bold text-[#2D5A43]">{p.available_stock}</td>
                      <td className="p-4 font-mono text-[#111827]">{p.reorder_level}</td>
                      <td className="p-4">
                        <StatusBadge status={p.stock_status} />
                      </td>
                      <td className="p-4 max-w-xs">
                        {p.is_anomaly ? (
                          <div className="space-y-1">
                            <p className="text-[11px] text-[#8B2E37] font-bold line-clamp-1" title={p.root_cause}>
                              {p.root_cause}
                            </p>
                            <button
                              onClick={() => {
                                if (p.stock_status === 'Excess') {
                                  setNotification({
                                    type: 'success',
                                    message: `Authorized 15% promotional bundle for ${p.name}. Marketing notification queued.`
                                  });
                                  setTimeout(() => setNotification(null), 5000);
                                } else {
                                  handleGenerateEmergencyPO(p);
                                }
                              }}
                              disabled={executingSku === p.sku}
                              className="px-2 py-1 rounded-md bg-[#347A59] text-white text-[10px] font-bold hover:bg-[#244B39] transition-all flex items-center gap-1"
                            >
                              <Zap className="w-3 h-3" />
                              <span>{executingSku === p.sku ? 'Ordering...' : p.stock_status === 'Excess' ? 'Clearance' : 'Reorder'}</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#347A59] font-semibold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Optimal
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-[#111827]">{p.supplier_name}</td>
                      <td className="p-4 font-mono font-bold text-[#111827] text-right">₹{p.selling_price?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Demand Forecasting Tab */}
      {activeTab === 'forecasting' && (
        <div className="glass-card rounded-2xl border border-[#E5ECE7] bg-white p-6 space-y-4 shadow-sm">
          <div className="pb-3 border-b border-[#E5ECE7]">
            <h3 className="text-sm font-black text-[#111827] uppercase tracking-wider">
              Inventory Runway & Demand Exhaustion Projections
            </h3>
            <p className="text-xs text-[#111827] mt-0.5">
              Calculated using 30-day velocity, current available stock, and supplier replenishment lead times.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5ECE7] bg-[#F4F8F5] text-[#111827] font-bold">
                  <th className="p-3">Product SKU</th>
                  <th className="p-3">Available Stock</th>
                  <th className="p-3">Daily Run Rate</th>
                  <th className="p-3">Stock Runway (Days)</th>
                  <th className="p-3">Estimated Stockout Date</th>
                  <th className="p-3">Risk Level</th>
                  <th className="p-3 text-right">Recommended Reorder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5ECE7]/60 font-medium">
                {forecasts.map((f) => (
                  <tr key={f.sku} className="hover:bg-[#F4F8F5]">
                    <td className="p-3">
                      <p className="font-bold text-[#111827]">{f.product_name}</p>
                      <p className="text-[10px] text-[#111827] font-mono">{f.sku}</p>
                    </td>
                    <td className="p-3 font-mono font-bold text-[#2D5A43]">{f.available_stock}</td>
                    <td className="p-3 font-mono text-[#111827]">{f.daily_run_rate} units/day</td>
                    <td className="p-3 font-mono font-black text-[#111827]">
                      <span className={`px-2 py-0.5 rounded ${f.runway_days <= 3 ? 'bg-[#FDF0F1] text-[#8B2E37] border border-[#F2C1C5]' : 'bg-[#EBF4EE] text-[#111827]'}`}>
                        {f.runway_days} days
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[#111827]">{f.stockout_date}</td>
                    <td className="p-3">
                      <StatusBadge status={f.risk_level} />
                    </td>
                    <td className="p-3 font-mono font-bold text-[#2D5A43] text-right">
                      {f.recommended_order_quantity} units
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Movements Tab */}
      {activeTab === 'movements' && (
        <div className="glass-card rounded-2xl border border-[#E5ECE7] bg-white p-6 space-y-4 shadow-sm">
          <div className="pb-3 border-b border-[#E5ECE7]">
            <h3 className="text-sm font-black text-[#111827] uppercase tracking-wider">
              Stock Movement Audit Trail
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5ECE7] bg-[#F4F8F5] text-[#111827] font-bold">
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Quantity</th>
                  <th className="p-3">Ref Type & ID</th>
                  <th className="p-3">Authorized By</th>
                  <th className="p-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5ECE7]/60 font-medium">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-[#F4F8F5]">
                    <td className="p-3 text-[#111827] font-mono text-[11px]">
                      {new Date(m.timestamp).toLocaleDateString()} {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3 text-[#111827] font-bold">{m.product_name}</td>
                    <td className="p-3">
                      <span className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold ${
                        m.movement_type === 'IN' ? 'bg-[#EBF4EE] text-[#2D5A43] border border-[#B8D7C4]' : m.movement_type === 'OUT' ? 'bg-[#FDF0F1] text-[#8B2E37] border border-[#F2C1C5]' : 'bg-[#EBF1F7] text-[#2C4E6F] border border-[#B7CEE2]'
                      }`}>
                        {m.movement_type}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-[#111827]">{m.quantity}</td>
                    <td className="p-3 font-mono text-[#111827]">{m.reference_type} {m.reference_id ? `(${m.reference_id})` : ''}</td>
                    <td className="p-3 text-[#111827] font-semibold">{m.created_by}</td>
                    <td className="p-3 text-[#111827] truncate max-w-xs">{m.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 bg-[#347A59]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5ECE7] rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h2 className="text-base font-black text-[#111827] mb-4">Stock Ledger Adjustment / Inbound Delivery</h2>

            <form onSubmit={handleAdjustStock} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">Select Product</label>
                <select
                  value={selectedProduct?.id || ''}
                  onChange={(e) => {
                    const sel = products.find((p) => p.id === parseInt(e.target.value));
                    setSelectedProduct(sel);
                  }}
                  className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] font-medium focus:outline-none focus:border-[#347A59]"
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Current: {p.stock_quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">Movement Type</label>
                  <select
                    value={movementType}
                    onChange={(e) => setMovementType(e.target.value)}
                    className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] font-medium focus:outline-none focus:border-[#347A59]"
                  >
                    <option value="IN">IN (Receive Inbound)</option>
                    <option value="OUT">OUT (Damaged/Sample)</option>
                    <option value="ADJUSTMENT">ADJUSTMENT (Reset Total)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={adjQuantity}
                    onChange={(e) => setAdjQuantity(e.target.value)}
                    className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] font-medium focus:outline-none focus:border-[#347A59]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">Reason / Notes</label>
                <input
                  type="text"
                  value={adjNotes}
                  onChange={(e) => setAdjNotes(e.target.value)}
                  className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] font-medium focus:outline-none focus:border-[#347A59]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5ECE7]">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#111827] hover:text-[#111827]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#347A59] hover:bg-[#244B39] text-white font-bold text-xs shadow-sm"
                >
                  {submitting ? 'Applying...' : 'Post Adjustment to Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

