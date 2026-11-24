import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  AlertTriangle,
  CheckCircle,
  FileText,
  Search,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Activity,
  CheckCircle2,
  Zap,
  Send,
  RotateCcw
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { getPayments, recordPayment, getOrders, executePaymentAiAction } from '../api';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [executingId, setExecutingId] = useState(null);
  const [notification, setNotification] = useState(null);

  // Record Payment Form
  const [orderId, setOrderId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [transactionRef, setTransactionRef] = useState('');
  const [status, setStatus] = useState('Success');
  const [submitting, setSubmitting] = useState(false);

  const loadPayments = async () => {
    try {
      const [payRes, ordRes] = await Promise.all([
        getPayments({ status: statusFilter || undefined }),
        getOrders()
      ]);
      setPayments(payRes.data);
      setOrders(ordRes.data);
      if (ordRes.data.length > 0 && !orderId) {
        setOrderId(ordRes.data[0].id);
        setAmount(ordRes.data[0].total_amount);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExecuteAiAction = async (payment, actionType, actionLabel) => {
    setExecutingId(payment.id);
    try {
      const res = await executePaymentAiAction(payment.id, { action_type: actionType });
      setNotification({
        type: 'success',
        message: res.data.message || `Executed AI Action: "${actionLabel}" for Order ${payment.order_number}`
      });
      await loadPayments();
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to execute payment AI action'
      });
    } finally {
      setExecutingId(null);
    }
  };

  const formatPaymentPlan = (text) => {
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

  useEffect(() => {
    loadPayments();
  }, [statusFilter]);

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await recordPayment({
        order_id: parseInt(orderId),
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        transaction_ref: transactionRef || `TXN-${Date.now().toString().slice(-6)}`,
        status: status
      });
      setShowRecordModal(false);
      await loadPayments();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const mismatches = payments.filter((p) => p.is_mismatch);
  const duplicates = payments.filter((p) => p.status === 'Duplicate');
  const failed = payments.filter((p) => p.status === 'Failed');

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#111827] tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-[#111827]" />
            <span>Payments & Revenue Reconciliation</span>
          </h1>
          <p className="text-xs text-[#111827] mt-0.5">
            Automated detection of failed transactions, duplicate transaction IDs, and invoice mismatches.
          </p>
        </div>

        <button
          onClick={() => setShowRecordModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#347A59] hover:bg-[#244B39] text-white font-bold text-xs shadow-sm transition-all"
        >
          <Plus className="w-4 h-4 text-[#E5ECE7]" />
          <span>Record Incoming Payment</span>
        </button>
      </div>

      {/* Detection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-[#F2C1C5] bg-[#FDF0F1] shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-[#8B2E37] uppercase">Failed Transactions</p>
            <ShieldAlert className="w-4 h-4 text-[#8B2E37]" />
          </div>
          <h3 className="text-2xl font-black text-[#8B2E37] mt-1">{failed.length} Failed</h3>
          <p className="text-[11px] text-[#111827] mt-1">Declined or gateway timeouts</p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-[#E8CDA8] bg-[#FBF3E8] shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-[#825425] uppercase">Amount Mismatches</p>
            <AlertTriangle className="w-4 h-4 text-[#825425]" />
          </div>
          <h3 className="text-2xl font-black text-[#825425] mt-1">{mismatches.length} Mismatches</h3>
          <p className="text-[11px] text-[#111827] mt-1">Paid amount deviates from order total</p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-[#D3BEDF] bg-[#F4EEF7] shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-[#56386C] uppercase">Duplicate References</p>
            <AlertTriangle className="w-4 h-4 text-[#56386C]" />
          </div>
          <h3 className="text-2xl font-black text-[#56386C] mt-1">{duplicates.length} Duplicates</h3>
          <p className="text-[11px] text-[#111827] mt-1">Repeated transaction reference numbers</p>
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

      {/* AI Financial Anomaly Diagnostic & Revenue Recovery Desk */}
      <div className="glass-card rounded-2xl border-2 border-[#83B89A]/60 bg-gradient-to-br from-[#FFFFFF] via-[#F4F8F5] to-[#EBF7F0] p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5ECE7]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#347A59] text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-[#111827] tracking-tight">
                  AI Financial Anomaly Diagnostic & Revenue Recovery Desk
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#347A59] text-white">
                  Live Intelligence
                </span>
              </div>
              <p className="text-xs text-[#111827] font-semibold mt-0.5">
                Groq AI root cause attribution, ledger reconciliation, and automated one-click revenue recovery.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black px-3 py-1.5 rounded-xl bg-white border border-[#B8D7C4] text-[#1B4332] shadow-xs">
              {failed.length + mismatches.length + duplicates.length} Active Financial Anomalies
            </span>
          </div>
        </div>

        {/* Anomaly Cards List */}
        <div className="mt-5 space-y-4">
          {payments.filter((p) => p.status === 'Failed' || p.is_mismatch || p.status === 'Duplicate').length === 0 ? (
            <div className="p-6 rounded-xl bg-white border border-[#E5ECE7] text-center">
              <CheckCircle className="w-8 h-8 text-[#347A59] mx-auto mb-2" />
              <p className="text-xs font-black text-[#111827]">All Payment Records Fully Reconciled</p>
              <p className="text-[11px] text-[#111827] mt-0.5 font-medium">No failed transactions, duplicate reference numbers, or invoice amount discrepancies detected.</p>
            </div>
          ) : (
            payments
              .filter((p) => p.status === 'Failed' || p.is_mismatch || p.status === 'Duplicate')
              .map((p) => {
                let badgeColor = 'bg-[#FDF0F1] border-[#F2C1C5] text-[#8B2E37]';
                let issueType = 'Failed Transaction';
                let defaultActionType = 'RESEND_PAYMENT_LINK';
                let defaultActionLabel = 'Dispatch Dynamic UPI Link & SMS Mandate';
                let actionIcon = <Send className="w-3.5 h-3.5" />;

                if (p.is_mismatch) {
                  badgeColor = 'bg-[#FBF3E8] border-[#E8CDA8] text-[#825425]';
                  issueType = 'Amount Mismatch';
                  defaultActionType = 'RESOLVE_MISMATCH';
                  defaultActionLabel = 'Reconcile Variance (Post TDS Adjustment & Mark Cleared)';
                  actionIcon = <CheckCircle2 className="w-3.5 h-3.5" />;
                } else if (p.status === 'Duplicate') {
                  badgeColor = 'bg-[#F4EEF7] border-[#D3BEDF] text-[#56386C]';
                  issueType = 'Duplicate Reference';
                  defaultActionType = 'VOID_DUPLICATE';
                  defaultActionLabel = 'Void Redundant Ledger Entry (Keep Primary TXN)';
                  actionIcon = <RotateCcw className="w-3.5 h-3.5" />;
                }

                return (
                  <div
                    key={`anomaly-${p.id}`}
                    className="p-5 rounded-2xl bg-white border border-[#B8D7C4] shadow-sm hover:border-[#347A59] transition-all"
                  >
                    {/* Top Row: Meta & Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E5ECE7]/60">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase border ${badgeColor}`}>
                          {issueType}
                        </span>
                        <span className="font-mono text-xs font-black text-[#111827]">{p.transaction_ref || 'NO-REF'}</span>
                        <span className="text-xs text-[#111827] font-bold">• Order {p.order_number}</span>
                        <span className="text-xs text-[#111827] font-semibold">({p.customer_name})</span>
                      </div>
                      <div className="text-xs font-mono font-bold text-[#111827]">
                        Paid: <span className="text-[#8B2E37]">₹{p.amount?.toLocaleString()}</span> / Invoice:{' '}
                        <span className="text-[#1B4332]">₹{(p.order_total || 0).toLocaleString()}</span>
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
                            {p.root_cause ||
                              (p.status === 'Failed'
                                ? 'Customer bank server timed out during dual-factor OTP step. No debit on customer card.'
                                : p.is_mismatch
                                ? `Recorded payment ₹${p.amount} deviates from expected invoice ₹${p.order_total}. Probable TDS withholding or partial payment.`
                                : `Identical transaction reference ${p.transaction_ref} logged multiple times due to webhook retry race condition.`)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* AI Suggested Resolution */}
                    <div className="mt-3">
                      <div className="text-xs font-black text-[#1B4332] uppercase tracking-wide flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-[#347A59]" />
                        <span>AI Suggested Resolution & Recovery Plan</span>
                      </div>
                      {formatPaymentPlan(
                        p.ai_suggested_resolution ||
                          'Step 1: Verify gateway logs. Step 2: Trigger payment recovery link with auto-reconcile webhook. Step 3: Notify customer via SMS mandate.'
                      )}
                    </div>

                    {/* 1-Click Action Footer */}
                    <div className="mt-4 pt-3 border-t border-[#E5ECE7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="text-[11px] text-[#111827] font-semibold">
                        Automated AI Action will log to business audit trail and update ledger status.
                      </span>
                      <button
                        onClick={() => handleExecuteAiAction(p, defaultActionType, defaultActionLabel)}
                        disabled={executingId === p.id}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#347A59] hover:bg-[#244B39] text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {actionIcon}
                        <span>
                          {executingId === p.id ? 'Executing Resolution...' : `1-Click AI Action: ${defaultActionLabel}`}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl border border-[#E5ECE7] bg-white overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#E5ECE7] bg-[#F4F8F5] flex items-center justify-between">
          <h3 className="text-sm font-black text-[#111827] uppercase tracking-wider">Transaction Ledger</h3>
          <div className="flex items-center gap-1.5 text-xs">
            {['', 'Success', 'Pending', 'Failed'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  statusFilter === st ? 'bg-[#347A59] text-white shadow-xs' : 'text-[#111827] hover:text-[#111827]'
                }`}
              >
                {st || 'All'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E5ECE7] bg-[#F4F8F5] text-[#111827] font-bold">
                <th className="p-4">Transaction Ref</th>
                <th className="p-4">Related Order</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Method</th>
                <th className="p-4">Paid Amount</th>
                <th className="p-4">Order Value</th>
                <th className="p-4">Status & Anomaly</th>
                <th className="p-4">AI Diagnosis & Action</th>
                <th className="p-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5ECE7]/60 font-medium">
              {payments.map((p) => {
                const isAnomaly = p.status === 'Failed' || p.is_mismatch || p.status === 'Duplicate';
                return (
                  <tr key={p.id} className="hover:bg-[#F4F8F5] transition-colors">
                    <td className="p-4 font-mono font-bold text-[#111827]">{p.transaction_ref || 'N/A'}</td>
                    <td className="p-4 font-mono font-bold text-[#2D5A43]">{p.order_number}</td>
                    <td className="p-4 text-[#111827] font-semibold">{p.customer_name}</td>
                    <td className="p-4 text-[#111827]">{p.payment_method}</td>
                    <td className="p-4 font-mono font-bold text-[#2D5A43]">₹{p.amount?.toLocaleString()}</td>
                    <td className="p-4 font-mono text-[#111827]">₹{(p.order_total || 0).toLocaleString()}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={p.status} />
                        {p.is_mismatch && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FBF3E8] text-[#825425] border border-[#E8CDA8]">
                            MISMATCH
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 max-w-xs">
                      {isAnomaly ? (
                        <div className="space-y-1">
                          <p className="text-[11px] text-[#111827] font-bold line-clamp-1" title={p.root_cause}>
                            {p.root_cause || 'Anomaly diagnosed by AI'}
                          </p>
                          <button
                            onClick={() => {
                              const actionType =
                                p.status === 'Failed'
                                  ? 'RESEND_PAYMENT_LINK'
                                  : p.is_mismatch
                                  ? 'RESOLVE_MISMATCH'
                                  : 'VOID_DUPLICATE';
                              const actionLabel =
                                p.status === 'Failed'
                                  ? 'Resend Link'
                                  : p.is_mismatch
                                  ? 'Reconcile TDS'
                                  : 'Void Duplicate';
                              handleExecuteAiAction(p, actionType, actionLabel);
                            }}
                            disabled={executingId === p.id}
                            className="px-2 py-1 rounded-md bg-[#347A59] text-white text-[10px] font-bold hover:bg-[#244B39] transition-all flex items-center gap-1"
                          >
                            <Zap className="w-3 h-3" />
                            <span>{executingId === p.id ? 'Fixing...' : 'Quick Fix'}</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#347A59] font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Reconciled
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-[#111827] text-[11px]">
                      {new Date(p.payment_date).toLocaleDateString()} {new Date(p.payment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50 bg-[#347A59]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5ECE7] rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h2 className="text-base font-black text-[#111827] mb-4">Record Customer Payment</h2>

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">Select Order</label>
                <select
                  value={orderId}
                  onChange={(e) => {
                    setOrderId(e.target.value);
                    const sel = orders.find((o) => o.id === parseInt(e.target.value));
                    if (sel) setAmount(sel.total_amount);
                  }}
                  className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] font-medium focus:outline-none focus:border-[#347A59]"
                  required
                >
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.order_number} - {o.customer_name} (₹{o.total_amount?.toLocaleString()}) [{o.payment_status}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] font-medium focus:outline-none focus:border-[#347A59]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] font-medium focus:outline-none focus:border-[#347A59]"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Card">Credit/Debit Card</option>
                    <option value="Net Banking">Net Banking</option>
                    <option value="Bank Transfer">Bank Wire</option>
                    <option value="Cash">Cash on Delivery</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">Transaction Reference</label>
                <input
                  type="text"
                  placeholder="e.g. TXN-89210"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] font-medium focus:outline-none focus:border-[#347A59]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] font-semibold focus:outline-none focus:border-[#347A59]"
                >
                  <option value="Success">Success (Settled)</option>
                  <option value="Pending">Pending Clearance</option>
                  <option value="Failed">Failed / Declined</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5ECE7]">
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#111827] hover:text-[#111827]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#347A59] hover:bg-[#244B39] text-white font-bold text-xs shadow-sm"
                >
                  {submitting ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

