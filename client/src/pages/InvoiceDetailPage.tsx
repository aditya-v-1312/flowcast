import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  ArrowLeft,
  Download,
  Share2,
  DollarSign,
  CheckCircle,
  Clock,
  Calendar,
  Building,
  Check,
  RefreshCw,
  Mail,
  ExternalLink,
} from 'lucide-react';
import api from '../api/client.js';
import { IInvoice, IPaymentRecord } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';

export const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [invoice, setInvoice] = useState<IInvoice | null>(null);
  const [payments, setPayments] = useState<IPaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Manual payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [paymentRef, setPaymentRef] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/invoices/${id}`);
      setInvoice(res.data.invoice);
      setPayments(res.data.payments);
      if (res.data.invoice) {
        setPaymentAmount(res.data.invoice.balanceDue.toString());
      }
    } catch (err) {
      console.error('Failed to load invoice', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handleCopyLink = () => {
    if (!invoice) return;
    const url = `${window.location.origin}/pay/${invoice.publicAccessToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailNotice, setEmailNotice] = useState<{ message: string; previewUrl?: string } | null>(null);

  const handleSendEmail = async () => {
    if (!invoice) return;
    try {
      setSendingEmail(true);
      const res = await api.post(`/invoices/${invoice._id}/send`);
      setEmailNotice({
        message: res.data.message,
        previewUrl: res.data.previewUrl,
      });
      fetchInvoice();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to dispatch email.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice || !paymentAmount) return;

    try {
      setSubmittingPayment(true);
      await api.post(`/invoices/${invoice._id}/payments`, {
        amount: Number(paymentAmount),
        paymentMethod,
        transactionReference: paymentRef,
      });
      setShowPaymentModal(false);
      fetchInvoice();
    } catch (err) {
      console.error('Failed to record payment', err);
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center p-12 text-slate-400">
        <p>Invoice not found.</p>
        <button
          onClick={() => navigate('/invoices')}
          className="mt-4 px-4 py-2 bg-slate-800 rounded-lg text-xs"
        >
          Back to Invoices
        </button>
      </div>
    );
  }

  const client: any = invoice.clientId;

  const statusColors: Record<string, string> = {
    PAID: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    SENT: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    VIEWED: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    OVERDUE: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    DRAFT: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    PARTIAL: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/invoices')}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-white tracking-tight">
                {invoice.invoiceNumber}
              </h1>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                  statusColors[invoice.status] || 'bg-slate-800 text-slate-300'
                }`}
              >
                {invoice.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Issued {new Date(invoice.issueDate).toLocaleDateString()} &bull; Due{' '}
              {new Date(invoice.dueDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {invoice.balanceDue > 0 && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition"
            >
              <DollarSign className="w-4 h-4" />
              <span>Record Payment</span>
            </button>
          )}

          <button
            onClick={handleSendEmail}
            disabled={sendingEmail}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition"
          >
            {sendingEmail ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Mail className="w-4 h-4" />
            )}
            <span>{sendingEmail ? 'Sending...' : 'Email Client'}</span>
          </button>

          <a
            href={`/api/invoices/${invoice._id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Download PDF</span>
          </a>

          <button
            onClick={handleCopyLink}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Share2 className="w-4 h-4 text-slate-400" />
            )}
            <span>{copied ? 'Link Copied!' : 'Client Link'}</span>
          </button>
        </div>
      </div>

      {/* Email Dispatched Alert */}
      {emailNotice && (
        <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center space-x-3">
            <Mail className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-emerald-200">{emailNotice.message}</p>
              <p className="text-[11px] text-emerald-400/80">
                The client ({client?.email || 'registered billing address'}) received this invoice with PDF attached.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {emailNotice.previewUrl && (
              <a
                href={emailNotice.previewUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] rounded-lg transition"
              >
                <span>View Sent Mail Preview</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <button
              onClick={() => setEmailNotice(null)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Invoice Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 space-y-8 shadow-sm">
        {/* Bill To & Metadata */}
        <div className="grid grid-cols-2 gap-6 text-xs pb-6 border-b border-slate-800">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Billed To
            </span>
            <p className="text-base font-bold text-white">{client?.name || 'N/A'}</p>
            {client?.companyName && (
              <p className="text-xs text-slate-400">{client.companyName}</p>
            )}
            <p className="text-xs text-slate-500">{client?.email}</p>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Payment Status
            </span>
            <p className="text-sm font-semibold text-white">
              Paid:{' '}
              <span className="text-emerald-400">
                {invoice.currency} {invoice.amountPaid.toLocaleString()}
              </span>
            </p>
            <p className="text-sm font-bold text-slate-300">
              Balance Due:{' '}
              <span className={invoice.balanceDue > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                {invoice.currency} {invoice.balanceDue.toLocaleString()}
              </span>
            </p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">Description</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3 text-right">Unit Price</th>
                <th className="p-3 text-right">Tax</th>
                <th className="p-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {invoice.lineItems.map((item, idx) => (
                <tr key={idx}>
                  <td className="p-3 font-medium text-white">{item.description}</td>
                  <td className="p-3 text-right text-slate-400">{item.quantity}</td>
                  <td className="p-3 text-right text-slate-400">
                    {invoice.currency} {item.unitPrice.toFixed(2)}
                  </td>
                  <td className="p-3 text-right text-slate-400">
                    {item.taxRate > 0 ? `${item.taxRate}%` : '-'}
                  </td>
                  <td className="p-3 text-right font-bold text-white">
                    {invoice.currency} {item.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Breakdown */}
        <div className="flex justify-end pt-4 border-t border-slate-800">
          <div className="w-64 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal:</span>
              <span className="text-white">
                {invoice.currency} {invoice.subtotal.toFixed(2)}
              </span>
            </div>
            {invoice.taxTotal > 0 && (
              <div className="flex justify-between text-slate-400">
                <span>Tax Total:</span>
                <span className="text-white">
                  {invoice.currency} {invoice.taxTotal.toFixed(2)}
                </span>
              </div>
            )}
            {invoice.discountTotal > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Discount Total:</span>
                <span>
                  -{invoice.currency} {invoice.discountTotal.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm font-extrabold text-white pt-2 border-t border-slate-800">
              <span>Total Amount:</span>
              <span className="text-emerald-400">
                {invoice.currency} {invoice.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Bank & Payment Instructions */}
        {invoice.paymentInstructions && (
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
            <span className="font-bold text-slate-300 block mb-1">Payment Instructions:</span>
            <p>{invoice.paymentInstructions}</p>
          </div>
        )}
      </div>

      {/* Recorded Payments History */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          Recorded Payment Transactions ({payments.length})
        </h3>

        {payments.length === 0 ? (
          <p className="text-xs text-slate-500">No payments have been recorded for this invoice yet.</p>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div
                key={p._id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs"
              >
                <div>
                  <span className="font-bold text-emerald-400 text-sm">
                    +{invoice.currency} {p.amount.toLocaleString()}
                  </span>
                  <p className="text-slate-400 mt-0.5">
                    via <strong className="text-slate-200">{p.paymentMethod}</strong> &bull;{' '}
                    {new Date(p.paymentDate).toLocaleDateString()}
                  </p>
                </div>
                {p.transactionReference && (
                  <span className="text-slate-500 font-mono text-[11px] bg-slate-900 px-2 py-1 rounded">
                    Ref: {p.transactionReference}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                Record Manual Payment
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Amount ({invoice.currency})
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
                  <option value="UPI">UPI</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="PAYPAL">PayPal</option>
                  <option value="STRIPE">Stripe / Card</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Transaction / UTR Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR-0928173491"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500"
                >
                  {submittingPayment ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
