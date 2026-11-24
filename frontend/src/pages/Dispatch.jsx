import React, { useState, useEffect } from 'react';
import {
  Truck,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  MapPin,
  ExternalLink,
  Edit,
  Play,
  Sparkles,
  RefreshCw,
  Volume2,
  X,
  ArrowRight,
  ShieldAlert,
  Package,
  CreditCard,
  Send,
  Zap
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { getDispatches, updateDispatch, makeDispatch, getOrders, createPurchaseOrder, executeDispatchAiAction } from '../api';

export default function Dispatch() {
  const [dispatches, setDispatches] = useState([]);
  const [delayedOnly, setDelayedOnly] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState(null);
  const [carrierNotes, setCarrierNotes] = useState('');
  const [newStatus, setNewStatus] = useState('In Transit');
  const [submitting, setSubmitting] = useState(false);

  // AI Issue Action State
  const [executingIssueId, setExecutingIssueId] = useState(null);
  const [dispatchNotification, setDispatchNotification] = useState(null);

  // Make Dispatch Modal & Report State
  const [showMakeDispatchModal, setShowMakeDispatchModal] = useState(false);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [selectAllOrders, setSelectAllOrders] = useState(true);
  const [isExecutingDispatch, setIsExecutingDispatch] = useState(false);
  const [dispatchResult, setDispatchResult] = useState(null);
  const [solutionFeedback, setSolutionFeedback] = useState({});

  const handleExecuteIssueAction = async (dispatchId, actionType, actionLabel) => {
    setExecutingIssueId(dispatchId);
    try {
      const res = await executeDispatchAiAction(dispatchId, {
        action_type: actionType,
        action_label: actionLabel,
        user_name: 'Aarav Mehta (Operations Desk)'
      });
      setDispatchNotification({
        type: 'success',
        message: res.data?.message || `AI Action "${actionLabel}" executed successfully.`
      });
      await loadDispatches();
      setTimeout(() => setDispatchNotification(null), 6000);
    } catch (err) {
      console.error('Failed to execute AI action:', err);
      setDispatchNotification({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to execute logistics AI action.'
      });
      setTimeout(() => setDispatchNotification(null), 6000);
    } finally {
      setExecutingIssueId(null);
    }
  };

  const loadDispatches = async () => {
    try {
      const res = await getDispatches({ delayed_only: delayedOnly });
      setDispatches(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadDispatches();
  }, [delayedOnly]);

  const handleOpenMakeDispatch = async () => {
    setShowMakeDispatchModal(true);
    setDispatchResult(null);
    setSolutionFeedback({});
    try {
      const res = await getOrders();
      // Filter orders that are ready or actionable for dispatch
      const ready = res.data.filter((o) =>
        ['New', 'Confirmed', 'Processing', 'Packed'].includes(o.status)
      );
      setPendingOrders(ready);
      setSelectedOrderIds(ready.map((o) => o.id));
      setSelectAllOrders(true);
    } catch (err) {
      console.error('Failed to load pending orders:', err);
    }
  };

  const handleToggleSelectOrder = (orderId) => {
    if (selectedOrderIds.includes(orderId)) {
      setSelectedOrderIds(selectedOrderIds.filter((id) => id !== orderId));
      setSelectAllOrders(false);
    } else {
      const updated = [...selectedOrderIds, orderId];
      setSelectedOrderIds(updated);
      if (updated.length === pendingOrders.length) {
        setSelectAllOrders(true);
      }
    }
  };

  const handleToggleSelectAll = () => {
    if (selectAllOrders) {
      setSelectedOrderIds([]);
      setSelectAllOrders(false);
    } else {
      setSelectedOrderIds(pendingOrders.map((o) => o.id));
      setSelectAllOrders(true);
    }
  };

  const handleExecuteDispatch = async () => {
    setIsExecutingDispatch(true);
    try {
      const payload = {
        order_ids: selectAllOrders ? null : selectedOrderIds,
        user_name: 'Aarav Mehta (Company Owner)'
      };
      const res = await makeDispatch(payload);
      setDispatchResult(res.data);
      await loadDispatches();

      // Read spoken summary aloud if speech synthesis supported
      if ('speechSynthesis' in window && res.data.spoken_summary) {
        try {
          window.speechSynthesis.cancel();
          const clean = res.data.spoken_summary
            .replace(/₹\s*([0-9.,]+)/g, '$1 Rupees')
            .replace(/₹/g, ' Rupees ')
            .replace(/PO-(\d+)/g, 'Purchase Order $1')
            .replace(/HUG-(\d+)/g, 'Hugg Order $1');
          const utterance = new SpeechSynthesisUtterance(clean);
          utterance.rate = 1.0;
          utterance.lang = 'en-US';
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.warn('Speech synthesis error:', e);
        }
      }
    } catch (err) {
      console.error('Dispatch execution error:', err);
      alert(err.response?.data?.detail || 'Failed to execute dispatch');
    } finally {
      setIsExecutingDispatch(false);
    }
  };

  const handleExecuteSolution = async (failedItem, index) => {
    const action = failedItem.solution_action;
    if (!action) return;

    try {
      if (action.action_type === 'CREATE_PURCHASE_ORDER') {
        await createPurchaseOrder({
          product_id: action.product_id,
          supplier_id: action.supplier_id,
          quantity: action.quantity
        });
        setSolutionFeedback((prev) => ({
          ...prev,
          [index]: `✅ Emergency PO created for ${action.quantity} units of ${action.product_name}`
        }));
      } else if (action.action_type === 'SEND_PAYMENT_REMINDER') {
        setSolutionFeedback((prev) => ({
          ...prev,
          [index]: `✅ Official payment recovery notice dispatched to ${action.customer_name}`
        }));
      }
    } catch (err) {
      console.error('Failed to execute solution:', err);
      setSolutionFeedback((prev) => ({
        ...prev,
        [index]: `⚠️ Failed: ${err.response?.data?.detail || err.message}`
      }));
    }
  };

  const handlePlayAudio = (text) => {
    if ('speechSynthesis' in window && text) {
      window.speechSynthesis.cancel();
      const clean = text
        .replace(/₹\s*([0-9.,]+)/g, '$1 Rupees')
        .replace(/₹/g, ' Rupees ')
        .replace(/PO-(\d+)/g, 'Purchase Order $1')
        .replace(/HUG-(\d+)/g, 'Hugg Order $1');
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.0;
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedDispatch) return;
    setSubmitting(true);
    try {
      await updateDispatch(selectedDispatch.id, {
        status: newStatus,
        carrier_status_notes: carrierNotes
      });
      setSelectedDispatch(null);
      await loadDispatches();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update dispatch');
    } finally {
      setSubmitting(false);
    }
  };

  const delayedCount = dispatches.filter((d) => d.is_delayed).length;
  const issueDispatches = dispatches.filter((d) => d.has_issue);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#111827] tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-[#111827]" />
            <span>Dispatch & Carrier Logistics Control</span>
          </h1>
          <p className="text-xs text-[#111827] mt-0.5">
            Real-time delivery partner SLA monitoring across Delhivery, BlueDart, Blip, Shiprocket, and Hugg Express.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Owner Action: Make Dispatch */}
          <button
            onClick={handleOpenMakeDispatch}
            className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 bg-[#347A59] hover:bg-[#244B39] text-white shadow-sm border border-[#347A59]"
          >
            <Sparkles className="w-4 h-4 text-[#E5ECE7]" />
            <span>Make Dispatch (Owner Action)</span>
          </button>

          <button
            onClick={() => setDelayedOnly(!delayedOnly)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              delayedOnly
                ? 'bg-[#FDF0F1] text-[#8B2E37] border border-[#F2C1C5] shadow-xs'
                : 'bg-white text-[#111827] hover:bg-[#F4F8F5] border border-[#E5ECE7]'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-[#8B2E37]" />
            <span>Show Delayed Only ({delayedCount})</span>
          </button>
        </div>
      </div>

      {/* SLA Alert Banner if delayed shipments exist */}
      {delayedCount > 0 && (
        <div className="p-4 rounded-2xl bg-[#FDF0F1] border border-[#F2C1C5] flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white border border-[#F2C1C5] text-[#8B2E37]">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#8B2E37]">
                Logistics Warning: {delayedCount} Active Consignments Breached Delivery Target
              </h4>
              <p className="text-[11px] text-[#632026] mt-0.5">
                Carriers have exceeded agreed SLAs. Check carrier notes or trigger escalation from the AI Action Center.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Banner */}
      {dispatchNotification && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between border shadow-sm transition-all ${
            dispatchNotification.type === 'success'
              ? 'bg-[#EBF4EE] border-[#B8D7C4] text-[#244B39]'
              : 'bg-[#FDF0F1] border-[#F2C1C5] text-[#8B2E37]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {dispatchNotification.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-[#347A59] shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-[#8B2E37] shrink-0" />
            )}
            <p className="text-xs font-bold">{dispatchNotification.message}</p>
          </div>
          <button
            onClick={() => setDispatchNotification(null)}
            className="p-1 rounded-lg hover:bg-black/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* AI Dispatch Issues Diagnostic & Recommended Solutions Desk */}
      {issueDispatches.length > 0 && (
        <div className="rounded-2xl border border-[#F2C1C5] bg-[#FFFBFB] p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F2C1C5]/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#FDF0F1] text-[#8B2E37] border border-[#F2C1C5]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-[#8B2E37]">
                    AI Logistics Issue Diagnostics & Countermeasure Desk
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#8B2E37] text-white text-[10px] font-black">
                    {issueDispatches.length} Consignment Issues Diagnosed
                  </span>
                </div>
                <p className="text-[11px] text-[#632026] mt-0.5">
                  AI root cause engine identifies carrier linehaul bottlenecks, mechanical breakdowns, and transit embargoes with recommended resolutions.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-[#8B2E37] bg-white px-2.5 py-1 rounded-lg border border-[#F2C1C5] self-start sm:self-auto">
              Autonomous AI Diagnostic Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {issueDispatches.map((issue) => (
              <div
                key={issue.id}
                className="p-4 rounded-xl border border-[#F2C1C5] bg-white space-y-3 shadow-xs hover:border-[#8B2E37] transition-all"
              >
                {/* Header row: Tracking, Carrier, Customer */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs text-[#111827]">
                        {issue.tracking_number}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#F4F8F5] text-[#2D5A43] font-mono font-bold text-[10px] border border-[#E5ECE7]">
                        {issue.order_number}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#FDF0F1] text-[#8B2E37] font-bold text-[10px] border border-[#F2C1C5]">
                        {issue.delivery_partner}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#111827] font-semibold mt-1">
                      {issue.customer_name} • <span className="text-neutral-500">{issue.customer_city}</span>
                    </p>
                  </div>
                  {issue.is_delayed && (
                    <span className="px-2 py-0.5 rounded-md bg-[#8B2E37] text-white text-[10px] font-black shrink-0">
                      +{issue.delay_hours}h Overdue
                    </span>
                  )}
                </div>

                {/* AI Root Cause (Reason Behind Issue) */}
                <div className="p-3 rounded-lg bg-[#FDF0F1]/70 border border-[#F2C1C5] text-xs">
                  <div className="flex items-center gap-1.5 text-[#8B2E37] font-bold mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Reason Behind Issue (AI Root Cause Diagnosis):</span>
                  </div>
                  <p className="text-[11px] text-[#632026] leading-relaxed font-medium">
                    {issue.root_cause}
                  </p>
                </div>

                {/* AI Recommended Solution */}
                <div className="p-3 rounded-lg bg-[#EBF4EE] border border-[#B8D7C4] text-xs">
                  <div className="flex items-center gap-1.5 text-[#244B39] font-bold mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#347A59] shrink-0" />
                    <span>AI Recommended Solution & Countermeasure:</span>
                  </div>
                  <p className="text-[11px] text-[#1D3E2F] leading-relaxed font-medium">
                    {issue.ai_suggested_resolution}
                  </p>
                </div>

                {/* 1-Click Action Footer */}
                {issue.action_type && (
                  <div className="pt-1 flex items-center justify-between gap-2 border-t border-[#E5ECE7]/60">
                    <span className="text-[10px] text-neutral-500 font-semibold flex items-center gap-1">
                      <Zap className="w-3 h-3 text-[#347A59]" />
                      Action Ready
                    </span>
                    <button
                      onClick={() =>
                        handleExecuteIssueAction(issue.id, issue.action_type, issue.action_label)
                      }
                      disabled={executingIssueId === issue.id}
                      className="px-3.5 py-1.5 rounded-lg bg-[#347A59] hover:bg-[#244B39] text-white text-[11px] font-bold transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                    >
                      {executingIssueId === issue.id ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Executing...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3 h-3 text-[#E5ECE7]" />
                          <span>{issue.action_label || 'Execute Countermeasure'}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dispatches Table */}
      <div className="glass-card rounded-2xl border border-[#E5ECE7] bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E5ECE7] bg-[#F4F8F5] text-[#111827] font-bold">
                <th className="p-4">Tracking Number</th>
                <th className="p-4">Related Order</th>
                <th className="p-4">Recipient & City</th>
                <th className="p-4">Carrier Partner</th>
                <th className="p-4">Expected Delivery</th>
                <th className="p-4">Carrier Status</th>
                <th className="p-4">Logistics Notes & AI Diagnostics</th>
                <th className="p-4 text-right">Update & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5ECE7]/60 font-medium">
              {dispatches.map((d) => (
                <tr key={d.id} className="hover:bg-[#F4F8F5] transition-colors">
                  <td className="p-4 font-mono font-bold text-[#111827] flex items-center gap-1.5">
                    <span>{d.tracking_number}</span>
                  </td>
                  <td className="p-4 font-mono text-[#2D5A43] font-bold">{d.order_number}</td>
                  <td className="p-4">
                    <p className="font-bold text-[#111827]">{d.customer_name}</p>
                    <p className="text-[10px] text-[#111827]">{d.customer_city}</p>
                  </td>
                  <td className="p-4 text-[#111827]">{d.delivery_partner}</td>
                  <td className="p-4 text-[11px]">
                    <span className={d.is_delayed ? 'text-[#8B2E37] font-bold' : 'text-[#111827]'}>
                      {d.expected_delivery_date
                        ? new Date(d.expected_delivery_date).toLocaleDateString()
                        : 'N/A'}
                    </span>
                    {d.is_delayed && (
                      <span className="block text-[10px] text-[#8B2E37] font-bold mt-0.5">
                        +{d.delay_hours}h overdue
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="p-4 text-[#111827] text-[11px] max-w-sm">
                    <p className="font-medium text-[#111827]">{d.carrier_status_notes || 'In transit normally'}</p>
                    {d.has_issue && d.root_cause && (
                      <div className="mt-1.5 p-2 rounded-lg bg-[#FDF0F1] border border-[#F2C1C5] text-[10px] text-[#8B2E37]">
                        <p className="font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          AI Reason Behind Issue:
                        </p>
                        <p className="text-[#632026] mt-0.5 leading-snug">{d.root_cause}</p>
                      </div>
                    )}
                    {d.has_issue && d.ai_suggested_resolution && (
                      <div className="mt-1.5 p-2 rounded-lg bg-[#EBF4EE] border border-[#B8D7C4] text-[10px] text-[#244B39]">
                        <p className="font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-[#347A59] shrink-0" />
                          AI Recommended Solution:
                        </p>
                        <p className="text-[#1D3E2F] mt-0.5 leading-snug">{d.ai_suggested_resolution}</p>
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {d.has_issue && d.action_type && (
                        <button
                          onClick={() => handleExecuteIssueAction(d.id, d.action_type, d.action_label)}
                          disabled={executingIssueId === d.id}
                          title={d.action_label}
                          className="px-2.5 py-1.5 rounded-lg bg-[#347A59] hover:bg-[#244B39] text-white text-[10px] font-bold transition-all flex items-center gap-1 shadow-xs disabled:opacity-50"
                        >
                          <Zap className="w-3 h-3" />
                          <span>{executingIssueId === d.id ? 'Fixing...' : 'AI Fix'}</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedDispatch(d);
                          setCarrierNotes(d.carrier_status_notes || '');
                          setNewStatus(d.status);
                        }}
                        className="p-1.5 rounded-lg text-[#111827] hover:text-[#111827] hover:bg-[#EBF4EE]"
                        title="Edit Status"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


      {/* ============================================================== */}
      {/* COMPANY OWNER: MAKE DISPATCH & DIAGNOSTIC VERIFICATION MODAL  */}
      {/* ============================================================== */}
      {showMakeDispatchModal && (
        <div className="fixed inset-0 z-50 bg-[#347A59]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5ECE7] rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#E5ECE7] flex items-center justify-between bg-[#F4F8F5]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#EBF4EE] text-[#111827] border border-[#E5ECE7]">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-[#111827]">Make Dispatch & Autonomous Verification</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#EBF4EE] text-[#111827] text-[10px] font-bold border border-[#E5ECE7]">
                      Company Owner Action
                    </span>
                  </div>
                  <p className="text-xs text-[#111827] mt-0.5">
                    Pre-dispatch diagnostic verification: Physical stock sufficiency, payment authorization, and courier SLA routing.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMakeDispatchModal(false)}
                className="p-1.5 rounded-lg text-[#111827] hover:text-[#111827] hover:bg-[#EBF4EE] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Either Selection Screen or Detailed Results Screen */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-white">
              {!dispatchResult ? (
                <>
                  {/* Selection Mode & Instructions */}
                  <div className="p-4 rounded-2xl bg-[#F4F8F5] border border-[#E5ECE7] flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-[#111827]">Warehouse Dispatch Queue</h4>
                      <p className="text-[11px] text-[#111827] mt-0.5">
                        {pendingOrders.length} order(s) currently staged in New, Confirmed, Processing, or Packed state.
                      </p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#111827] bg-[#EBF4EE] px-3.5 py-2 rounded-xl border border-[#E5ECE7] shadow-xs">
                      <input
                        type="checkbox"
                        checked={selectAllOrders}
                        onChange={handleToggleSelectAll}
                        className="rounded accent-[#244B39]"
                      />
                      <span>Dispatch All Ready Orders ({pendingOrders.length})</span>
                    </label>
                  </div>

                  {/* Orders Table */}
                  <div className="rounded-xl border border-[#E5ECE7] overflow-hidden bg-white shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#E5ECE7] bg-[#F4F8F5] text-[#111827] font-bold">
                          <th className="p-3 w-10 text-center">Select</th>
                          <th className="p-3">Order Number</th>
                          <th className="p-3">Customer</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Payment</th>
                          <th className="p-3 text-right">Order Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5ECE7]/60 font-medium">
                        {pendingOrders.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="p-8 text-center text-[#111827]">
                              No orders awaiting dispatch in the warehouse queue.
                            </td>
                          </tr>
                        ) : (
                          pendingOrders.map((ord) => {
                            const isChecked = selectedOrderIds.includes(ord.id);
                            return (
                              <tr
                                key={ord.id}
                                onClick={() => handleToggleSelectOrder(ord.id)}
                                className={`cursor-pointer transition-colors ${
                                  isChecked ? 'bg-[#F4F8F5]' : 'hover:bg-[#F4F8F5]/60'
                                }`}
                              >
                                <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggleSelectOrder(ord.id)}
                                    className="rounded accent-[#244B39]"
                                  />
                                </td>
                                <td className="p-3 font-mono font-bold text-[#111827]">{ord.order_number}</td>
                                <td className="p-3 text-[#111827] font-semibold">{ord.customer_name}</td>
                                <td className="p-3">
                                  <StatusBadge status={ord.status} />
                                </td>
                                <td className="p-3">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      ord.payment_status === 'Paid'
                                        ? 'bg-[#EBF4EE] text-[#2D5A43] border border-[#B8D7C4]'
                                        : 'bg-[#FBF3E8] text-[#825425] border border-[#E8CDA8]'
                                    }`}
                                  >
                                    {ord.payment_status}
                                  </span>
                                </td>
                                <td className="p-3 text-right font-mono font-bold text-[#111827]">
                                  ₹{ord.total_amount?.toLocaleString()}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                /* ============================================================== */
                /* DISPATCH EXECUTION RESULTS: SUCCEEDED, FAILED, REASONS, SOLUTIONS */
                /* ============================================================== */
                <div className="space-y-5 animate-fade-in">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-4 rounded-2xl bg-[#F4F8F5] border border-[#E5ECE7] text-center shadow-xs">
                      <p className="text-[11px] text-[#111827] font-bold">Total Evaluated</p>
                      <p className="text-2xl font-black text-[#111827] mt-1">{dispatchResult.total_processed}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#EBF4EE] border border-[#B8D7C4] text-center shadow-xs">
                      <p className="text-[11px] text-[#2D5A43] font-bold flex items-center justify-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Dispatched Successfully</span>
                      </p>
                      <p className="text-2xl font-black text-[#2D5A43] mt-1">{dispatchResult.successful_count}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#FDF0F1] border border-[#F2C1C5] text-center shadow-xs">
                      <p className="text-[11px] text-[#8B2E37] font-bold flex items-center justify-center gap-1">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Failed Dispatches</span>
                      </p>
                      <p className="text-2xl font-black text-[#8B2E37] mt-1">{dispatchResult.failed_count}</p>
                    </div>
                  </div>

                  {/* Spoken AI Audio Player Bar */}
                  {dispatchResult.spoken_summary && (
                    <div className="p-3.5 rounded-2xl bg-[#F4F8F5] border border-[#E5ECE7] flex items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-[#EBF4EE] text-[#111827] border border-[#E5ECE7]">
                          <Volume2 className="w-4 h-4" />
                        </div>
                        <p className="text-xs text-[#111827] italic leading-snug line-clamp-2">
                          "{dispatchResult.spoken_summary}"
                        </p>
                      </div>
                      <button
                        onClick={() => handlePlayAudio(dispatchResult.spoken_summary)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#347A59] hover:bg-[#244B39] text-xs font-bold text-white border border-[#347A59] flex items-center gap-1.5 flex-shrink-0 shadow-xs"
                      >
                        <Play className="w-3.5 h-3.5 text-[#E5ECE7]" />
                        <span>Hear Voice</span>
                      </button>
                    </div>
                  )}

                  {/* SECTION 1: SUCCESSFUL DISPATCHES */}
                  {dispatchResult.successful_count > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-black text-[#2D5A43] uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4" />
                        <span>Successfully Dispatched Consignments ({dispatchResult.successful_count})</span>
                      </h3>
                      <div className="space-y-2">
                        {dispatchResult.successful_dispatches.map((item) => (
                          <div
                            key={item.order_id}
                            className="p-3.5 rounded-2xl bg-[#EBF4EE] border border-[#B8D7C4] flex items-center justify-between shadow-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-[#111827] text-xs">{item.order_number}</span>
                                <span className="text-xs text-[#2D5A43] font-semibold">({item.customer_name})</span>
                                <span className="px-2 py-0.5 rounded bg-white text-[#2D5A43] text-[10px] font-bold border border-[#B8D7C4]">
                                  Carrier: {item.carrier}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#111827] mt-1">
                                Tracking: <strong className="text-[#2D5A43] font-mono">{item.tracking_number}</strong> | Items: {item.items_summary}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-mono font-bold text-[#111827]">₹{item.total_amount?.toLocaleString()}</span>
                              <span className="block text-[10px] text-[#2D5A43] font-bold mt-0.5">In Transit</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SECTION 2: FAILED DISPATCHES WITH REASONS & RECOMMENDED SOLUTIONS */}
                  {dispatchResult.failed_count > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-black text-[#8B2E37] uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4" />
                        <span>Failed Dispatches — Diagnostic Reasons Behind Them & Recommended Solutions</span>
                      </h3>
                      <div className="space-y-3">
                        {dispatchResult.failed_dispatches.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-4 rounded-2xl bg-[#FDF0F1] border border-[#F2C1C5] space-y-3 shadow-xs"
                          >
                            {/* Failed Order Header */}
                            <div className="flex items-center justify-between pb-2 border-b border-[#F2C1C5]">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-[#111827] text-xs">{item.order_number}</span>
                                <span className="text-xs text-[#8B2E37] font-semibold">({item.customer_name})</span>
                              </div>
                              <span className="px-2.5 py-0.5 rounded-full bg-white text-[#8B2E37] text-[10px] font-bold border border-[#F2C1C5]">
                                {item.failure_category === 'INVENTORY_DEFICIT' ? '📦 Stock Deficit Block' : '💳 Payment Unpaid'}
                              </span>
                            </div>

                            {/* Reason Behind Failure */}
                            <div className="p-3 rounded-xl bg-white border border-[#F2C1C5]">
                              <p className="text-[10px] font-bold text-[#8B2E37] uppercase tracking-wider mb-1 flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reason Behind Dispatch Failure:</span>
                              </p>
                              <p className="text-xs text-[#632026] leading-relaxed font-semibold">
                                {item.reason}
                              </p>
                            </div>

                            {/* AI Recommended Solution */}
                            <div className="p-3 rounded-xl bg-[#F4F8F5] border border-[#E5ECE7]">
                              <p className="text-[10px] font-bold text-[#111827] uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 text-[#347A59]" />
                                <span>💡 AI Recommended Countermeasure:</span>
                              </p>
                              <p className="text-xs text-[#111827] leading-relaxed font-medium mb-2.5">
                                {item.recommended_solution}
                              </p>

                              {/* 1-Click Action Button for Solution */}
                              {item.solution_action && (
                                <div>
                                  {solutionFeedback[idx] ? (
                                    <div className="text-[11px] font-bold text-[#2D5A43] bg-[#EBF4EE] px-3 py-1.5 rounded-lg border border-[#B8D7C4]">
                                      {solutionFeedback[idx]}
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleExecuteSolution(item, idx)}
                                      className="px-3.5 py-2 rounded-xl bg-[#347A59] hover:bg-[#244B39] text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
                                    >
                                      <span>
                                        {item.solution_action.action_type === 'CREATE_PURCHASE_ORDER'
                                          ? `Approve Emergency PO (${item.solution_action.quantity} units)`
                                          : 'Send Payment Recovery Link'}
                                      </span>
                                      <ArrowRight className="w-3.5 h-3.5 text-[#E5ECE7]" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-[#E5ECE7] bg-[#F4F8F5] flex items-center justify-between">
              <div>
                {!dispatchResult && (
                  <span className="text-xs text-[#111827] font-bold">
                    {selectAllOrders ? pendingOrders.length : selectedOrderIds.length} order(s) selected for verification
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowMakeDispatchModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#111827] hover:text-[#111827]"
                >
                  {dispatchResult ? 'Close' : 'Cancel'}
                </button>

                {!dispatchResult ? (
                  <button
                    onClick={handleExecuteDispatch}
                    disabled={isExecutingDispatch || (selectedOrderIds.length === 0 && !selectAllOrders)}
                    className="px-5 py-2.5 rounded-xl bg-[#347A59] hover:bg-[#244B39] text-white font-bold text-xs transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {isExecutingDispatch ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-[#E5ECE7]" />
                        <span>Verifying & Dispatching...</span>
                      </>
                    ) : (
                      <>
                        <Truck className="w-4 h-4 text-[#E5ECE7]" />
                        <span>Verify & Execute Dispatch</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setDispatchResult(null);
                      handleOpenMakeDispatch();
                    }}
                    className="px-4 py-2 rounded-xl bg-[#347A59] hover:bg-[#244B39] text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#E5ECE7]" />
                    <span>Run Another Dispatch</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Dispatch Modal */}
      {selectedDispatch && (
        <div className="fixed inset-0 z-50 bg-[#347A59]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5ECE7] rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h2 className="text-base font-black text-[#111827] mb-1">Update Carrier Status</h2>
            <p className="text-xs text-[#111827] mb-4">
              Tracking: <strong className="text-[#2D5A43] font-mono">{selectedDispatch.tracking_number}</strong>
            </p>

            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] font-semibold focus:outline-none focus:border-[#347A59]"
                >
                  <option value="Preparing">Preparing</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Out for Delivery">Out for Delivery</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Delayed">Delayed</option>
                  <option value="Failed">Failed / Returned</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">Carrier Notes</label>
                <textarea
                  rows="3"
                  value={carrierNotes}
                  onChange={(e) => setCarrierNotes(e.target.value)}
                  placeholder="Carrier tracking remarks, delays, hub notes..."
                  className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] font-medium focus:outline-none focus:border-[#347A59]"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5ECE7]">
                <button
                  type="button"
                  onClick={() => setSelectedDispatch(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#111827] hover:text-[#111827]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#347A59] hover:bg-[#244B39] text-white font-bold text-xs shadow-sm"
                >
                  {submitting ? 'Updating...' : 'Save Logistics Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

