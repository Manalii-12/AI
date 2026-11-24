import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  ShoppingCart,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  Truck,
  MessageSquareWarning,
  Users,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Filter
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import DailyBriefingCard from '../components/DailyBriefingCard';
import { getDashboardMetrics, getDailyBriefing } from '../api';

const COLORS = ['#347A59', '#83B89A', '#244B39', '#DCEFE3', '#4A9B73', '#647568'];

export default function Dashboard({ onNavigateTo, onSelectInsight }) {
  const [range, setRange] = useState('30d');
  const [data, setData] = useState(null);
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async (selectedRange) => {
    setLoading(true);
    try {
      const [metricsRes, briefingRes] = await Promise.all([
        getDashboardMetrics(selectedRange),
        getDailyBriefing()
      ]);
      setData(metricsRes.data);
      setBriefing(briefingRes.data);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics(range);
  }, [range]);

  const metrics = data?.metrics || {};

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar: Title & Date Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#111827] tracking-tight">Executive Operations Dashboard</h1>
          <p className="text-xs text-[#111827] mt-0.5">
            Real-time business performance calculated directly from transactional database records.
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-1 bg-[#FFFFFF] p-1 rounded-xl border border-[#E5ECE7] shadow-xs">
          <Filter className="w-3.5 h-3.5 text-[#111827] ml-2" />
          {[
            { id: 'today', label: 'Today' },
            { id: '7d', label: 'Last 7 Days' },
            { id: '30d', label: 'Last 30 Days' },
            { id: 'all', label: 'All Time' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setRange(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                range === item.id
                  ? 'bg-[#347A59] text-white shadow-xs'
                  : 'text-[#111827] hover:text-[#111827]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Proactive AI Daily Briefing & Live Update */}
      <DailyBriefingCard
        initialBriefing={briefing}
        onUpdateComplete={(newB) => {
          setBriefing(newB);
          fetchMetrics(range);
        }}
        onNavigateTo={onNavigateTo}
      />

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={`₹${(metrics.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          subtitle="Revenue generated in filter range"
          trend="+14.2%"
          icon={DollarSign}
          color="emerald"
          onClick={() => onNavigateTo('payments')}
        />
        <StatCard
          title="Fulfillment Orders"
          value={`${metrics.pending_orders || 0} Pending`}
          subtitle={`${metrics.completed_orders || 0} Delivered / ${metrics.cancelled_orders || 0} Cancelled`}
          icon={ShoppingCart}
          color="blue"
          onClick={() => onNavigateTo('orders')}
        />
        <StatCard
          title="Outstanding Receivables"
          value={`₹${(metrics.total_outstanding_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          subtitle={`${metrics.pending_payments_count || 0} Unpaid / Failed orders`}
          icon={AlertTriangle}
          color="rose"
          alert={metrics.total_outstanding_amount > 500}
          onClick={() => onNavigateTo('payments')}
        />
        <StatCard
          title="Inventory Availability"
          value={`${metrics.inventory_availability_pct || 0}%`}
          subtitle={`${metrics.low_stock_count || 0} Low Stock / ${metrics.out_of_stock_count || 0} Out of Stock`}
          icon={Package}
          color="amber"
          alert={metrics.out_of_stock_count > 0}
          onClick={() => onNavigateTo('inventory')}
        />
      </div>

      {/* Secondary Operations Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Delayed Dispatches"
          value={`${metrics.delayed_dispatches_count || 0} Overdue`}
          subtitle="Shipments past delivery ETA"
          icon={Truck}
          color="rose"
          alert={metrics.delayed_dispatches_count > 0}
          onClick={() => onNavigateTo('dispatch')}
        />
        <StatCard
          title="Open Complaints"
          value={`${metrics.open_complaints_count || 0} Active`}
          subtitle="Customer tickets awaiting resolution"
          icon={MessageSquareWarning}
          color="purple"
          alert={metrics.open_complaints_count > 0}
          onClick={() => onNavigateTo('complaints')}
        />
        <StatCard
          title="Customer Accounts"
          value={`${metrics.total_customers || 0} Accounts`}
          subtitle={`${metrics.new_customers_30d || 0} new clients added this month`}
          icon={Users}
          color="cyan"
          onClick={() => onNavigateTo('customers')}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue & Orders Trend Chart */}
        <div className="glass-card rounded-2xl p-6 lg:col-span-2 border border-[#E5ECE7] bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5ECE7]">
            <div>
              <h3 className="text-sm font-black text-[#111827] uppercase tracking-wider">Revenue & Order Trends</h3>
              <p className="text-xs text-[#111827]">7-Day operational revenue and completed volume</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-[#347A59] font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-[#347A59]"></span> Revenue (₹)
              </span>
              <span className="flex items-center gap-1.5 text-[#83B89A] font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-[#83B89A]"></span> Orders Count
              </span>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.revenue_trends || []}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#347A59" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#347A59" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5ECE7" opacity={0.8} />
                <XAxis dataKey="date" stroke="#647568" fontSize={11} tickLine={false} />
                <YAxis stroke="#647568" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E5ECE7',
                    color: '#244B39',
                    borderRadius: '12px',
                    fontSize: '12px',
                    boxShadow: '0 4px 20px -2px rgba(36, 75, 57, 0.12)'
                  }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#347A59" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="orders" stroke="#83B89A" strokeWidth={2} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Revenue Distribution */}
        <div className="glass-card rounded-2xl p-6 border border-[#E5ECE7] bg-white shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-[#111827] uppercase tracking-wider">Category Revenue</h3>
            <p className="text-xs text-[#111827] mb-4">Breakdown by beverage product line</p>
          </div>

          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.category_distribution || []}
                  dataKey="revenue"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  innerRadius={45}
                  paddingAngle={4}
                >
                  {(data?.category_distribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E5ECE7',
                    color: '#244B39',
                    borderRadius: '12px',
                    fontSize: '12px',
                    boxShadow: '0 4px 20px -2px rgba(36, 75, 57, 0.12)'
                  }}
                  formatter={(val) => `₹${val.toLocaleString()}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-[#E5ECE7] text-[11px]">
            {(data?.category_distribution || []).map((cat, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                <span className="text-[#111827] font-bold truncate">{cat.category}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Low Stock Watchlist */}
      {data?.low_stock_preview && data.low_stock_preview.length > 0 && (
        <div className="glass-card rounded-2xl p-6 border border-[#E5ECE7] bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5ECE7]">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#FFF6E9] border border-[#F2D7B2] text-[#825425]">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-black text-[#111827]">Critical Stock Watchlist</h3>
                <p className="text-xs text-[#111827]">Products operating below minimum reorder thresholds</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTo('inventory')}
              className="text-xs font-bold text-[#111827] hover:text-[#347A59] flex items-center gap-1 bg-[#FFFFFF] hover:bg-[#F4F8F5] px-3 py-1.5 rounded-xl border border-[#E5ECE7] transition-colors"
            >
              <span>Manage Inventory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {data.low_stock_preview.map((p) => (
              <div key={p.sku} className="p-3.5 rounded-xl bg-[#F4F8F5] border border-[#E5ECE7] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#111827] truncate max-w-[150px]">{p.name}</p>
                  <p className="text-[10px] text-[#111827] font-mono">{p.sku}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-black ${p.available <= 5 ? 'text-[#8B2E37]' : 'text-[#825425]'}`}>
                    {p.available} left
                  </span>
                  <p className="text-[10px] text-[#111827]">Min: {p.reorder_level}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

