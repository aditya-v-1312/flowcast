import React, { useState, useEffect } from 'react';
import { Settings, Save, Building, CreditCard, Check, RefreshCw } from 'lucide-react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';

export const SettingsPage: React.FC = () => {
  const { user, updateUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [businessName, setBusinessName] = useState(user?.businessName || '');
  const [currency, setCurrency] = useState(user?.currency || 'INR');
  const [taxId, setTaxId] = useState(user?.taxId || '');
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState(
    user?.defaultPaymentTerms?.toString() || '30'
  );

  // Bank Details
  const [bankName, setBankName] = useState(user?.bankDetails?.bankName || '');
  const [accountHolderName, setAccountHolderName] = useState(
    user?.bankDetails?.accountHolderName || ''
  );
  const [accountNumber, setAccountNumber] = useState(user?.bankDetails?.accountNumber || '');
  const [routingOrIfsc, setRoutingOrIfsc] = useState(user?.bankDetails?.routingOrIfsc || '');
  const [upiId, setUpiId] = useState(user?.bankDetails?.upiId || '');
  const [swiftOrBic, setSwiftOrBic] = useState(user?.bankDetails?.swiftOrBic || '');

  // Address
  const [street, setStreet] = useState(user?.businessAddress?.street || '');
  const [city, setCity] = useState(user?.businessAddress?.city || '');
  const [state, setState] = useState(user?.businessAddress?.state || '');
  const [postalCode, setPostalCode] = useState(user?.businessAddress?.postalCode || '');

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setBusinessName(user.businessName || '');
      setCurrency(user.currency || 'USD');
      setTaxId(user.taxId || '');
      setDefaultPaymentTerms(user.defaultPaymentTerms?.toString() || '30');

      if (user.bankDetails) {
        setBankName(user.bankDetails.bankName || '');
        setAccountHolderName(user.bankDetails.accountHolderName || '');
        setAccountNumber(user.bankDetails.accountNumber || '');
        setRoutingOrIfsc(user.bankDetails.routingOrIfsc || '');
        setUpiId(user.bankDetails.upiId || '');
        setSwiftOrBic(user.bankDetails.swiftOrBic || '');
      }

      if (user.businessAddress) {
        setStreet(user.businessAddress.street || '');
        setCity(user.businessAddress.city || '');
        setState(user.businessAddress.state || '');
        setPostalCode(user.businessAddress.postalCode || '');
      }
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.put('/auth/profile', {
        name,
        businessName,
        currency,
        taxId,
        defaultPaymentTerms: Number(defaultPaymentTerms),
        bankDetails: {
          bankName,
          accountHolderName,
          accountNumber,
          routingOrIfsc,
          upiId,
          swiftOrBic,
        },
        businessAddress: {
          street,
          city,
          state,
          postalCode,
        },
      });

      updateUser(res.data.user);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update settings', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-emerald-400" />
          Freelancer Profile & Branding Settings
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure business details, default currencies, and payment instructions rendered on PDF invoices.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Identity */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <Building className="w-4 h-4 text-emerald-400" />
            Business Profile & Tax Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Your Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Business / Studio Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Base Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
              >
                <option value="INR">INR (₹) — Indian Rupee</option>
                <option value="USD">USD ($) — US Dollar</option>
                <option value="EUR">EUR (€) — Euro</option>
                <option value="GBP">GBP (£) — British Pound</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Default Payment Terms</label>
              <select
                value={defaultPaymentTerms}
                onChange={(e) => setDefaultPaymentTerms(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
              >
                <option value="15">Net 15 Days</option>
                <option value="30">Net 30 Days (Standard)</option>
                <option value="45">Net 45 Days</option>
                <option value="60">Net 60 Days</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">GSTIN (Indian Tax ID)</label>
              <input
                type="text"
                placeholder="e.g. 24AAACG1234F1Z8"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Bank & Payment Instructions */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            Bank & Manual Wire Transfer Instructions
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Bank Name</label>
              <input
                type="text"
                placeholder="e.g. HDFC Bank, Chase"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Account Holder Name</label>
              <input
                type="text"
                placeholder="Name on bank account"
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Account Number / IBAN</label>
              <input
                type="text"
                placeholder="Account number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Routing / IFSC Code</label>
              <input
                type="text"
                placeholder="IFSC or Routing code"
                value={routingOrIfsc}
                onChange={(e) => setRoutingOrIfsc(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">UPI ID (Instant Pay in India)</label>
              <input
                type="text"
                placeholder="e.g. username@okhdfcbank"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">SWIFT / BIC (International)</label>
              <input
                type="text"
                placeholder="SWIFT code"
                value={swiftOrBic}
                onChange={(e) => setSwiftOrBic(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-emerald-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex justify-end items-center space-x-3">
          {savedSuccess && (
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
              <Check className="w-4 h-4" />
              Settings Saved Successfully!
            </span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
