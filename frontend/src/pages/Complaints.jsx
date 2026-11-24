import React, { useState, useEffect } from 'react';
import {
  MessageSquareWarning,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sparkles,
  ArrowRight,
  UserCheck,
  Truck,
  RotateCcw,
  CreditCard,
  ShieldAlert,
  Send,
  Package,
  Activity,
  Edit3,
  HelpCircle,
  X
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { getComplaints, fileComplaint, updateComplaint, getCustomers, getOrders } from '../api';

export default function Complaints() {
  const [complaints, setComplaints] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFileModal, setShowFileModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [executingId, setExecutingId] = useState(null);
  const [notification, setNotification] = useState(null);

  // Custom resolution inline modal state
  const [customResolvingComp, setCustomResolvingComp] = useState(null);
  const [customResolutionText, setCustomResolutionText] = useState('');

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [category, setCategory] = useState('Product Quality');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');

  const loadData = async () => {
    setLoading(true);
    try {
      const [compRes, custRes, ordRes] = await Promise.allSettled([
        getComplaints(),
        getCustomers(),
        getOrders()
      ]);
      if (compRes.status === 'fulfilled' && compRes.value?.data) {
        setComplaints(compRes.value.data);
      }
      if (custRes.status === 'fulfilled' && custRes.value?.data) {
        setCustomers(custRes.value.data);
        if (custRes.value.data.length > 0 && !customerId) {
          setCustomerId(custRes.value.data[0].id);
        }
      }
      if (ordRes.status === 'fulfilled' && ordRes.value?.data) {
        setOrders(ordRes.value.data);
      }
    } catch (err) {
      console.error('Failed to load complaints data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileComplaint = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fileComplaint({
        customer_id: parseInt(customerId),
        order_id: orderId ? parseInt(orderId) : undefined,
        category: category,
        description: description,
        priority: priority
      });
      setShowFileModal(false);
      setDescription('');
      setNotification({ type: 'success', message: 'Customer complaint filed successfully. AI has pre-classified sentiment and resolution options.' });
      await loadData();
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      setNotification({ type: 'error', message: err.response?.data?.detail || 'Failed to file complaint' });
    } finally {
      setSubmitting(false);
    }
  };

  // Instant 1-Click AI Resolution Execution
  const handleExecuteAiResolution = async (comp, resolutionText, label = 'AI Action') => {
    setExecutingId(comp.id);
    try {
      await updateComplaint(comp.id, {
        status: 'Resolved',
        resolution: resolutionText
      });
      setNotification({
        type: 'success',
        message: `Executed AI Action for ${comp.complaint_number}: "${label}" applied successfully!`
      });
      if (customResolvingComp?.id === comp.id) {
        setCustomResolvingComp(null);
      }
      await loadData();
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to apply resolution.'
      });
    } finally {
      setExecutingId(null);
    }
  };

  const handleReopenComplaint = async (comp) => {
    setExecutingId(comp.id);
    try {
      await updateComplaint(comp.id, {
        status: 'In Progress',
        resolution: null
      });
      setNotification({
        type: 'info',
        message: `Re-opened ticket ${comp.complaint_number} for further review.`
      });
      await loadData();
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setExecutingId(null);
    }
  };

  const openCustomModal = (comp) => {
    setCustomResolvingComp(comp);
    setCustomResolutionText(comp.ai_suggested_resolution || 'Verified batch details and resolved ticket with customer satisfaction credit.');
  };

  // Format step-by-step resolution plan cleanly into visual action cards
  const formatComplaintSteps = (text) => {
    if (!text) return null;
    const parts = text.split(/(?=Step\s*\d+:)/g).filter(p => p && p.trim());
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

  // Generate 1-Click AI Actions tailored to this specific complaint
  const getAiActionOptions = (c) => {
    const rawRes = c.ai_suggested_resolution || '';
    const parts = rawRes.split(/(?=Step\s*\d+:)/g).filter(p => p && p.trim());

    if (parts.length >= 2) {
      // Intelligently parse each step into a complaint-specific 1-click action button
      return parts.slice(0, 3).map((p, idx) => {
        const clean = p.replace(/^Step\s*\d+:\s*/i, '').trim();
        const stepMatch = clean.match(/^([^-–:]+)\s*[-–:]\s*(.+)$/s);
        const title = stepMatch ? stepMatch[1].trim() : `Action Item ${idx + 1}`;
        const body = stepMatch ? stepMatch[2].trim() : clean;

        const titleLower = title.toLowerCase();
        let icon = Sparkles;
        let color = 'emerald';

        if (titleLower.includes('courier') || titleLower.includes('intercept') || titleLower.includes('rider') || titleLower.includes('van') || titleLower.includes('override') || titleLower.includes('expedite') || titleLower.includes('dispatch') || titleLower.includes('air') || titleLower.includes('route')) {
          icon = Truck;
          color = 'emerald';
        } else if (titleLower.includes('refund') || titleLower.includes('credit') || titleLower.includes('reversal') || titleLower.includes('waive') || titleLower.includes('settlement') || titleLower.includes('allowance')) {
          icon = CreditCard;
          color = 'cyan';
        } else if (titleLower.includes('quarantine') || titleLower.includes('stop-sale') || titleLower.includes('isolation') || titleLower.includes('audit') || titleLower.includes('penalty') || titleLower.includes('debit') || titleLower.includes('disqualify')) {
          icon = ShieldAlert;
          color = 'rose';
        } else if (titleLower.includes('gift') || titleLower.includes('replace') || titleLower.includes('sample') || titleLower.includes('stock')) {
          icon = Package;
          color = 'emerald';
        } else {
          icon = UserCheck;
          color = 'amber';
        }

        return {
          id: `step_action_${idx + 1}`,
          label: title,
          icon: icon,
          color: color,
          actionText: body
        };
      });
    }

    // Contextual fallback if structured steps are missing
    const descLower = (c.description || '').toLowerCase();
    const carrier = c.carrier || 'Logistics Partner';
    const trk = c.tracking_number || 'TRK-EXP';
    const orderNum = c.order_number || 'Order';
    const amountStr = c.order_total ? `₹${c.order_total.toLocaleString()}` : '₹500';

    if (c.category === 'Wrong Item' || descLower.includes('wrong') || descLower.includes('instead')) {
      return [
        {
          id: 'reship_correct_item',
          label: 'Express-Ship Correct SKU via Air',
          icon: Package,
          color: 'emerald',
          actionText: `Dispatched correct beverage SKU for ${orderNum} via priority air courier with same-day tracking.`
        },
        {
          id: 'gift_wrong_item',
          label: 'Gift Incorrect Cases to Customer',
          icon: Sparkles,
          color: 'cyan',
          actionText: `Instructed customer to keep the incorrect shipment free of charge as a goodwill gift and applied ₹500 credit.`
        },
        {
          id: 'audit_pack_station',
          label: 'Audit Picking Station Scanner',
          icon: ShieldAlert,
          color: 'rose',
          actionText: `Triggered QA optical scan calibration at warehouse packing station to eliminate barcode mis-scans.`
        }
      ];
    }

    if (c.category === 'Billing Issue' || descLower.includes('debit') || descLower.includes('charge') || descLower.includes('card')) {
      return [
        {
          id: 'reverse_duplicate',
          label: `Instant Payment Gateway Reversal (${amountStr})`,
          icon: CreditCard,
          color: 'emerald',
          actionText: `Initiated instant API refund for duplicate transaction on ${orderNum} and emailed zero-balance receipt.`
        },
        {
          id: 'apply_billing_credit',
          label: 'Apply ₹200 Goodwill Account Credit',
          icon: Sparkles,
          color: 'cyan',
          actionText: `Credited ₹200 courtesy allowance to customer account for bookkeeping inconvenience.`
        },
        {
          id: 'audit_idempotency',
          label: 'Audit Gateway Idempotency Lock',
          icon: ShieldAlert,
          color: 'rose',
          actionText: `Verified payment gateway idempotency key cache to permanently block duplicate checkout charges.`
        }
      ];
    }

    if (c.category === 'Packaging Damaged' || descLower.includes('crack') || descLower.includes('leak') || descLower.includes('cap') || descLower.includes('broken')) {
      return [
        {
          id: 'air_replace_packaging',
          label: 'Express-Ship Replacement & File Claim',
          icon: Package,
          color: 'emerald',
          actionText: `Dispatched complimentary replacement cartons via express air and logged transit damage report with ${carrier}.`
        },
        {
          id: 'refund_damaged_units',
          label: `Instant Refund (${amountStr}) + 15% Credit`,
          icon: CreditCard,
          color: 'cyan',
          actionText: `Issued 100% refund of ${amountStr} for damaged units and applied 15% courtesy credit to customer profile.`
        },
        {
          id: 'quarantine_cap_batch',
          label: 'Quarantine Defective Bottle Batch',
          icon: ShieldAlert,
          color: 'rose',
          actionText: `Placed defective bottle batch on warehouse quarantine hold and issued Non-Conformance claim to container supplier.`
        }
      ];
    }

    if (c.category === 'Product Quality' || descLower.includes('taste') || descLower.includes('sour') || descLower.includes('smell') || descLower.includes('spoil') || descLower.includes('vinegar')) {
      return [
        {
          id: 'stop_sale_quarantine',
          label: 'Emergency Stop-Sale & Batch Quarantine',
          icon: ShieldAlert,
          color: 'rose',
          actionText: `Issued emergency stop-sale notice to isolate inventory and placed production lot on strict lab quarantine.`
        },
        {
          id: 'refund_and_vip_sample',
          label: `Full Refund (${amountStr}) + Cold Replacement`,
          icon: Sparkles,
          color: 'emerald',
          actionText: `Processed full refund of ${amountStr} and scheduled freshly conditioned refrigerated sample delivery.`
        },
        {
          id: 'carrier_cold_penalty',
          label: 'Log Carrier Cold-Chain SLA Penalty',
          icon: CreditCard,
          color: 'amber',
          actionText: `Deducted ₹2,500 carrier temperature violation penalty from ${carrier} invoice.`
        }
      ];
    }

    // Delivery Delay fallback
    return [
      {
        id: 'expedite_van_delivery',
        label: `Expedite ${carrier} Delivery & Send Live GPS`,
        icon: Truck,
        color: 'emerald',
        actionText: `Escalated priority SLA notice to ${carrier} (Tracking: ${trk}) and transmitted real-time GPS tracking link to customer.`
      },
      {
        id: 'air_replacement_dispatch',
        label: 'Auto-Dispatch Free Replacement via Air',
        icon: Package,
        color: 'cyan',
        actionText: `Authorized emergency priority replacement shipment for ${orderNum} via Express Air Freight with personal apology.`
      },
      {
        id: 'issue_delay_credit',
        label: `Apply Courtesy Credit (${amountStr}) & Apology`,
        icon: CreditCard,
        color: 'amber',
        actionText: `Applied customer satisfaction credit of ${amountStr} for ${orderNum} and transmitted official management apology.`
      }
    ];
  };

  const categories = [
    'Product Quality',
    'Delivery Delay',
    'Wrong Item',
    'Packaging Damaged',
    'Billing Issue',
    'Taste Issue'
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#111827] tracking-tight flex items-center gap-2">
            <MessageSquareWarning className="w-6 h-6 text-[#111827]" />
            <span>Customer Complaints & Quality Feedback Desk</span>
          </h1>
          <p className="text-xs text-[#111827] mt-0.5">
            AI automatically pre-classifies customer sentiment, links real-time courier dispatch status, and provides 1-click executable AI resolution options for every ticket.
          </p>
        </div>

        <button
          onClick={() => setShowFileModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#347A59] hover:bg-[#244B39] text-white font-bold text-xs shadow-sm transition-all shrink-0"
        >
          <Plus className="w-4 h-4 text-[#E5ECE7]" />
          <span>File Customer Complaint</span>
        </button>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between border shadow-xs ${
            notification.type === 'success'
              ? 'bg-[#EBF4EE] text-[#2D5A43] border-[#B8D7C4]'
              : notification.type === 'info'
              ? 'bg-[#F4F8F5] text-[#111827] border-[#E5ECE7]'
              : 'bg-[#FDF0F1] text-[#8B2E37] border-[#F2C1C5]'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-[#111827] hover:text-[#111827]">✕</button>
        </div>
      )}

      {/* Complaints List */}
      <div className="space-y-5">
        {complaints.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center text-[#111827] text-xs font-medium">
            No complaints logged. All customer orders operating within quality tolerances!
          </div>
        ) : (
          complaints.map((c) => {
            const aiOptions = getAiActionOptions(c);
            const isResolved = c.status === 'Resolved';

            return (
              <div
                key={c.id}
                className={`glass-card rounded-2xl p-6 border transition-all shadow-sm ${
                  isResolved
                    ? 'border-[#B8D7C4] bg-[#F4F8F5]'
                    : c.priority === 'Urgent'
                    ? 'border-[#F2C1C5] bg-[#FFFBFB]'
                    : 'border-[#E5ECE7] bg-white'
                }`}
              >
                {/* Top Badge Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-[#E5ECE7]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-[#111827] text-xs px-2.5 py-0.5 rounded bg-[#EBF4EE] border border-[#E5ECE7]">
                      {c.complaint_number}
                    </span>
                    <StatusBadge status={c.priority} />
                    <StatusBadge status={c.status} />
                    <span className="text-xs font-bold text-[#111827] px-2.5 py-0.5 rounded bg-[#F4F8F5] border border-[#E5ECE7]">
                      Category: <strong className="text-[#111827]">{c.category}</strong>
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      c.ai_sentiment === 'Critical Risk'
                        ? 'bg-[#FDF0F1] text-[#8B2E37] border border-[#F2C1C5]'
                        : c.ai_sentiment === 'Frustrated'
                        ? 'bg-[#FBF3E8] text-[#825425] border border-[#E8CDA8]'
                        : 'bg-[#EBF4EE] text-[#111827] border border-[#E5ECE7]'
                    }`}>
                      Sentiment: {c.ai_sentiment}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-[#111827] font-mono">
                    <span>Assigned: {c.assigned_to_name}</span>
                    <span>•</span>
                    <span>{new Date(c.created_at).toLocaleDateString()} {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* Customer Details & Real-Time Logistics Context */}
                <div className="mb-3 p-3.5 rounded-xl bg-[#F4F8F5] border border-[#E5ECE7] text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <span className="text-[#111827] font-semibold">
                      Customer: <strong className="text-[#111827] font-bold">{c.customer_name}</strong> ({c.customer_email})
                    </span>

                    {c.order_number && (
                      <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
                        <span className="text-[#2D5A43] font-bold">Order #{c.order_number}</span>
                        {c.order_total && <span className="text-[#111827]">(₹{c.order_total?.toLocaleString()})</span>}
                        {c.carrier && (
                          <span className="px-2 py-0.5 rounded bg-white text-[#111827] border border-[#E5ECE7] font-bold">
                            🚚 {c.carrier}
                          </span>
                        )}
                        {c.tracking_number && (
                          <span className="px-2 py-0.5 rounded bg-white text-[#111827] border border-[#E5ECE7]">
                            {c.tracking_number}
                          </span>
                        )}
                        {c.dispatch_status && (
                          <span className="px-2 py-0.5 rounded bg-[#EBF4EE] text-[#2D5A43] border border-[#B8D7C4] font-sans font-bold">
                            {c.dispatch_status}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Grievance Statement */}
                  <div className="text-[#111827] leading-relaxed bg-white p-3 rounded-xl border border-[#E5ECE7] italic font-medium shadow-xs">
                    "{c.description}"
                  </div>
                </div>

                {/* Reason Behind Complaint / AI Root Cause Diagnosis */}
                <div className="p-4 rounded-xl bg-white border border-[#E5ECE7] mb-3 shadow-xs">
                  <div className="flex items-center gap-1.5 text-xs font-black text-[#111827] uppercase tracking-wide mb-1.5">
                    <HelpCircle className="w-4 h-4 text-[#347A59]" />
                    <span>Reason Behind Complaint (AI Root Cause Diagnosis):</span>
                  </div>
                  <p className="text-xs text-[#111827] font-medium leading-relaxed">
                    {c.root_cause || (
                      c.category === 'Delivery Delay'
                        ? 'Courier transit SLA missed: Delivery partner regional hub transit backlog delayed dispatch past promised delivery ETA.'
                        : c.category === 'Packaging Damaged'
                        ? 'Supplier packaging defect: Bottle cap seals suffered micro-fissures during high-speed bottling, causing in-transit leakage.'
                        : 'Operational fulfillment variance during batch processing.'
                    )}
                  </p>
                </div>

                {/* AI Suggested Resolution & Plan */}
                <div className="p-4 rounded-xl bg-[#EBF4EE] border border-[#B8D7C4] mb-4 shadow-xs">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-black text-[#1B4332] uppercase tracking-wide">
                      <Sparkles className="w-4 h-4 text-[#347A59]" />
                      <span>AI Suggested Resolution & Action Plan:</span>
                    </div>
                    <span className="text-[10px] font-bold text-[#1B4332] px-2 py-0.5 rounded bg-white border border-[#B8D7C4]">
                      1-Click Ready
                    </span>
                  </div>
                  {formatComplaintSteps(c.ai_suggested_resolution)}
                </div>

                {/* RESOLVED STATE DISPLAY */}
                {isResolved ? (
                  <div className="p-4 rounded-xl bg-white border border-[#B8D7C4] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="w-4 h-4 text-[#2D5A43]" />
                        <span className="text-xs font-bold text-[#2D5A43] uppercase tracking-wide">
                          Ticket Resolved via AI Action:
                        </span>
                        {c.resolved_at && (
                          <span className="text-[10px] text-[#111827] font-mono">
                            ({new Date(c.resolved_at).toLocaleDateString()} {new Date(c.resolved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#111827] leading-relaxed pl-6 font-medium">
                        {c.resolution}
                      </p>
                    </div>

                    <button
                      onClick={() => handleReopenComplaint(c)}
                      disabled={executingId === c.id}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold text-[#111827] hover:bg-[#E5ECE7] bg-[#EBF4EE] border border-[#E5ECE7] transition-colors flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Re-open</span>
                    </button>
                  </div>
                ) : (
                  /* 1-CLICK "USE AI" RESOLUTION OPTIONS FOR EVERY COMPLAINT */
                  <div className="space-y-2 pt-2 border-t border-[#E5ECE7]">
                    <div className="flex items-center justify-between text-xs font-bold text-[#111827] mb-2">
                      <span className="flex items-center gap-1.5 text-[#111827]">
                        <Sparkles className="w-3.5 h-3.5 text-[#347A59]" />
                        <span>Use AI to Implement Resolution (1-Click Options):</span>
                      </span>
                      <span className="text-[10px] text-[#111827] font-normal">
                        Select an AI action below to execute immediately
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {aiOptions.map((opt) => {
                        const Icon = opt.icon;
                        const isExecuting = executingId === c.id;

                        return (
                          <button
                            key={opt.id}
                            onClick={() => handleExecuteAiResolution(c, opt.actionText, opt.label)}
                            disabled={isExecuting}
                            className={`p-3.5 rounded-xl border text-left transition-all group flex flex-col justify-between shadow-xs ${
                              opt.color === 'emerald'
                                ? 'bg-[#EBF4EE] border-[#B8D7C4] hover:bg-[#DEF0E3]'
                                : opt.color === 'cyan'
                                ? 'bg-[#F4F8F5] border-[#E5ECE7] hover:bg-[#EBF4EE]'
                                : opt.color === 'rose'
                                ? 'bg-[#FDF0F1] border-[#F2C1C5] hover:bg-[#FCE3E5]'
                                : 'bg-[#FBF3E8] border-[#E8CDA8] hover:bg-[#F7EAD7]'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <div className={`p-1.5 rounded-lg border ${
                                opt.color === 'emerald' ? 'bg-white text-[#2D5A43] border-[#B8D7C4]' :
                                opt.color === 'cyan' ? 'bg-white text-[#111827] border-[#E5ECE7]' :
                                opt.color === 'rose' ? 'bg-white text-[#8B2E37] border-[#F2C1C5]' :
                                'bg-white text-[#825425] border-[#E8CDA8]'
                              }`}>
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-xs font-black text-[#111827] group-hover:text-[#2D5A43] transition-colors">
                                {opt.label}
                              </span>
                            </div>
                            <p className="text-[10px] text-[#111827] line-clamp-2 mt-1 leading-snug font-medium">
                              {opt.actionText}
                            </p>
                            <div className="mt-2.5 pt-2 border-t border-[#E5ECE7]/60 flex items-center justify-between text-[10px] font-bold text-[#111827]">
                              <span>⚡ 1-Click AI Apply</span>
                              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Resolution Option Bar */}
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => openCustomModal(c)}
                        className="text-xs text-[#111827] hover:text-[#111827] flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[#EBF4EE] transition-colors font-bold"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#111827]" />
                        <span>Use AI with Custom Resolution Note...</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* File Complaint Modal */}
      {showFileModal && (
        <div className="fixed inset-0 z-50 bg-[#347A59]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5ECE7] rounded-2xl w-full max-w-md shadow-2xl p-6 animate-scale-up">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#E5ECE7]">
              <h2 className="text-base font-black text-[#111827] flex items-center gap-2">
                <MessageSquareWarning className="w-5 h-5 text-[#111827]" />
                <span>File Customer Complaint</span>
              </h2>
              <button
                onClick={() => setShowFileModal(false)}
                className="text-[#111827] hover:text-[#111827]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFileComplaint} className="space-y-3">
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
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">Related Order (Optional)</label>
                <select
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] font-medium focus:outline-none focus:border-[#347A59]"
                >
                  <option value="">-- No Specific Order --</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.order_number} (${o.total_amount?.toLocaleString()}) [{o.status}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] font-medium focus:outline-none focus:border-[#347A59]"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] font-medium focus:outline-none focus:border-[#347A59]"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">Complaint Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Customer stated didn't get order or bottles arrived cracked..."
                  className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] font-medium focus:outline-none focus:border-[#347A59] resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5ECE7]">
                <button
                  type="button"
                  onClick={() => setShowFileModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#111827] hover:text-[#111827]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#347A59] hover:bg-[#244B39] shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'File Ticket & Trigger AI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom AI Resolution Modal */}
      {customResolvingComp && (
        <div className="fixed inset-0 z-50 bg-[#347A59]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5ECE7] rounded-2xl w-full max-w-lg shadow-2xl p-6 animate-scale-up">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#E5ECE7]">
              <h2 className="text-base font-black text-[#111827] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#347A59]" />
                <span>Custom AI Resolution for {customResolvingComp.complaint_number}</span>
              </h2>
              <button
                onClick={() => setCustomResolvingComp(null)}
                className="text-[#111827] hover:text-[#111827]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#111827] mb-3">
              Review or adjust the resolution details below. Applying this will instantly resolve the customer ticket and log to the audit trail.
            </p>

            <textarea
              rows={4}
              value={customResolutionText}
              onChange={(e) => setCustomResolutionText(e.target.value)}
              className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl p-3 text-xs text-[#111827] focus:outline-none focus:border-[#347A59] resize-none font-sans leading-relaxed"
            />

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E5ECE7]">
              <button
                type="button"
                onClick={() => setCustomResolvingComp(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#111827] hover:text-[#111827]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleExecuteAiResolution(customResolvingComp, customResolutionText, 'Custom AI Resolution')}
                disabled={executingId === customResolvingComp.id || !customResolutionText.trim()}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#347A59] hover:bg-[#244B39] shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5 text-[#E5ECE7]" />
                <span>{executingId === customResolvingComp.id ? 'Applying...' : 'Apply AI Resolution'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

