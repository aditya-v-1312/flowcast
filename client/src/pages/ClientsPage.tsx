import React, { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  Mail,
  Phone,
  Building,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import api from '../api/client.js';
import { IClient } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';

export const ClientsPage: React.FC = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<IClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [customPaymentTerms, setCustomPaymentTerms] = useState('30');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await api.get('/clients');
      setClients(res.data.clients);
    } catch (err) {
      console.error('Failed to load clients', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const [modalError, setModalError] = useState('');

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      setModalError('Contact Name and Billing Email are required.');
      return;
    }

    try {
      setSubmitting(true);
      setModalError('');
      const res = await api.post('/clients', {
        name: name.trim(),
        companyName: companyName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        customPaymentTerms: Number(customPaymentTerms) || 30,
        notes: notes.trim(),
      });

      setShowAddModal(false);
      setName('');
      setCompanyName('');
      setEmail('');
      setPhone('');
      setNotes('');
      // Update client list
      if (res.data?.client) {
        setClients((prev) => [res.data.client, ...prev]);
      } else {
        fetchClients();
      }
    } catch (err: any) {
      console.error('Failed to create client', err);
      setModalError(
        err.response?.data?.message || 'Failed to create client. Please ensure you are logged in.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!window.confirm('Archive this client profile?')) return;
    try {
      await api.delete(`/clients/${id}`);
      fetchClients();
    } catch (err) {
      console.error('Failed to archive client', err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-emerald-400" />
            Client Directory & Reliability Scores
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Tracks client profiles alongside calculated payment delay factors used for forecasting.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-600/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Client</span>
        </button>
      </div>

      {/* Clients Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-16 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-16 text-center text-slate-400 space-y-3">
          <Users className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm">No client profiles created yet.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-xs font-semibold text-emerald-400 hover:underline"
          >
            + Create your first client
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {clients.map((c) => {
            const delay = c.avgPaymentDelayDays || 0;
            const score = c.reliabilityScore !== undefined ? c.reliabilityScore : 100;

            const isHighRisk = delay > 15 || score < 60;
            const isMildDelay = delay > 3 && delay <= 15;

            return (
              <div
                key={c._id}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white">{c.name}</h3>
                      {c.companyName && (
                        <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <Building className="w-3 h-3 text-slate-500" />
                          {c.companyName}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteClient(c._id)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                      title="Archive Client"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Reliability Badge Card */}
                  <div className="mt-4 p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        Avg Payment Delay:
                      </span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                          isHighRisk
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : isMildDelay
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {delay > 0 ? `+${delay} Days Late` : 'On Time (0d)'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                        Reliability Score:
                      </span>
                      <span className="font-bold text-white">{score} / 100</span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-slate-400">
                    <p className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span className="truncate">{c.email}</span>
                    </p>
                    {c.phone && (
                      <p className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>{c.phone}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between">
                  <span>Terms: Net {c.customPaymentTerms || 30} Days</span>
                  <span>Currency: {c.defaultCurrency || 'INR'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                Add New Client
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setModalError('');
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateClient} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Contact Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Jenkins"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Company Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Apex Fintech"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Billing Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="sarah@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Phone (Optional)</label>
                  <input
                    type="text"
                    placeholder="+1 555 0192"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Default Payment Terms (Days)</label>
                <select
                  value={customPaymentTerms}
                  onChange={(e) => setCustomPaymentTerms(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
                >
                  <option value="15">Net 15 Days</option>
                  <option value="30">Net 30 Days (Standard)</option>
                  <option value="45">Net 45 Days</option>
                  <option value="60">Net 60 Days</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Internal Notes</label>
                <textarea
                  rows={2}
                  placeholder="Special billing instructions or contract references..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 shadow-lg shadow-emerald-600/20"
                >
                  {submitting ? 'Creating...' : 'Save Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
