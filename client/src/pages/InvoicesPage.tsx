import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Download,
  Share2,
  DollarSign,
  Trash2,
  ExternalLink,
  Check,
  RefreshCw,
  Mail,
  Send,
} from 'lucide-react';
import api from '../api/client.js';
import { IInvoice } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';

export const InvoicesPage: React.FC = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<IInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Email dispatch state
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [emailNotice, setEmailNotice] = useState<{ message: string; previewUrl?: string } | null>(null);

  // Manual payment modal state
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<IInvoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await api.get('/invoices', {
        params: {
          status: filterStatus,
          search: searchTerm || undefined,
        },
      });
      setInvoices(res.data.invoices);
    } catch (err) {
      console.error('Failed to fetch invoices', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [filterStatus]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInvoices();
  };

  const handleCopyLink = (token: string, invId: string) => {
    const url = `${window.location.origin}/pay/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(invId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSendEmail = async (id: string) => {
    try {
      setSendingEmailId(id);
      const res = await api.post(`/invoices/${id}/send`);
      setEmailNotice({
        message: res.data.message,
        previewUrl: res.data.previewUrl,
      });
      fetchInvoices();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to dispatch email.');
    } finally {
      setSendingEmailId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await api.delete(`/invoices/${id}`);
      fetchInvoices();
    } catch (err) {
      console.error('Failed to delete invoice', err);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalInvoice || !paymentAmount) return;

    try {
      setPaymentSubmitting(true);
      await api.post(`/invoices/${paymentModalInvoice._id}/payments`, {
        amount: Number(paymentAmount),
        paymentMethod,
        transactionReference: paymentRef,
      });
      setPaymentModalInvoice(null);
      setPaymentAmount('');
      setPaymentRef('');
      fetchInvoices();
    } catch (err) {
      console.error('Failed to record payment', err);
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const statusPills = ['ALL', 'DRAFT', 'SENT', 'VIEWED', 'PARTIAL', 'PAID', 'OVERDUE'];

  const statusColors: Record<string, string> = {
    PAID: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    SENT: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    VIEWED: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    OVERDUE: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    DRAFT: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    PARTIAL: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-emerald-400" />
            Invoices Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Create, track, and manage all your client billing and payment transactions.
          </p>
        </div>

        <Link
          to="/invoices/new"
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-600/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Invoice</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          {statusPills.map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition ${
                filterStatus === st
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-72">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search invoice #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700"
          >
            Find
          </button>
        </form>
      </div>

      {/* Email Dispatched Alert */}
      {emailNotice && (
        <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center space-x-3">
            <Mail className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-emerald-200">{emailNotice.message}</p>
              <p className="text-[11px] text-emerald-400/80">The client received an email with the PDF bill attached and online payment link.</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {emailNotice.previewUrl && (
              <a
                href={emailNotice.previewUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-semibold border border-emerald-500/30 transition flex items-center gap-1.5"
              >
                <span>View Email Preview</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={() => setEmailNotice(null)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Invoices Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center p-16 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-16 text-center text-slate-500 text-sm space-y-2">
            <p>No invoices found matching current criteria.</p>
            <Link
              to="/invoices/new"
              className="inline-block text-xs text-emerald-400 hover:underline font-semibold"
            >
              + Create a new invoice now
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-xs text-slate-400 uppercase border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Invoice #</th>
                  <th className="px-5 py-3.5">Client</th>
                  <th className="px-5 py-3.5">Issue Date</th>
                  <th className="px-5 py-3.5">Due Date</th>
                  <th className="px-5 py-3.5">Total</th>
                  <th className="px-5 py-3.5">Balance Due</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {invoices.map((inv) => {
                  const client =
                    typeof inv.clientId === 'object' && inv.clientId !== null
                      ? inv.clientId
                      : null;

                  return (
                    <tr key={inv._id} className="hover:bg-slate-800/40 transition">
                      <td className="px-5 py-4 font-bold text-white">
                        <Link to={`/invoices/${inv._id}`} className="hover:text-emerald-400 transition">
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-200">{client?.name || 'N/A'}</p>
                        {client?.companyName && (
                          <p className="text-xs text-slate-500">{client.companyName}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-400">
                        {new Date(inv.issueDate).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-300 font-medium">
                        {new Date(inv.dueDate).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 font-bold text-white">
                        {inv.currency} {inv.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 font-bold text-emerald-400">
                        {inv.currency} {inv.balanceDue.toLocaleString()}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${
                            statusColors[inv.status] || 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Record Payment Button */}
                          {inv.balanceDue > 0 && (
                            <button
                              onClick={() => {
                                setPaymentModalInvoice(inv);
                                setPaymentAmount(inv.balanceDue.toString());
                              }}
                              title="Record Manual Payment"
                              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                          )}

                          {/* Send Email to Client with PDF */}
                          <button
                            onClick={() => handleSendEmail(inv._id)}
                            disabled={sendingEmailId === inv._id}
                            title="Send invoice & PDF directly to client's email"
                            className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 border border-teal-500/20 transition"
                          >
                            <Mail className={`w-4 h-4 ${sendingEmailId === inv._id ? 'animate-bounce text-emerald-400' : ''}`} />
                          </button>

                          {/* Download PDF */}
                          <a
                            href={`/api/invoices/${inv._id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            title="Download Vector PDF"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                          >
                            <Download className="w-4 h-4" />
                          </a>

                          {/* Copy Shareable Client Link */}
                          <button
                            onClick={() => handleCopyLink(inv.publicAccessToken, inv._id)}
                            title="Copy Public Client Payment Link"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                          >
                            {copiedId === inv._id ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Share2 className="w-4 h-4" />
                            )}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(inv._id)}
                            title="Delete Invoice"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Payment Record Modal */}
      {paymentModalInvoice && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                Record Manual Payment
              </h3>
              <button
                onClick={() => setPaymentModalInvoice(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
              <p className="text-slate-400">
                Invoice:{' '}
                <span className="font-bold text-white">
                  {paymentModalInvoice.invoiceNumber}
                </span>
              </p>
              <p className="text-slate-400">
                Outstanding Balance:{' '}
                <span className="font-bold text-emerald-400">
                  {paymentModalInvoice.currency} {paymentModalInvoice.balanceDue.toLocaleString()}
                </span>
              </p>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Amount Received ({paymentModalInvoice.currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
                >
                  <option value="BANK_TRANSFER">Bank Wire / Transfer</option>
                  <option value="UPI">UPI (India)</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="PAYPAL">PayPal</option>
                  <option value="STRIPE">Stripe / Card</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Transaction / UTR Reference (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR-9812739481"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalInvoice(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentSubmitting}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition shadow-lg shadow-emerald-600/20"
                >
                  {paymentSubmitting ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
