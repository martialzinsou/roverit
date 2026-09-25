/**
 * AIOS Workflows - Orchestration de workflows IA
 * Interface Liquid Glass révolutionnaire (Apple + Google)
 * Auteur : Martial Zinsou
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card, Button, Input, Select, Field, Modal, Spinner, EmptyState, Badge } from '../../components/ui';

interface AIWorkflow {
  id: string;
  name: string;
  description: string;
  status: string;
  nodes: any[];
  edges: any[];
  schedule: string;
  last_run: string | null;
  next_run: string | null;
  created_at: string;
}

export default function AiosWorkflows() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editWorkflow, setEditWorkflow] = useState<any | null>(null);
  const [models, setModels] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'draft',
    schedule: '',
    nodes: [],
    edges: []
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [wfRes, modelsRes, agentsRes] = await Promise.all([
        api<any[]>('/aios/workflows'),
        api<any[]>('/aios/models'),
        api<any[]>('/aios/agents')
      ]);
      setWorkflows(wfRes);
      setModels(modelsRes);
      setAgents(agentsRes);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api('/aios/workflows', { method: 'POST', body: formData });
      setCreateOpen(false);
      resetForm();
      void loadData();
    } catch (err) { alert(err instanceof Error ? err.message : 'Erreur de création'); }
  }

  const resetForm = () => setFormData({
    name: '', description: '', status: 'draft', schedule: '', nodes: [], edges: []
  });

  const openEdit = (wf: any) => {
    setEditWorkflow(wf);
    setFormData({ ...wf });
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce workflow ?')) return;
    try {
      await api(`/aios/workflows/${id}`, { method: 'DELETE' });
      void loadData();
    } catch (err) { alert(err instanceof Error ? err.message : 'Erreur de suppression'); }
  }

  const executeWorkflow = async (id: string) => {
    try {
      await api(`/aios/workflows/${id}/execute`, { method: 'POST' });
      void loadData();
    } catch (err) { alert(err instanceof Error ? err.message : 'Erreur d\'exécution'); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Workflows IA. <span className="imac-gradient-text">Orchestration.</span>
          </h1>
          <p className="mt-1 text-sm text-white/60">Créer, planifier et exécuter vos workflows d'IA</p>
          <div className="mt-1 text-xs text-white/40 font-medium">Auteur : <span className="font-semibold text-white/60">Martial Zinsou</span></div>
        </div>
        <Button variant="primary" onClick={() => { resetForm(); setCreateOpen(true); }}>
          + Nouveau Workflow
        </Button>
      </div>

      {loading ? (
        <Spinner label="Chargement des workflows…" />
      ) : workflows.length === 0 ? (
        <EmptyState message="Aucun workflow créé. Concevez votre premier pipeline IA !" />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflows.map((wf) => (
            <Card key={wf.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white">{wf.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium backdrop-blur-xl ${wf.status === 'active' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' : wf.status === 'draft' ? 'bg-white/[0.05] text-white/40 border-white/[0.08]' : 'bg-amber-500/15 text-amber-300 border-amber-500/20'}`}>
                      {wf.status}
                    </span>
                    <span className="text-xs text-white/40">{wf.nodes?.length || 0} nœuds • {wf.edges?.length || 0} connexions</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-white/50 line-clamp-2">{wf.description}</p>

              <div className="grid grid-cols-3 gap-3 text-xs pt-2 border-t border-white/[0.06]">
                <div className="rounded-xl p-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="text-white/40">Dernière exécution</div>
                  <div className="font-mono text-white/70">{wf.last_run ? new Date(wf.last_run).toLocaleDateString() : 'Jamais'}</div>
                </div>
                <div className="rounded-xl p-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="text-white/40">Prochaine</div>
                  <div className="font-mono text-white/70">{wf.next_run ? new Date(wf.next_run).toLocaleDateString() : 'Non planifié'}</div>
                </div>
                <div className="rounded-xl p-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="text-white/40">Nœuds</div>
                  <div className="font-mono text-white font-bold">{wf.nodes?.length || 0}</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Button variant={wf.status === 'active' ? 'secondary' : 'primary'} className="text-xs" onClick={() => executeWorkflow(wf.id)}>
                    {wf.status === 'active' ? '⏸ Pause' : '▶ Exécuter'}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/aios/workflows/${wf.id}`} className="btn-secondary text-xs">Éditeur</Link>
                  <Button variant="secondary" className="text-xs" onClick={() => { setEditWorkflow(wf); }}>Éditer</Button>
                  <Button variant="danger" className="text-xs" onClick={() => handleDelete(wf.id)}>Supprimer</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => { setCreateOpen(false); resetForm(); }} title="Nouveau Workflow">
        <form onSubmit={(e) => { e.preventDefault(); handleCreate(e); }} className="space-y-4">
          <Field label="Nom du workflow">
            <Input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Mon Workflow IA" />
          </Field>
          <Field label="Description">
            <textarea className="input h-20" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Description du workflow..." />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Statut">
              <Select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                <option value="draft">Brouillon</option>
                <option value="active">Actif</option>
                <option value="paused">En pause</option>
              </Select>
            </Field>
            <Field label="Planification (Cron)">
              <Input value={formData.schedule} onChange={(e) => setFormData({...formData, schedule: e.target.value})} placeholder="0 2 * * *" />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" onClick={() => { setCreateOpen(false); resetForm(); }}>Annuler</Button>
            <Button type="submit" variant="primary">Créer le Workflow</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}