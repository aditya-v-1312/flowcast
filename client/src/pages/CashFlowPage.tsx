import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Sliders,
  DollarSign,
  AlertTriangle,
  Calendar,
  Layers,
  ArrowRight,
  Plus,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import api from '../api/client.js';
import { ICashFlowForecast, IRecurringExpense } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';

export const CashFlowPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<ICashFlowForecast | null>(null);
  const [expenses, setExpenses] = useState<IRecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);

  // Scenario Simulator state
  const [simulationDelayDays, setSimulationDelayDays] = useState<number>(0);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [newExpenseTitle, setNewExpenseTitle] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseCategory, setNewExpenseCategory] = useState('SOFTWARE');

  const fetchForecast = async () => {
    try {
      setLoading(true);
      const [forecastRes, expensesRes] = await Promise.all([
        api.get('/analytics/cashflow'),
        api.get('/expenses'),
      ]);
      setData(forecastRes.data);
      setExpenses(expensesRes.data.expenses);
    } catch (err) {
      console.error('Failed to load forecast data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseTitle || !newExpenseAmount) return;

    try {
      await api.post('/expenses', {
        title: newExpenseTitle,
        amount: Number(newExpenseAmount),
        frequency: 'MONTHLY',
        billingDayOfMonth: 1,
        category: newExpenseCategory,
      });
      setNewExpenseTitle('');
      setNewExpenseAmount('');
      setShowExpenseModal(false);
      fetchForecast();
    } catch (err) {
      console.error('Failed to add expense', err);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await api.delete(`/expenses/${id}`);
      fetchForecast();
    } catch (err) {
      console.error('Failed to delete expense', err);
    }
  };

  // Dynamically recalculate bucket inflows & cumulative runway carryover starting with payments already collected
  const { simulatedProjections, delayedBeyond90, totalPaymentsCollected, totalInvoicedAmount } = React.useMemo(() => {
    if (!data?.projections) {
      return {
        simulatedProjections: [],
        delayedBeyond90: 0,
        totalPaymentsCollected: 0,
        totalInvoicedAmount: 0,
      };
    }

    const totalPaymentsCollected = data.totalCollected ?? (
      (data.projectedInvoices || []).reduce((acc, inv) => acc + (inv.amountPaid || 0), 0)
    );

    const totalInvoicedAmount = (data.projectedInvoices || []).reduce(
      (acc, inv) => acc + (inv.totalAmount || inv.balanceDue + (inv.amountPaid || 0)),
      0
    );

    const now = Date.now();
    const d30 = now + 30 * 24 * 60 * 60 * 1000;
    const d60 = now + 60 * 24 * 60 * 60 * 1000;
    const d90 = now + 90 * 24 * 60 * 60 * 1000;

    let simInflow30 = 0;
    let simInflow60 = 0;
    let simInflow90 = 0;
    let delayedBeyond90 = 0;

    (data.projectedInvoices || []).forEach((inv) => {
      const baseDate = new Date(inv.adjustedPaymentDate || inv.originalDueDate).getTime();
      const simArrivalDate = baseDate + simulationDelayDays * 24 * 60 * 60 * 1000;

      if (simArrivalDate <= d30) {
        simInflow30 += inv.balanceDue;
      } else if (simArrivalDate <= d60) {
        simInflow60 += inv.balanceDue;
      } else if (simArrivalDate <= d90) {
        simInflow90 += inv.balanceDue;
      } else {
        delayedBeyond90 += inv.balanceDue;
      }
    });

    // Carry forward cash runway cumulatively across periods, starting with payments already collected
    let runningCash = totalPaymentsCollected;

    const simulatedProjections = data.projections.map((p) => {
      let inflow = 0;
      if (p.period.includes('0-30')) inflow = simInflow30;
      else if (p.period.includes('31-60')) inflow = simInflow60;
      else if (p.period.includes('61-90')) inflow = simInflow90;

      const roundedInflow = Math.round(inflow);
      const periodNet = roundedInflow - p.recurringExpenses;
      const openingCash = runningCash;
      runningCash = runningCash + periodNet;
      const cumulativeRunway = runningCash;

      return {
        ...p,
        simulatedInflow: roundedInflow,
        simulatedNet: periodNet,
        openingCash,
        cumulativeRunway,
      };
    });

    return {
      simulatedProjections,
      delayedBeyond90,
      totalPaymentsCollected,
      totalInvoicedAmount,
    };
  }, [data, simulationDelayDays]);

  const totalProjectedReceivables = (data?.projectedInvoices || []).reduce(
    (acc, inv) => acc + inv.balanceDue,
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const currency = user?.currency === 'USD' ? '$' : user?.currency || '₹';

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
            Predictive Cash Flow Forecast
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Projects upcoming cash flow by offsetting invoice due dates with real-world client payment delays.
          </p>
        </div>

        <button
          onClick={() => setShowExpenseModal(true)}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>Manage Expenses</span>
        </button>
      </div>

      {/* Interactive "What-If" Scenario Simulator Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
              <Sliders className="w-3.5 h-3.5" /> What-If Runway Simulator
            </span>
            <h2 className="text-base font-bold text-white">Stress-Test Your Financial Runway</h2>
            <p className="text-xs text-slate-400 max-w-xl">
              Drag the slider to test how delayed client settlements would impact your net cash position across upcoming billing cycles.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 w-full md:w-80 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">Simulated Extra Delay:</span>
              <span className="font-bold text-emerald-400">+{simulationDelayDays} Days</span>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              step="5"
              value={simulationDelayDays}
              onChange={(e) => setSimulationDelayDays(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>On-Time</span>
              <span>+15d</span>
              <span>+30d</span>
              <span>+45d</span>
              <span>+60d Risk</span>
            </div>
            {delayedBeyond90 > 0 && (
              <div className="pt-2 border-t border-slate-800 flex items-center gap-1.5 text-[11px] text-amber-400 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{currency} {delayedBeyond90.toLocaleString()} pushed beyond 90-day horizon</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 30 / 60 / 90 Days Bucket Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {simulatedProjections.map((bucket, index) => {
          const isDeficit = bucket.cumulativeRunway < 0;
          return (
            <div
              key={bucket.period}
              className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  {bucket.period}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-semibold ${
                    isDeficit
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}
                >
                  {isDeficit ? 'Deficit Warning' : 'Healthy Surplus'}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {index === 0 && totalPaymentsCollected > 0 && (
                  <div className="flex justify-between items-baseline text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                    <span className="font-medium">Payments Already Collected:</span>
                    <span className="font-bold">+{currency} {totalPaymentsCollected.toLocaleString()}</span>
                  </div>
                )}
                {index > 0 && (
                  <div className="flex justify-between items-baseline text-xs text-slate-400 bg-slate-800/40 px-2.5 py-1 rounded">
                    <span>Opening Cash Carryover:</span>
                    <span className="font-semibold text-slate-200">
                      {currency} {bucket.openingCash.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-400">Pending Inflow:</span>
                  <span className="text-base font-bold text-white">
                    {currency} {bucket.simulatedInflow.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-400">Fixed Expenses:</span>
                  <span className="text-sm font-medium text-rose-400">
                    -{currency} {bucket.recurringExpenses.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-baseline text-xs text-slate-400">
                  <span>Period Net Change:</span>
                  <span className={`font-semibold ${bucket.simulatedNet >= 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {bucket.simulatedNet >= 0 ? '+' : ''}{currency} {bucket.simulatedNet.toLocaleString()}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
                  <span className="text-xs font-bold text-slate-300">Ending Cash Runway:</span>
                  <span
                    className={`text-lg font-extrabold ${
                      isDeficit ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {currency} {bucket.cumulativeRunway.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Bar Chart: Nominal Due Date vs Predicted Inflow vs Expenses */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Cash Inflow & Outflow Timeline
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparison between invoice nominal due date, algorithmically adjusted arrival, and recurring fixed expenses.
            </p>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={simulatedProjections}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="period" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `₹${val}`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '12px',
                }}
                formatter={(val: any) => [`${currency} ${val.toLocaleString()}`]}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="scheduledInflow" name="Nominal Due Date Inflow" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="simulatedInflow" name="Predicted Arrival (Lag Adjusted)" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="recurringExpenses" name="Monthly Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Upcoming Invoices Breakdown Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Forecast Receivables Queue</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
              Total Invoiced: {currency} {totalInvoicedAmount.toLocaleString()}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Paid to Date: {currency} {totalPaymentsCollected.toLocaleString()}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Balance Due: {currency} {totalProjectedReceivables.toLocaleString()}
            </span>
          </div>
        </div>

        {data?.projectedInvoices.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No active outstanding invoices in the forecast pipeline.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-xs text-slate-400 uppercase border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3">Invoice #</th>
                  <th className="px-5 py-3">Client</th>
                  <th className="px-5 py-3">Total Billed</th>
                  <th className="px-5 py-3">Paid to Date</th>
                  <th className="px-5 py-3">Balance Due</th>
                  <th className="px-5 py-3">Nominal Due</th>
                  <th className="px-5 py-3">Client Delay Factor</th>
                  <th className="px-5 py-3">Predicted Arrival</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data?.projectedInvoices.map((inv, idx) => {
                  const billedTotal = inv.totalAmount || (inv.balanceDue + (inv.amountPaid || 0));
                  const paid = inv.amountPaid || 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-800/40 transition">
                      <td className="px-5 py-3.5 font-semibold text-white">{inv.invoiceNumber}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-slate-200">{inv.clientName}</span>
                        {inv.companyName && (
                          <span className="block text-xs text-slate-500">{inv.companyName}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-300 font-medium">
                        {currency} {billedTotal.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5">
                        {paid > 0 ? (
                          <span className="text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-xs">
                            +{currency} {paid.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-white">
                        {currency} {inv.balanceDue.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400">
                        {new Date(inv.originalDueDate).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-medium ${
                            inv.clientDelayDays > 15
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : inv.clientDelayDays > 5
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          +{inv.clientDelayDays} Days
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-200 font-medium">
                        {simulationDelayDays > 0 ? (
                          <div>
                            <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                              <span>
                                {new Date(
                                  new Date(inv.adjustedPaymentDate).getTime() +
                                    simulationDelayDays * 24 * 60 * 60 * 1000
                                ).toLocaleDateString()}
                              </span>
                              <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-normal">
                                +{simulationDelayDays}d
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 line-through">
                              {new Date(inv.adjustedPaymentDate).toLocaleDateString()}
                            </div>
                          </div>
                        ) : (
                          new Date(inv.adjustedPaymentDate).toLocaleDateString()
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          inv.status === 'PARTIAL'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expenses List & Add Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                Manage Fixed Monthly Expenses
              </h3>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Existing Expenses List */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {expenses.length === 0 ? (
                <p className="text-xs text-slate-500">No expenses recorded yet.</p>
              ) : (
                expenses.map((exp) => (
                  <div
                    key={exp._id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-200">{exp.title}</p>
                      <p className="text-slate-500 capitalize">{exp.category.toLowerCase()}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-rose-400">
                        -{currency} {exp.amount}/mo
                      </span>
                      <button
                        onClick={() => handleDeleteExpense(exp._id)}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add New Expense Form */}
            <form onSubmit={handleAddExpense} className="space-y-4 pt-4 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Add Recurring Cost
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Expense Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Adobe Suite"
                    value={newExpenseTitle}
                    onChange={(e) => setNewExpenseTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Monthly Amount ({currency})</label>
                  <input
                    type="number"
                    required
                    placeholder="55"
                    value={newExpenseAmount}
                    onChange={(e) => setNewExpenseAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Category</label>
                <select
                  value={newExpenseCategory}
                  onChange={(e) => setNewExpenseCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
                >
                  <option value="SOFTWARE">Software / Cloud</option>
                  <option value="OFFICE">Office / Studio</option>
                  <option value="EQUIPMENT">Hardware / Tools</option>
                  <option value="TAXES">Taxes & Accounting</option>
                  <option value="MARKETING">Marketing & Advertising</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
