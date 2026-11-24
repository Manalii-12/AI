import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  UserCheck,
  CreditCard,
  AlertTriangle,
  Clock,
  Plus
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { getCustomers, createCustomer } from '../api';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [segmentFilter, setSegmentFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [creditLimit, setCreditLimit] = useState(5000);
  const [submitting, setSubmitting] = useState(false);

  const loadCustomers = async () => {
    try {
      const res = await getCustomers({
        segment: segmentFilter || undefined,
        search: search || undefined
      });
      setCustomers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [segmentFilter, search]);

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createCustomer({
        name,
        email,
        phone,
        city,
        credit_limit: parseFloat(creditLimit)
      });
      setShowAddModal(false);
      setName('');
      setEmail('');
      setPhone('');
      setCity('');
      await loadCustomers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to add customer');
    } finally {
      setSubmitting(false);
    }
  };

  const segments = ['VIP', 'Regular', 'New', 'At Risk', 'Inactive'];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#111827] tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-[#111827]" />
            <span>Customer Accounts & RFM Intelligence</span>
          </h1>
          <p className="text-xs text-[#111827] mt-0.5">
            Automated segment classification: VIP, Repeat, Inactive, and At Risk accounts with credit limit monitoring.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#347A59] hover:bg-[#244B39] text-white font-bold text-xs shadow-sm transition-all"
        >
          <Plus className="w-4 h-4 text-[#E5ECE7]" />
          <span>Add Customer Account</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card rounded-2xl p-4 border border-[#E5ECE7] bg-white shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#111827] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#111827] placeholder-[#647568] focus:outline-none focus:border-[#347A59]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setSegmentFilter('')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              segmentFilter === '' ? 'bg-[#347A59] text-white shadow-xs' : 'text-[#111827] hover:text-[#111827]'
            }`}
          >
            All Accounts
          </button>
          {segments.map((s) => (
            <button
              key={s}
              onClick={() => setSegmentFilter(s)}
              className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                segmentFilter === s ? 'bg-[#347A59] text-white shadow-xs' : 'text-[#111827] hover:text-[#111827]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Customers Table */}
      <div className="glass-card rounded-2xl border border-[#E5ECE7] bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E5ECE7] bg-[#F4F8F5] text-[#111827] font-bold">
                <th className="p-4">Customer Name & Contact</th>
                <th className="p-4">Location</th>
                <th className="p-4">Segment</th>
                <th className="p-4">Lifetime Orders</th>
                <th className="p-4">Total Spend</th>
                <th className="p-4">Outstanding Balance</th>
                <th className="p-4">Complaints</th>
                <th className="p-4">Last Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5ECE7]/60 font-medium">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-[#F4F8F5] transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-[#111827]">{c.name}</p>
                    <p className="text-[10px] text-[#111827]">{c.email} • {c.phone || 'No phone'}</p>
                  </td>
                  <td className="p-4 text-[#111827]">{c.city || 'N/A'}</td>
                  <td className="p-4">
                    <StatusBadge status={c.segment} />
                  </td>
                  <td className="p-4 text-[#111827] font-mono font-bold">
                    {c.total_orders}
                  </td>
                  <td className="p-4 font-mono font-bold text-[#2D5A43]">
                    ${c.total_spent?.toLocaleString()}
                  </td>
                  <td className="p-4">
                    {c.outstanding_balance > 0 ? (
                      <span className="font-mono font-bold text-[#8B2E37]">
                        ${c.outstanding_balance?.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-[#111827] font-mono">₹0.00</span>
                    )}
                  </td>
                  <td className="p-4">
                    {c.complaint_count > 0 ? (
                      <span className="text-[#825425] font-bold">{c.complaint_count} ticket(s)</span>
                    ) : (
                      <span className="text-[#111827]">0</span>
                    )}
                  </td>
                  <td className="p-4 text-[11px] text-[#111827]">
                    {c.last_order_date ? new Date(c.last_order_date).toLocaleDateString() : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-[#347A59]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5ECE7] rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h2 className="text-base font-black text-[#111827] mb-4">Register Customer Account</h2>

            <form onSubmit={handleAddCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">Company / Individual Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] font-medium focus:outline-none focus:border-[#347A59]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] font-medium focus:outline-none focus:border-[#347A59]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] font-medium focus:outline-none focus:border-[#347A59]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] font-medium focus:outline-none focus:border-[#347A59]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111827] mb-1">Credit Limit (₹)</label>
                <input
                  type="number"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  className="w-full bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] font-medium focus:outline-none focus:border-[#347A59]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5ECE7]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#111827] hover:text-[#111827]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#347A59] hover:bg-[#244B39] text-white font-bold text-xs shadow-sm"
                >
                  {submitting ? 'Adding...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

