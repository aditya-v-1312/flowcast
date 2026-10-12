import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  AlertCircle,
  Clock,
  CheckCircle2,
  TrendingUp,
  FileText,
  Plus,
  RefreshCw,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../api/client.js';
import { IDashboardAnalytics, IInvoice } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<IDashboardAnalytics | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<IInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, invRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/invoices'),
      ]);
      setData(statsRes.data);
      setRecentInvoices(invRes.data.invoices.slice(0, 5));
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleSyncDelays = async () => {
    try {
      setSyncing(true);
      await api.post('/analytics/sync-reliability');
      await api.post('/analytics/trigger-cron-check');
      await fetchDashboardData();
    } catch (err) {
      console.error('Failed to sync', err);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const summary = data?.summary || {
    totalInvoiced: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    overdueAmount: 0,
    totalInvoicesCount: 0,
    paidCount: 0,
    overdueCount: 0,
    draftCount: 0,
  };

  const currency = user?.currency === 'USD' ? '$' : user?.currency || '₹';

  const revenueTrend = data?.revenueTrend?.length
    ? data.revenueTrend
    : [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Financial Health & Cash Flow
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time revenue monitoring and predictive cash flow runway.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSyncDelays}
            disabled={syncing}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition"
            title="Recalculate client delay metrics & check overdue invoices"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Data & Delays'}</span>
          </button>
          <Link
            to="/invoices/new"
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Invoice</span>
          </Link>
        </div>
      </div>

      {/* Overdue Warning Callout if any */}
      {summary.overdueCount > 0 && (
        <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ShieldAlert className="w-6 h-6 text-rose-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-rose-200">
                Action Required: {summary.overdueCount} Invoice{summary.overdueCount > 1 ? 's' : ''} Overdue
              </p>
              <p className="text-xs text-rose-300/80">
                Total overdue balance: {currency} {summary.overdueAmount.toLocaleString()}. Follow up with clients to maintain stable cash flow.
              </p>
            </div>
          </div>
          <Link
            to="/invoices?status=OVERDUE"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 transition"
          >
            Review Overdue
          </Link>
        </div>
      )}

      {/* 4 Core KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Outstanding */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Outstanding
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-3">
            {currency} {summary.totalOutstanding.toLocaleString()}
          </p>
          <div className="flex items-center space-x-1.5 mt-2 text-xs text-slate-400">
            <span>Awaiting payment settlement</span>
          </div>
        </div>

        {/* Total Collected */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Collected Earnings
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-3">
            {currency} {summary.totalCollected.toLocaleString()}
          </p>
          <div className="flex items-center space-x-1.5 mt-2 text-xs text-slate-400">
            <span>{summary.paidCount} invoices settled in full</span>
          </div>
        </div>

        {/* Overdue Balance */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Overdue Balance
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-400 mt-3">
            {currency} {summary.overdueAmount.toLocaleString()}
          </p>
          <div className="flex items-center space-x-1.5 mt-2 text-xs text-slate-400">
            <span>{summary.overdueCount} invoices past due</span>
          </div>
        </div>

        {/* Estimated Tax Liability */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Est. Tax Reserve
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-purple-300 mt-3">
            {currency} {data?.taxSummary?.totalTaxCollected?.toLocaleString() || '0'}
          </p>
          <div className="flex items-center space-x-1.5 mt-2 text-xs text-slate-400">
            <span>Aggregated tax liabilities</span>
          </div>
        </div>
      </div>

      {/* Revenue Trend Area Chart */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Monthly Collected Revenue
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Historical revenue collected over the trailing 6 months
            </p>
          </div>
          <Link
            to="/forecast"
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition"
          >
            <span>View Predictive Forecast</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="h-64 w-full">
          {revenueTrend.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-950/40 rounded-lg border border-slate-800/60">
              <TrendingUp className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-300">No collected revenue recorded yet</p>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Once payments are recorded on your invoices, your monthly earnings graph will appear here.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="_id" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `₹${val}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [`${currency} ${val}`, 'Collected Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#revenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-bold text-white">Recent Invoices</h2>
          </div>
          <Link
            to="/invoices"
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
          >
            View All Invoices &rarr;
          </Link>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No invoices generated yet. Create your first invoice!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-xs text-slate-400 uppercase border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3">Invoice #</th>
                  <th className="px-5 py-3">Client</th>
                  <th className="px-5 py-3">Due Date</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Balance</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentInvoices.map((inv) => {
                  const clientName =
                    typeof inv.clientId === 'object' && inv.clientId !== null
                      ? inv.clientId.name
                      : 'Unknown Client';

                  const statusColors: Record<string, string> = {
                    PAID: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                    SENT: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                    VIEWED: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                    OVERDUE: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                    DRAFT: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
                    PARTIAL: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                  };

                  return (
                    <tr key={inv._id} className="hover:bg-slate-800/40 transition">
                      <td className="px-5 py-3.5 font-semibold text-white">
                        <Link to={`/invoices/${inv._id}`} className="hover:underline">
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-slate-300">{clientName}</td>
                      <td className="px-5 py-3.5 text-slate-400">
                        {new Date(inv.dueDate).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-white">
                        {inv.currency} {inv.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-200">
                        {inv.currency} {inv.balanceDue.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${
                            statusColors[inv.status] || 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          to={`/invoices/${inv._id}`}
                          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                        >
                          View &rarr;
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
