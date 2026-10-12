import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  FileText,
  Download,
  Building,
  CheckCircle,
  Clock,
  ShieldCheck,
  CreditCard,
  QrCode,
  RefreshCw,
} from 'lucide-react';
import api from '../api/client.js';
import { IInvoice } from '../types/index.js';

export const PublicInvoicePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [invoice, setInvoice] = useState<IInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentSentNotice, setPaymentSentNotice] = useState(false);

  useEffect(() => {
    const fetchPublicInvoice = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/public/invoices/${token}`);
        setInvoice(res.data.invoice);

        // Notify server that client viewed the invoice
        await api.post(`/public/invoices/${token}/viewed`);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Invoice not found or link expired.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchPublicInvoice();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080d19] flex items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-[#080d19] flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <FileText className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">Invoice Unavailable</h2>
          <p className="text-xs text-slate-400">{error || 'Unable to locate this invoice.'}</p>
        </div>
      </div>
    );
  }

  const client: any = invoice.clientId;
  const freelancer: any = invoice.userId;

  const statusColors: Record<string, string> = {
    PAID: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    SENT: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    VIEWED: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    OVERDUE: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    PARTIAL: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };

  return (
    <div className="min-h-screen bg-[#080d19] py-12 px-4 sm:px-6 lg:px-8 text-slate-100">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Floating Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">
                Invoice {invoice.invoiceNumber} from {freelancer?.businessName || freelancer?.name}
              </p>
              <p className="text-[11px] text-slate-400">
                Due on {new Date(invoice.dueDate).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <a
              href={`/api/public/invoices/${token}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition"
            >
              <Download className="w-4 h-4" />
              <span>Download Official PDF</span>
            </a>
          </div>
        </div>

        {/* Invoice Container */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 sm:p-12 shadow-2xl space-y-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-8 border-b border-slate-800">
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                {freelancer?.businessName || freelancer?.name}
              </h1>
              <p className="text-xs text-slate-400 mt-1">{freelancer?.email}</p>
              {freelancer?.taxId && (
                <p className="text-xs text-slate-400 mt-0.5">
                  <strong className="text-slate-300">GSTIN:</strong> {freelancer.taxId}
                </p>
              )}
            </div>

            <div className="text-left sm:text-right space-y-1">
              <span className="text-2xl font-black text-emerald-400 tracking-wider">INVOICE</span>
              <p className="text-xs font-bold text-white"># {invoice.invoiceNumber}</p>
              <p className="text-xs text-slate-400">
                Issued: {new Date(invoice.issueDate).toLocaleDateString()}
              </p>
              <p className="text-xs font-semibold text-rose-400">
                Due: {new Date(invoice.dueDate).toLocaleDateString()}
              </p>
              <span
                className={`inline-block text-[11px] px-2.5 py-0.5 rounded-full font-semibold border mt-1 ${
                  statusColors[invoice.status] || 'bg-slate-800 text-slate-300'
                }`}
              >
                Status: {invoice.status}
              </span>
            </div>
          </div>

          {/* Billed To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Billed To
              </span>
              <p className="text-base font-bold text-white">{client?.name}</p>
              {client?.companyName && (
                <p className="text-xs text-slate-300 mt-0.5">{client.companyName}</p>
              )}
              <p className="text-xs text-slate-400 mt-0.5">{client?.email}</p>
              {client?.billingAddress?.street && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {client.billingAddress.street}, {client.billingAddress.city}
                </p>
              )}
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1.5 self-start">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Total Balance Due
              </span>
              <p
                className={`text-2xl font-black ${
                  invoice.balanceDue > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {invoice.currency} {invoice.balanceDue.toLocaleString()}
              </p>
              {invoice.amountPaid > 0 && (
                <p className="text-xs text-slate-400">
                  Paid to date: {invoice.currency} {invoice.amountPaid.toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Description</th>
                  <th className="p-3.5 text-right">Qty</th>
                  <th className="p-3.5 text-right">Rate</th>
                  <th className="p-3.5 text-right">Tax</th>
                  <th className="p-3.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {invoice.lineItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-3.5 font-medium text-white">{item.description}</td>
                    <td className="p-3.5 text-right text-slate-400">{item.quantity}</td>
                    <td className="p-3.5 text-right text-slate-400">
                      {invoice.currency} {item.unitPrice.toFixed(2)}
                    </td>
                    <td className="p-3.5 text-right text-slate-400">
                      {item.taxRate > 0 ? `${item.taxRate}%` : '-'}
                    </td>
                    <td className="p-3.5 text-right font-bold text-white">
                      {invoice.currency} {item.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
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
                  <span>Taxes:</span>
                  <span className="text-white">
                    {invoice.currency} {invoice.taxTotal.toFixed(2)}
                  </span>
                </div>
              )}
              {invoice.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount:</span>
                  <span>
                    -{invoice.currency} {invoice.discountTotal.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-white pt-2 border-t border-slate-800">
                <span>Grand Total:</span>
                <span className="text-emerald-400">
                  {invoice.currency} {invoice.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Instructions & Bank Wire Box */}
          <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              Direct Wire & Bank Transfer Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {freelancer?.bankDetails?.bankName && (
                <div>
                  <span className="text-slate-500 block">Bank Name:</span>
                  <span className="font-semibold text-white">{freelancer.bankDetails.bankName}</span>
                </div>
              )}
              {freelancer?.bankDetails?.accountHolderName && (
                <div>
                  <span className="text-slate-500 block">Account Holder:</span>
                  <span className="font-semibold text-white">
                    {freelancer.bankDetails.accountHolderName}
                  </span>
                </div>
              )}
              {freelancer?.bankDetails?.accountNumber && (
                <div>
                  <span className="text-slate-500 block">Account Number:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {freelancer.bankDetails.accountNumber}
                  </span>
                </div>
              )}
              {freelancer?.bankDetails?.routingOrIfsc && (
                <div>
                  <span className="text-slate-500 block">Routing / IFSC / Sort:</span>
                  <span className="font-mono font-semibold text-white">
                    {freelancer.bankDetails.routingOrIfsc}
                  </span>
                </div>
              )}
              {freelancer?.bankDetails?.upiId && (
                <div>
                  <span className="text-slate-500 block">UPI ID (Instant Pay):</span>
                  <span className="font-mono font-bold text-teal-400">
                    {freelancer.bankDetails.upiId}
                  </span>
                </div>
              )}
              {freelancer?.bankDetails?.swiftOrBic && (
                <div>
                  <span className="text-slate-500 block">SWIFT / BIC:</span>
                  <span className="font-mono text-white">{freelancer.bankDetails.swiftOrBic}</span>
                </div>
              )}
            </div>

            {invoice.paymentInstructions && (
              <p className="text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                {invoice.paymentInstructions}
              </p>
            )}

            <div className="pt-2">
              {paymentSentNotice ? (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Thank you! Your payment notification has been logged for the freelancer.</span>
                </div>
              ) : (
                <button
                  onClick={() => setPaymentSentNotice(true)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                >
                  I Have Sent Payment &rarr;
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
