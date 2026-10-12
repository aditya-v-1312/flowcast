import React, { useEffect, useState } from 'react';
import {
  FolderKanban,
  Plus,
  CheckCircle2,
  Clock,
  Trash2,
  DollarSign,
  Building,
  RefreshCw,
} from 'lucide-react';
import api from '../api/client.js';
import { IProject, IClient } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';

export const ProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<IProject[]>([]);
  const [clients, setClients] = useState<IClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [billingType, setBillingType] = useState<'FIXED_FEE' | 'HOURLY' | 'RETAINER'>('FIXED_FEE');
  const [rate, setRate] = useState('');
  const [description, setDescription] = useState('');
  const [milestones, setMilestones] = useState<{ name: string; amount: number }[]>([
    { name: 'Initial Milestone / Sprint 1', amount: 1000 },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const fetchProjectsAndClients = async () => {
    try {
      setLoading(true);
      const [projRes, clientRes] = await Promise.all([
        api.get('/projects'),
        api.get('/clients'),
      ]);
      setProjects(projRes.data.projects);
      setClients(clientRes.data.clients);
      if (clientRes.data.clients.length > 0 && !clientId) {
        setClientId(clientRes.data.clients[0]._id);
      }
    } catch (err) {
      console.error('Failed to load projects', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectsAndClients();
  }, []);

  const handleAddMilestone = () => {
    setMilestones([...milestones, { name: '', amount: 0 }]);
  };

  const handleUpdateMilestone = (index: number, field: string, val: any) => {
    const updated = [...milestones];
    (updated[index] as any)[field] = val;
    setMilestones(updated);
  };

  const handleRemoveMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !clientId || !rate) return;

    try {
      setSubmitting(true);
      await api.post('/projects', {
        name,
        clientId,
        billingType,
        rate: Number(rate),
        description,
        milestones: milestones.filter((m) => m.name && m.amount > 0),
      });

      setShowAddModal(false);
      setName('');
      setDescription('');
      setRate('');
      setMilestones([{ name: 'Initial Milestone', amount: 1000 }]);
      fetchProjectsAndClients();
    } catch (err) {
      console.error('Failed to create project', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!window.confirm('Delete this project?')) return;
    try {
      await api.delete(`/projects/${id}`);
      fetchProjectsAndClients();
    } catch (err) {
      console.error('Failed to delete project', err);
    }
  };

  const currency = user?.currency || 'USD';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <FolderKanban className="w-6 h-6 text-emerald-400" />
            Projects & Milestone Tracking
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Organize freelance contracts, attach hourly or fixed rates, and track deliverables.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-600/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-16 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-16 text-center text-slate-400 space-y-3">
          <FolderKanban className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm">No active projects created yet.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-xs font-semibold text-emerald-400 hover:underline"
          >
            + Create your first project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {projects.map((proj) => {
            const client: any = proj.clientId;
            return (
              <div
                key={proj._id}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition flex flex-col justify-between space-y-5"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2 inline-block">
                        {proj.billingType}
                      </span>
                      <h3 className="text-lg font-bold text-white">{proj.name}</h3>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-500" />
                        {client?.name} {client?.companyName ? `(${client.companyName})` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteProject(proj._id)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {proj.description && (
                    <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                      {proj.description}
                    </p>
                  )}

                  {/* Milestones list */}
                  <div className="mt-4 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      Contract Milestones
                    </span>
                    {proj.milestones.length === 0 ? (
                      <p className="text-xs text-slate-600">No specific milestones defined.</p>
                    ) : (
                      proj.milestones.map((m, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs"
                        >
                          <div className="flex items-center space-x-2">
                            {m.isBilled ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                            )}
                            <span className={m.isBilled ? 'line-through text-slate-500' : 'text-slate-200'}>
                              {m.name}
                            </span>
                          </div>
                          <span className="font-bold text-white">
                            {currency} {m.amount.toLocaleString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-xs">
                  <span className="text-slate-400">
                    Rate: <strong className="text-white">{currency} {proj.rate}</strong>{' '}
                    {proj.billingType === 'HOURLY' ? '/hr' : 'Total'}
                  </span>
                  <span className="font-semibold text-slate-400 uppercase text-[11px]">
                    Status: <strong className="text-emerald-400">{proj.status}</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Project Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-emerald-400" />
                Create New Project
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Telehealth Mobile App"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Client *</label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
                  >
                    {clients.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Billing Type</label>
                  <select
                    value={billingType}
                    onChange={(e) => setBillingType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
                  >
                    <option value="FIXED_FEE">Fixed Project Fee</option>
                    <option value="HOURLY">Hourly Billing</option>
                    <option value="RETAINER">Monthly Retainer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Rate / Total Fee ({currency}) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 5000"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Project Scope Description</label>
                <textarea
                  rows={2}
                  placeholder="Deliverables, technologies, and deadlines..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Milestones in Modal */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Milestones
                  </label>
                  <button
                    type="button"
                    onClick={handleAddMilestone}
                    className="text-xs text-emerald-400 hover:underline"
                  >
                    + Add Milestone
                  </button>
                </div>
                {milestones.map((m, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Milestone name"
                      value={m.name}
                      onChange={(e) => handleUpdateMilestone(idx, 'name', e.target.value)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs"
                    />
                    <input
                      type="number"
                      placeholder="Amount"
                      value={m.amount}
                      onChange={(e) => handleUpdateMilestone(idx, 'amount', Number(e.target.value))}
                      className="w-24 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveMilestone(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
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
                  {submitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
