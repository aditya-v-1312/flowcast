import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Trash2,
  Save,
  Send,
  Eye,
  Check,
  Building,
  Calendar,
  CreditCard,
  DollarSign,
  ArrowLeft,
  Mail,
} from 'lucide-react';
import api from '../api/client.js';
import { IClient, ILineItem } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';

export const InvoiceBuilderPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [clients, setClients] = useState<IClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState(
    `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [currency, setCurrency] = useState(user?.currency || 'INR');
  const [notes, setNotes] = useState('Thank you for your business! Please quote the invoice number in the UPI/NEFT transfer remark.');
  const [paymentInstructions, setPaymentInstructions] = useState(
    user?.bankDetails?.bankName
      ? `Bank: ${user.bankDetails.bankName} | A/C: ${user.bankDetails.accountNumber} | IFSC: ${user.bankDetails.routingOrIfsc} | UPI: ${user.bankDetails.upiId || 'aditya.chandiramani@okhdfcbank'}`
      : ''
  );

  const [lineItems, setLineItems] = useState<ILineItem[]>([
    {
      description: 'Full-Stack Web Development Sprint (MERN Stack)',
      quantity: 1,
      unitPrice: 25000,
      taxRate: 18, // 18% GST standard rate in India
      discount: 0,
      amount: 29500,
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Quick Add Client modal state
  const [showQuickClientModal, setShowQuickClientModal] = useState(false);
  const [qcName, setQcName] = useState('');
  const [qcCompanyName, setQcCompanyName] = useState('');
  const [qcEmail, setQcEmail] = useState('');
  const [qcPhone, setQcPhone] = useState('');
  const [qcTerms, setQcTerms] = useState('30');
  const [qcError, setQcError] = useState('');
  const [qcSubmitting, setQcSubmitting] = useState(false);

  const fetchClients = async () => {
    try {
      const res = await api.get('/clients');
      setClients(res.data.clients);
      if (res.data.clients.length > 0 && !selectedClientId) {
        setSelectedClientId(res.data.clients[0]._id);
        const cTerms = res.data.clients[0].customPaymentTerms || 30;
        setDueDate(new Date(Date.now() + cTerms * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      }
    } catch (err) {
      console.error('Failed to load clients', err);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleQuickAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qcName || !qcEmail) {
      setQcError('Contact name and billing email are required.');
      return;
    }

    try {
      setQcSubmitting(true);
      setQcError('');
      const res = await api.post('/clients', {
        name: qcName.trim(),
        companyName: qcCompanyName.trim(),
        email: qcEmail.trim().toLowerCase(),
        phone: qcPhone.trim(),
        customPaymentTerms: Number(qcTerms) || 30,
        defaultCurrency: 'INR',
      });

      const newClient = res.data.client;
      setClients((prev) => [newClient, ...prev]);
      setSelectedClientId(newClient._id);
      const cTerms = newClient.customPaymentTerms || 30;
      setDueDate(new Date(Date.now() + cTerms * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      setShowQuickClientModal(false);
      setQcName('');
      setQcCompanyName('');
      setQcEmail('');
      setQcPhone('');
    } catch (err: any) {
      setQcError(err.response?.data?.message || 'Failed to create client.');
    } finally {
      setQcSubmitting(false);
    }
  };

  // Update line item and recalculate
  const updateLineItem = (index: number, field: keyof ILineItem, value: any) => {
    const updated = [...lineItems];
    const item = { ...updated[index], [field]: value };

    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const base = qty * price;
    const discountVal = (base * (Number(item.discount) || 0)) / 100;
    const discountedBase = base - discountVal;
    const taxVal = (discountedBase * (Number(item.taxRate) || 0)) / 100;
    item.amount = Math.round((discountedBase + taxVal) * 100) / 100;

    updated[index] = item;
    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: 0,
        discount: 0,
        amount: 0,
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  // Compute overall summary totals
  let subtotal = 0;
  let taxTotal = 0;
  let discountTotal = 0;

  lineItems.forEach((item) => {
    const base = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    const disc = (base * (Number(item.discount) || 0)) / 100;
    const taxable = base - disc;
    const tax = (taxable * (Number(item.taxRate) || 0)) / 100;

    subtotal += base;
    discountTotal += disc;
    taxTotal += tax;
  });

  const grandTotal = Math.round((subtotal - discountTotal + taxTotal) * 100) / 100;

  const [builderError, setBuilderError] = useState('');

  const handleSaveInvoice = async (status: 'DRAFT' | 'SENT', andEmail: boolean = false) => {
    setBuilderError('');
    if (!selectedClientId) {
      setBuilderError('Please select or add a client first.');
      return;
    }

    const hasEmptyItem = lineItems.some((item) => !item.description?.trim());
    if (hasEmptyItem) {
      setBuilderError('Please provide a description for every line item.');
      return;
    }

    try {
      setSaving(true);
      const res = await api.post('/invoices', {
        clientId: selectedClientId,
        invoiceNumber,
        issueDate,
        dueDate,
        currency: currency === '₹' ? 'INR' : currency || 'INR',
        lineItems,
        notes,
        paymentInstructions,
        status,
      });

      if (andEmail && res.data?.invoice?._id) {
        try {
          await api.post(`/invoices/${res.data.invoice._id}/send`);
        } catch (sendErr) {
          console.warn('Initial email dispatch deferred', sendErr);
        }
      }

      navigate('/invoices');
    } catch (err: any) {
      setBuilderError(err.response?.data?.message || 'Failed to create invoice.');
    } finally {
      setSaving(false);
    }
  };

  const selectedClient = clients.find((c) => c._id === selectedClientId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/invoices')}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <FileText className="w-6 h-6 text-emerald-400" />
              Professional Invoice Builder
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Draft and customize line items with automatic taxes and discounts.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Eye className="w-4 h-4 text-emerald-400" />
            <span>{previewMode ? 'Edit Mode' : 'Live Preview'}</span>
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSaveInvoice('DRAFT')}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Save className="w-4 h-4 text-slate-400" />
            <span>Save Draft</span>
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSaveInvoice('SENT', false)}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Send className="w-4 h-4 text-emerald-400" />
            <span>Save & Mark Sent</span>
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSaveInvoice('SENT', true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition"
          >
            <Mail className="w-4 h-4" />
            <span>{saving ? 'Processing...' : 'Finalize & Email'}</span>
          </button>
        </div>
      </div>

      {builderError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 font-medium">
          {builderError}
        </div>
      )}

      {previewMode ? (
        /* Live Paper Invoice Preview */
        <div className="bg-white text-slate-900 rounded-2xl p-10 shadow-2xl max-w-4xl mx-auto space-y-8 font-sans">
          <div className="flex justify-between items-start border-b border-slate-200 pb-8">
            <div>
              <h2 className="text-2xl font-black text-slate-900">
                {user?.businessName || user?.name}
              </h2>
              <p className="text-xs text-slate-500 mt-1">{user?.email}</p>
              {user?.taxId && <p className="text-xs text-slate-500">Tax ID: {user.taxId}</p>}
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-emerald-600 tracking-wider">INVOICE</span>
              <p className="text-xs font-bold text-slate-800 mt-1"># {invoiceNumber}</p>
              <p className="text-xs text-slate-500">Issue: {issueDate}</p>
              <p className="text-xs font-semibold text-rose-600">Due: {dueDate}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 text-xs">
            <div>
              <span className="font-bold uppercase text-slate-400 tracking-wider block mb-1">
                Billed To:
              </span>
              <p className="font-bold text-slate-800 text-sm">{selectedClient?.name}</p>
              {selectedClient?.companyName && (
                <p className="text-slate-600">{selectedClient.companyName}</p>
              )}
              <p className="text-slate-500">{selectedClient?.email}</p>
            </div>
            <div>
              <span className="font-bold uppercase text-slate-400 tracking-wider block mb-1">
                Currency:
              </span>
              <p className="font-bold text-slate-800">{currency}</p>
            </div>
          </div>

          {/* Line items table in preview */}
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 uppercase font-bold border-b border-slate-200">
                <th className="p-3">Description</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3 text-right">Price</th>
                <th className="p-3 text-right">Tax%</th>
                <th className="p-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lineItems.map((item, idx) => (
                <tr key={idx}>
                  <td className="p-3 font-medium text-slate-800">{item.description}</td>
                  <td className="p-3 text-right text-slate-600">{item.quantity}</td>
                  <td className="p-3 text-right text-slate-600">
                    {currency} {Number(item.unitPrice).toFixed(2)}
                  </td>
                  <td className="p-3 text-right text-slate-600">{item.taxRate}%</td>
                  <td className="p-3 text-right font-bold text-slate-900">
                    {currency} {item.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals in preview */}
          <div className="flex justify-end pt-4 border-t border-slate-200">
            <div className="w-64 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>
                  {currency} {subtotal.toFixed(2)}
                </span>
              </div>
              {taxTotal > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Taxes:</span>
                  <span>
                    {currency} {taxTotal.toFixed(2)}
                  </span>
                </div>
              )}
              {discountTotal > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span>
                    -{currency} {discountTotal.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Amount:</span>
                <span className="text-emerald-600">
                  {currency} {grandTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment instructions in preview */}
          {paymentInstructions && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
              <span className="font-bold block text-slate-800 mb-1">Payment Instructions:</span>
              <p>{paymentInstructions}</p>
            </div>
          )}
        </div>
      ) : (
        /* Edit Form */
        <div className="space-y-6">
          {/* Top Meta Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-400 block">Client *</label>
                <button
                  type="button"
                  onClick={() => setShowQuickClientModal(true)}
                  className="text-[11px] font-semibold text-emerald-400 hover:underline"
                >
                  + Add Client
                </button>
              </div>
              <select
                value={selectedClientId}
                onChange={(e) => {
                  setSelectedClientId(e.target.value);
                  const cl = clients.find((c) => c._id === e.target.value);
                  if (cl) {
                    const cTerms = cl.customPaymentTerms || 30;
                    setDueDate(new Date(Date.now() + cTerms * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                  }
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
              >
                {clients.length === 0 ? (
                  <option value="">No clients — Click + Add Client</option>
                ) : (
                  clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} {c.companyName ? `(${c.companyName})` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
                Invoice Number
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Issue Date</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Line Items Editor */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Line Items</h3>
              <span className="text-xs text-slate-400 font-mono">
                Currency: <strong className="text-emerald-400">{currency}</strong>
              </span>
            </div>

            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-3 items-center bg-slate-950/60 p-3 rounded-xl border border-slate-800"
                >
                  <div className="col-span-5">
                    <label className="text-[10px] text-slate-500 block mb-1">Description</label>
                    <input
                      type="text"
                      placeholder="e.g. Design System Sprint"
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-500 block mb-1">Qty</label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.5"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-500 block mb-1">Unit Rate</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(index, 'unitPrice', Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="text-[10px] text-slate-500 block mb-1">Tax%</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={item.taxRate}
                      onChange={(e) => updateLineItem(index, 'taxRate', Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div className="col-span-1 text-right">
                    <label className="text-[10px] text-slate-500 block mb-1">Amount</label>
                    <span className="text-xs font-bold text-white block">
                      ₹{item.amount.toLocaleString()}
                    </span>
                  </div>

                  <div className="col-span-1 text-right">
                    <label className="text-[10px] text-transparent block mb-1">Action</label>
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addLineItem}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 border border-slate-700 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Line Item</span>
            </button>
          </div>

          {/* Notes and Payment Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
              <label className="text-xs font-semibold text-slate-400 block">Client Notes</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
              />
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
              <label className="text-xs font-semibold text-slate-400 block">
                Bank & Payment Instructions
              </label>
              <textarea
                rows={3}
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                placeholder="Include bank account number, IFSC/Routing code, or UPI ID..."
                className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Sticky Summary Bottom Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-6 text-xs text-slate-400">
              <div>
                Subtotal:{' '}
                <strong className="text-white">
                  {currency} {subtotal.toFixed(2)}
                </strong>
              </div>
              {taxTotal > 0 && (
                <div>
                  Tax:{' '}
                  <strong className="text-white">
                    {currency} {taxTotal.toFixed(2)}
                  </strong>
                </div>
              )}
              {discountTotal > 0 && (
                <div>
                  Discount:{' '}
                  <strong className="text-emerald-400">
                    -{currency} {discountTotal.toFixed(2)}
                  </strong>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-6">
              <div className="text-right">
                <span className="text-xs text-slate-400 uppercase tracking-wider block">
                  Grand Total
                </span>
                <span className="text-2xl font-black text-emerald-400">
                  {currency} {grandTotal.toFixed(2)}
                </span>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSaveInvoice('SENT')}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition"
              >
                Finalize Invoice
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Quick Add Client Modal */}
      {showQuickClientModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-emerald-400" />
                Quick Add Client
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowQuickClientModal(false);
                  setQcError('');
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {qcError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400">
                {qcError}
              </div>
            )}

            <form onSubmit={handleQuickAddClient} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Contact Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={qcName}
                  onChange={(e) => setQcName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. Infosys Pvt Ltd"
                  value={qcCompanyName}
                  onChange={(e) => setQcCompanyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Billing Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="billing@company.com"
                    value={qcEmail}
                    onChange={(e) => setQcEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98250 12345"
                    value={qcPhone}
                    onChange={(e) => setQcPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Default Terms</label>
                <select
                  value={qcTerms}
                  onChange={(e) => setQcTerms(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
                >
                  <option value="15">Net 15 Days</option>
                  <option value="30">Net 30 Days (Standard)</option>
                  <option value="45">Net 45 Days</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickClientModal(false);
                    setQcError('');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={qcSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500"
                >
                  {qcSubmitting ? 'Saving...' : 'Add Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
