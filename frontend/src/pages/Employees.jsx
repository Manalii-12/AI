import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  Lock,
  Eye,
  CheckCircle,
  FileText
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { getEmployees, getAuditLogs } from '../api';

export default function Employees({ activeRole, setActiveRole }) {
  const [employees, setEmployees] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [empRes, logRes] = await Promise.all([
          getEmployees(),
          getAuditLogs(50)
        ]);
        setEmployees(empRes.data);
        setAuditLogs(logRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    loadData();
  }, []);

  const rolePermissions = {
    'Owner/Admin': ['Full Administrative Control', 'AI Action Authorization', 'All Module CRUD', 'Financial Auditing'],
    'Operations Manager': ['Order Dispatch Fulfillment', 'Carrier SLA Escalation', 'Quality Complaint Resolution'],
    'Inventory Manager': ['Stock Adjustment Ledger', 'Purchase Order Drafts', 'Warehouse Inbound Processing'],
    'Sales Employee': ['Order Creation', 'Customer Account Directory', 'View Product Catalog'],
    'Customer Support': ['Complaint Management', 'Customer Communication', 'Delivery Status Lookup']
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[#EBF4EE] border border-[#E5ECE7] text-[#111827]">
            <ShieldCheck className="w-6 h-6 text-[#347A59]" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#111827] tracking-tight">Role-Based Access & System Audit Trails</h1>
            <p className="text-xs text-[#111827] mt-0.5">
              Enterprise role permissions and automated audit logging across all operational modules.
            </p>
          </div>
        </div>
      </div>

      {/* Owner/Admin Executive Profile Card */}
      <div className="bg-white rounded-2xl p-6 border border-[#E5ECE7] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5ECE7]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#347A59] flex items-center justify-center text-[#F4F8F5] font-bold text-lg shadow-md">
              AM
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-[#111827]">Aarav Mehta</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#EBF4EE] text-[#111827] text-[10px] font-bold border border-[#E5ECE7]">
                  Role: Owner/Admin
                </span>
              </div>
              <p className="text-xs text-[#111827] mt-0.5">Founder & Chief Executive Officer — Full System Authority</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#111827] font-semibold bg-[#F4F8F5] px-3 py-1.5 rounded-xl border border-[#E5ECE7]">
            <ShieldCheck className="w-4 h-4 text-[#347A59]" />
            <span>Unrestricted Executive Privileges</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 text-xs">
          <div className="p-3 rounded-xl bg-[#F4F8F5] border border-[#E5ECE7]">
            <p className="font-bold text-[#111827] mb-1">👑 Full Administrative Control</p>
            <p className="text-[11px] text-[#111827]">All module CRUD, database writes, and platform configuration access.</p>
          </div>
          <div className="p-3 rounded-xl bg-[#F4F8F5] border border-[#E5ECE7]">
            <p className="font-bold text-[#111827] mb-1">⚡ Autonomous AI Approvals</p>
            <p className="text-[11px] text-[#111827]">1-click safe authorization for POs, dispatches, and dunning workflows.</p>
          </div>
          <div className="p-3 rounded-xl bg-[#F4F8F5] border border-[#E5ECE7]">
            <p className="font-bold text-[#111827] mb-1">💳 Financial & Ledger Auditing</p>
            <p className="text-[11px] text-[#111827]">Full revenue recognition, payment reconciliation, and ledger statements.</p>
          </div>
          <div className="p-3 rounded-xl bg-[#F4F8F5] border border-[#E5ECE7]">
            <p className="font-bold text-[#111827] mb-1">🔮 What-If Strategic Simulation</p>
            <p className="text-[11px] text-[#111827]">Stress-test demand spikes, supplier lead times, and pricing elasticity.</p>
          </div>
        </div>
      </div>

      {/* Staff Directory Table */}
      <div className="bg-white rounded-2xl border border-[#E5ECE7] p-6 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">Hugg Beverages Staff Directory</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E5ECE7] bg-[#EBF4EE]/50 text-[#111827] font-bold">
                <th className="p-3">Employee Name</th>
                <th className="p-3">Email Address</th>
                <th className="p-3">Assigned Role</th>
                <th className="p-3">Status</th>
                <th className="p-3">Member Since</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5ECE7]/60 font-medium">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-[#F4F8F5] transition-colors">
                  <td className="p-3 font-bold text-[#111827]">{emp.full_name}</td>
                  <td className="p-3 text-[#111827] font-mono text-[11px]">{emp.email}</td>
                  <td className="p-3 text-[#111827] font-semibold">{emp.role}</td>
                  <td className="p-3">
                    <StatusBadge status="Active" />
                  </td>
                  <td className="p-3 text-[#111827] text-[11px]">
                    {new Date(emp.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Audit Log */}
      <div className="bg-white rounded-2xl border border-[#E5ECE7] p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#347A59]" />
          <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">
            System Activity & Audit Logs
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E5ECE7] bg-[#EBF4EE]/50 text-[#111827] font-bold">
                <th className="p-3">Timestamp</th>
                <th className="p-3">User</th>
                <th className="p-3">Role</th>
                <th className="p-3">Module</th>
                <th className="p-3">Action</th>
                <th className="p-3">Activity Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5ECE7]/60 font-medium">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#F4F8F5] transition-colors">
                  <td className="p-3 text-[#111827] font-mono text-[11px]">
                    {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-3 font-bold text-[#111827]">{log.user_name}</td>
                  <td className="p-3 text-[#111827]">{log.user_role}</td>
                  <td className="p-3 text-[#111827] font-semibold">{log.module}</td>
                  <td className="p-3 font-mono text-[10px] text-[#111827]">{log.action}</td>
                  <td className="p-3 text-[#111827] max-w-md truncate">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
