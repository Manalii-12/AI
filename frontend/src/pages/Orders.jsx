import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Eye,
  CheckCircle,
  Truck,
  XCircle,
  Clock,
  Package,
  Calendar,
  AlertCircle,
  Sparkles,
  HelpCircle,
  Zap,
  RotateCcw,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { getOrders, createOrder, updateOrderStatus, getCustomers, getProducts, executeOrderAiAction } from '../api';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [executingId, setExecutingId] = useState(null);
  const [notification, setNotification] = useState(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // New Order Form State
  const [customerId, setCustomerId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(10);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleExecuteAiAction = async (order, actionType, actionLabel) => {
    setExecutingId(order.id);
    try {
      const res = await executeOrderAiAction(order.id, { action_type: actionType });
      setNotification({
        type: 'success',
        message: res.data.message || `Executed AI Action: "${actionLabel}" for Order ${order.order_number}`
      });
      await loadOrders();
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to execute order AI action'
      });
    } finally {
      setExecutingId(null);
    }
  };

  const formatOrderPlan = (text) => {
    if (!text) return null;
    const parts = text.split(/(?=Step\s*\d+:)/g).filter((p) => p && p.trim());
    if (parts.length > 1) {
      return (
        <div className="space-y-2 mt-2">
          {parts.map((p, idx) => {
            const clean = p.replace(/^Step\s*\d+:\s*/i, '').trim();
            const stepTitleMatch = clean.match(/^([^-–:]+)\s*[-–:]\s*(.+)$/s);
            const title = stepTitleMatch ? stepTitleMatch[1].trim() : `Action Item ${idx + 1}`;
            const body = stepTitleMatch ? stepTitleMatch[2].trim() : clean;

            return (
              <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-[#B8D7C4]/70 text-xs shadow-xs">
                <span className="shrink-0 w-5 h-5 rounded-full bg-[#347A59] text-white font-extrabold flex items-center justify-center text-[10px] mt-0.5">
                  {idx + 1}
                </span>
                <div className="leading-relaxed">
                  <span className="text-[#1B4332] font-black mr-1">{title}:</span>
                  <span className="text-[#111827] font-semibold">{body}</span>
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    return <p className="text-xs text-[#111827] leading-relaxed font-semibold mt-1">{text}</p>;
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const [ordRes, custRes, prodRes] = await Promise.all([
        getOrders({ status: statusFilter || undefined, search: search || undefined }),
        getCustomers(),
        getProducts()
      ]);
      setOrders(ordRes.data);
      setCustomers(custRes.data);
      setProducts(prodRes.data);
      if (custRes.data.length > 0 && !customerId) {
        setCustomerId(custRes.data[0].id);
      }
      if (prodRes.data.length > 0 && !selectedProductId) {
        setSelectedProductId(prodRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter, search]);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createOrder({
        customer_id: parseInt(customerId),
        items: [{ product_id: parseInt(selectedProductId), quantity: parseInt(quantity) }],
        notes: notes
      });
      setShowCreateModal(false);
      setNotes('');
      await loadOrders();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    let cancelReason = null;
    if (newStatus === 'Cancelled') {
      cancelReason = prompt('Please enter cancellation reason:');
      if (cancelReason === null) return; // User cancelled prompt
    }
    try {
      await updateOrderStatus(orderId, {
        status: newStatus,
        cancellation_reason: cancelReason || undefined
      });
      await loadOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(null);
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update order status');
    }
  };

  const statuses = ['New', 'Confirmed', 'Processing', 'Packed', 'Dispatched', 'Delivered', 'Cancelled'];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#111827] tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-[#111827]" />
            <span>Order Management & Fulfillment</span>
          </h1>
          <p className="text-xs text-[#111827] mt-0.5">
            Full lifecycle CRUD. Advancing statuses automatically reserves, deducts stock, and creates logistics tracking.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#347A59] hover:bg-[#244B39] text-white font-bold text-xs shadow-sm transition-all"
        >
          <Plus className="w-4 h-4 text-[#E5ECE7]" />
          <span>Create New Order</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card rounded-2xl p-4 border border-[#E5ECE7] bg-white shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#111827] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search order # or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#111827] placeholder-[#647568] focus:outline-none focus:border-[#347A59]"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              statusFilter === '' ? 'bg-[#347A59] text-white shadow-xs' : 'text-[#111827] hover:text-[#111827]'
            }`}
          >
            All Orders
          </button>
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                statusFilter === s ? 'bg-[#347A59] text-white shadow-xs' : 'text-[#111827] hover:text-[#111827]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

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

      {/* AI Fulfillment Bottleneck Diagnostic & Resolution Desk */}
      <div className="glass-card rounded-2xl border-2 border-[#83B89A]/60 bg-gradient-to-br from-[#FFFFFF] via-[#F4F8F5] to-[#EBF7F0] p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5ECE7]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#347A59] text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-[#111827] tracking-tight">
                  AI Fulfillment Bottleneck Diagnostic & Resolution Desk
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#347A59] text-white">
                  Active Intelligence
                </span>
              </div>
              <p className="text-xs text-[#111827] font-semibold mt-0.5">
                Automated detection of stockout-blocked orders, SLA breaches, credit holds, and carrier freezes with 1-click execution.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black px-3 py-1.5 rounded-xl bg-white border border-[#B8D7C4] text-[#1B4332] shadow-xs">
              {orders.filter((o) => o.is_bottleneck).length} Fulfillment Exceptions
            </span>
          </div>
        </div>

        {/* Bottlenecks List */}
        <div className="mt-5 space-y-4">
          {orders.filter((o) => o.is_bottleneck).length === 0 ? (
            <div className="p-6 rounded-xl bg-white border border-[#E5ECE7] text-center">
              <CheckCircle className="w-8 h-8 text-[#347A59] mx-auto mb-2" />
              <p className="text-xs font-black text-[#111827]">All Orders Progressing Smoothly</p>
              <p className="text-[11px] text-[#111827] mt-0.5 font-medium">Zero stockout blocks, credit delays, or carrier transit stalls detected.</p>
            </div>
          ) : (
            orders
              .filter((o) => o.is_bottleneck)
              .map((o) => {
                let badgeColor = 'bg-[#FDF0F1] border-[#F2C1C5] text-[#8B2E37]';
                let issueType = 'Stockout Block';
                let defaultActionType = 'RESOLVE_STOCKOUT';
                let defaultActionLabel = 'Issue Emergency PO with BeanCraft India';
                let actionIcon = <Package className="w-3.5 h-3.5" />;

                const notesLower = (o.notes || '').toLowerCase();
                if (o.status === 'Processing' && (o.payment_status === 'Unpaid' || o.payment_status === 'Failed' || notesLower.includes('credit review'))) {
                  badgeColor = 'bg-[#FBF3E8] border-[#E8CDA8] text-[#825425]';
                  issueType = 'Credit Review Hold';
                  defaultActionType = 'APPROVE_CREDIT_HOLD';
                  defaultActionLabel = 'Approve Commercial Credit & Advance to Packed';
                  actionIcon = <CheckCircle2 className="w-3.5 h-3.5" />;
                } else if (o.status === 'Processing' && (notesLower.includes('carrier route hold') || notesLower.includes('transit freeze'))) {
                  badgeColor = 'bg-[#F4EEF7] border-[#D3BEDF] text-[#56386C]';
                  issueType = 'Carrier Route Hold';
                  defaultActionType = 'RE_ROUTE_AIR';
                  defaultActionLabel = 'Re-Route Consignment to Bluedart Air Cargo';
                  actionIcon = <Truck className="w-3.5 h-3.5" />;
                } else if (o.status === 'Dispatched' && (o.payment_status === 'Failed' || o.payment_status === 'Unpaid')) {
                  badgeColor = 'bg-[#FDF0F1] border-[#F2C1C5] text-[#8B2E37]';
                  issueType = 'Revenue Risk';
                  defaultActionType = 'HOLD_CARRIER_OTP';
                  defaultActionLabel = 'Mandate Delivery OTP Hold & Send UPI Mandate';
                  actionIcon = <ShieldAlert className="w-3.5 h-3.5" />;
                } else if (o.status === 'Dispatched') {
                  badgeColor = 'bg-[#FBF3E8] border-[#E8CDA8] text-[#825425]';
                  issueType = 'Logistics SLA Delay';
                  defaultActionType = 'ESCALATE_COURIER_SLA';
                  defaultActionLabel = 'Escalate Priority Courier SLA & Send Live GPS Link';
                  actionIcon = <Truck className="w-3.5 h-3.5" />;
                }

                return (
                  <div
                    key={`bottleneck-${o.id}`}
                    className="p-5 rounded-2xl bg-white border border-[#B8D7C4] shadow-sm hover:border-[#347A59] transition-all"
                  >
                    {/* Top Row: Meta & Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E5ECE7]/60">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase border ${badgeColor}`}>
                          {issueType}
                        </span>
                        <span className="font-mono text-xs font-black text-[#111827]">{o.order_number}</span>
                        <span className="text-xs text-[#111827] font-bold">• {o.customer_name}</span>
                        <span className="text-xs text-[#111827] font-semibold">({o.customer_email})</span>
                      </div>
                      <div className="text-xs font-mono font-bold text-[#111827]">
                        Order Total: <span className="text-[#1B4332]">₹{o.total_amount?.toLocaleString()}</span> | Status:{' '}
                        <span className="text-[#825425]">{o.status}</span>
                      </div>
                    </div>

                    {/* AI Diagnosis: Root Cause */}
                    <div className="mt-3.5 p-3.5 rounded-xl bg-[#FAF7F0] border border-[#DCCBB3]/60">
                      <div className="flex items-start gap-2">
                        <HelpCircle className="w-4 h-4 text-[#825425] shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-black text-[#825425] uppercase tracking-wide">
                            Reason Behind Issue (AI Root Cause Diagnosis)
                          </div>
                          <p className="text-xs text-[#111827] font-bold mt-1 leading-relaxed">
                            {o.root_cause || 'Fulfillment bottleneck identified by proactive scanner.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* AI Suggested Resolution */}
                    <div className="mt-3">
                      <div className="text-xs font-black text-[#1B4332] uppercase tracking-wide flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-[#347A59]" />
                        <span>AI Suggested Resolution & Fulfillment Action Plan</span>
                      </div>
                      {formatOrderPlan(o.ai_suggested_resolution)}
                    </div>

                    {/* 1-Click Action Footer */}
                    <div className="mt-4 pt-3 border-t border-[#E5ECE7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="text-[11px] text-[#111827] font-semibold">
                        Automated AI Action will generate PO, clear commercial terms, or update logistics route.
                      </span>
                      <button
                        onClick={() => handleExecuteAiAction(o, defaultActionType, defaultActionLabel)}
                        disabled={executingId === o.id}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#347A59] hover:bg-[#244B39] text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {actionIcon}
                        <span>
                          {executingId === o.id ? 'Executing Resolution...' : `1-Click AI Action: ${defaultActionLabel}`}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="glass-card rounded-2xl border border-[#E5ECE7] bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E5ECE7] bg-[#F4F8F5] text-[#111827] font-bold">
                <th className="p-4">Order #</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Items / SKUs</th>
                <th className="p-4">Total Amount</th>
                <th className="p-4">Payment</th>
                <th className="p-4">Order Status</th>
                <th className="p-4">AI Diagnosis & Action</th>
                <th className="p-4">Dispatch ETA</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5ECE7]/60 font-medium">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-[#111827]">
                    No orders found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-[#F4F8F5] transition-colors">
                    <td className="p-4 font-mono font-bold text-[#111827] flex items-center gap-2">
                      <span>{o.order_number}</span>
                      {o.priority === 'High' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#FDF0F1] text-[#8B2E37] border border-[#F2C1C5]">
                          HIGH
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-[#111827]">{o.customer_name}</p>
                      <p className="text-[10px] text-[#111827]">{o.customer_email}</p>
                    </td>
                    <td className="p-4 text-[#111827]">
                      {o.items.map((it) => (
                        <div key={it.id} className="text-[11px] truncate max-w-[200px]">
                          {it.quantity}x {it.product_name}
                        </div>
                      ))}
                    </td>
                    <td className="p-4 font-mono font-bold text-[#2D5A43]">
                      ₹{o.total_amount?.toLocaleString()}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={o.payment_status} />
                    </td>
                    <td className="p-4">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="p-4 max-w-xs">
                      {o.is_bottleneck ? (
                        <div className="space-y-1">
                          <p className="text-[11px] text-[#8B2E37] font-bold line-clamp-1" title={o.root_cause}>
                            {o.root_cause}
                          </p>
                          <button
                            onClick={() => {
                              const notesLower = (o.notes || '').toLowerCase();
                              let actionType = 'RESOLVE_STOCKOUT';
                              let actionLabel = 'Emergency PO';
                              if (o.status === 'Processing' && (o.payment_status === 'Unpaid' || o.payment_status === 'Failed' || notesLower.includes('credit review'))) {
                                actionType = 'APPROVE_CREDIT_HOLD';
                                actionLabel = 'Approve Credit';
                              } else if (o.status === 'Processing' && (notesLower.includes('carrier route hold') || notesLower.includes('transit freeze'))) {
                                actionType = 'RE_ROUTE_AIR';
                                actionLabel = 'Air Cargo Re-Route';
                              } else if (o.status === 'Dispatched' && (o.payment_status === 'Failed' || o.payment_status === 'Unpaid')) {
                                actionType = 'HOLD_CARRIER_OTP';
                                actionLabel = 'OTP Hold';
                              } else if (o.status === 'Dispatched') {
                                actionType = 'ESCALATE_COURIER_SLA';
                                actionLabel = 'Escalate SLA';
                              }
                              handleExecuteAiAction(o, actionType, actionLabel);
                            }}
                            disabled={executingId === o.id}
                            className="px-2 py-1 rounded-md bg-[#347A59] text-white text-[10px] font-bold hover:bg-[#244B39] transition-all flex items-center gap-1"
                          >
                            <Zap className="w-3 h-3" />
                            <span>{executingId === o.id ? 'Fixing...' : 'Quick Fix'}</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#347A59] font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Normal
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-[11px] text-[#111827]">
                      {o.expected_delivery_date
                        ? new Date(o.expected_delivery_date).toLocaleDateString()
                        : 'N/A'}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Status progression quick dropdown */}
                        <select
                          value={o.status}
                          onChange={(e) => handleStatusChange(o.id, e.target.value)}
                          className="bg-[#F4F8F5] border border-[#E5ECE7] rounded-lg px-2 py-1 text-[11px] text-[#111827] font-semibold focus:outline-none focus:border-[#347A59]"
                        >
                          {statuses.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="p-1.5 rounded-lg text-[#111827] hover:text-[#111827] hover:bg-[#EBF4EE]"
                          title="View order details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-[#347A59]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5ECE7] rounded-2xl w-full max-w-lg shadow-2xl p-6">
            <h2 className="text-base font-black text-[#111827] mb-1">Create New Beverage Order</h2>
            <p className="text-xs text-[#111827] mb-4">
              Stock will be immediately reserved upon confirmation.
            </p>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">Customer</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] font-medium focus:outline-none focus:border-[#347A59]"
                  required
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email}) - {c.segment}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">Product</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] font-medium focus:outline-none focus:border-[#347A59]"
                    required
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (₹{p.selling_price?.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] font-medium focus:outline-none focus:border-[#347A59]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">Notes / Instructions</label>
                <textarea
                  rows="2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special delivery notes, freight directions..."
                  className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] font-medium focus:outline-none focus:border-[#347A59]"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5ECE7]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#111827] hover:text-[#111827]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#347A59] hover:bg-[#244B39] text-white font-bold text-xs shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Confirm Order & Reserve Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-[#347A59]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5ECE7] rounded-2xl w-full max-w-lg shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5ECE7]">
              <div>
                <h3 className="text-base font-black text-[#111827] font-mono">{selectedOrder.order_number}</h3>
                <p className="text-xs text-[#111827]">{selectedOrder.customer_name} ({selectedOrder.customer_email})</p>
              </div>
              <StatusBadge status={selectedOrder.status} />
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-[#111827] font-bold">Order Date:</span>
                <span className="text-[#111827] font-medium">{new Date(selectedOrder.order_date).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#111827] font-bold">Payment Status:</span>
                <StatusBadge status={selectedOrder.payment_status} />
              </div>
              <div className="flex justify-between">
                <span className="text-[#111827] font-bold">Tracking Number:</span>
                <span className="text-[#111827] font-mono font-bold">{selectedOrder.tracking_number || 'TRK-PENDING'}</span>
              </div>

              <div className="pt-2 border-t border-[#E5ECE7]">
                <p className="text-xs font-black text-[#111827] mb-2">Itemized Products</p>
                {selectedOrder.items.map((it) => (
                  <div key={it.id} className="flex justify-between py-1 text-[#111827]">
                    <span>{it.quantity}x {it.product_name}</span>
                    <span className="font-mono font-bold text-[#111827]">₹{it.subtotal?.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-[#E5ECE7] font-black text-[#2D5A43]">
                  <span>Total Amount:</span>
                  <span>₹{selectedOrder.total_amount?.toLocaleString()}</span>
                </div>
              </div>

              {selectedOrder.cancellation_reason && (
                <div className="p-3 rounded-lg bg-[#FDF0F1] border border-[#F2C1C5] text-[#8B2E37] text-xs font-semibold">
                  <strong>Cancellation Reason:</strong> {selectedOrder.cancellation_reason}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#E5ECE7] flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-xl bg-[#EBF4EE] hover:bg-[#E5ECE7] text-[#111827] text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

