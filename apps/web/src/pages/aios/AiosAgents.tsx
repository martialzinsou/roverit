/**
 * AIOS Agents - Gestion des agents IA
 * Interface Liquid Glass révolutionnaire (Apple + Google)
 * Auteur : Martial Zinsou
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card, Button, Input, Select, Field, Modal, Spinner, EmptyState, Badge } from '../../components/ui';

interface AIAgent {
  id: string;
  name: string;
  type: string;
  model: string;
  status: string;
  capabilities: string[];
  description: string;
  created_at: string;
}

export default function AiosAgents() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editAgent, setEditAgent] = useState<any | null>(null);
  const [models, setModels] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    type: 'assistant',
    model: '',
    description: '',
    capabilities: '',
    system_prompt: ''
  });

  const agentTypes = ['assistant', 'specialist', 'autonomous', 'workflow'];
  const agentStatuses = ['idle', 'running', 'paused', 'error'];

  const loadData = async () => {
    try {
      setLoading(true);
      const [agentsRes, modelsRes] = await Promise.all([
        api<any[]>('/aios/agents'),
        api<any[]>('/aios/models')
      ]);
      setAgents(agentsRes);
      setModels(modelsRes);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api('/aios/agents', {
        method: 'POST',
        body: {
          ...formData,
          capabilities: formData.capabilities.split(',').map((c: string) => c.trim()).filter(Boolean),
          system_prompt: formData.system_prompt
        }
      });
      setCreateOpen(false);
      resetForm();
      void loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur de création');
    }
  };

  const handleUpdate = async () => {
    if (!editAgent) return;
    try {
      await api(`/aios/agents/${editAgent.id}`, {
        method: 'PATCH',
        body: {
          ...formData,
          capabilities: formData.capabilities.split(',').map((c: string) => c.trim()).filter(Boolean),
          system_prompt: formData.system_prompt
        }
      });
      setEditAgent(null);
      resetForm();
      void loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur de mise à jour');
    }
  };

  const openEdit = (agent: any) => {
    setEditAgent(agent);
    setFormData({
      name: agent.name,
      type: agent.type,
      model: agent.model,
      description: agent.description,
      capabilities: agent.capabilities?.join(', ') || '',
      system_prompt: agent.system_prompt || ''
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet agent ?')) return;
    try {
      await api(`/aios/agents/${id}`, { method: 'DELETE' });
      void loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur de suppression');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'assistant',
      model: '',
      description: '',
      capabilities: '',
      system_prompt: ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Agents IA. <span className="imac-gradient-text">Essaim.</span>
          </h1>
          <p className="mt-1 text-sm text-white/60">Gestion et déploiement de vos agents autonomes</p>
          <div className="mt-1 text-xs text-white/40 font-medium">Auteur : <span className="font-semibold text-white/60">Martial Zinsou</span></div>
        </div>
        <Button variant="primary" onClick={() => { resetForm(); setCreateOpen(true); }}>
          + Nouvel Agent
        </Button>
      </div>

      {loading ? (
        <Spinner label="Chargement des agents…" />
      ) : agents.length === 0 ? (
        <EmptyState message="Aucun agent déployé. Créez votre premier agent !" />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card key={agent.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(244,63,94,0.2))' }}>
                    <span className="text-xl">🤖</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{agent.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium backdrop-blur-xl bg-purple-500/15 text-purple-300 border-purple-500/20">{agent.type}</span>
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium backdrop-blur-xl ${agent.status === 'running' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' : agent.status === 'idle' ? 'bg-amber-500/15 text-amber-300 border-amber-500/20' : 'bg-white/[0.05] text-white/40 border-white/[0.08]'}`}>
                        {agent.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-white/50 line-clamp-2">{agent.description}</div>

              <div className="flex flex-wrap gap-1">
                {agent.capabilities?.slice(0, 4).map((cap: string) => (
                  <span key={cap} className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-white/60 border border-white/[0.08]">
                    {cap}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                <div className="text-xs text-white/40">
                  Modèle : <span className="font-mono text-white/70">{agent.model}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/aios/agents/${agent.id}`} className="btn-secondary text-xs">Détails</Link>
                  <Button variant="secondary" className="text-xs" onClick={() => openEdit(agent)}>Éditer</Button>
                  <Button variant="danger" className="text-xs" onClick={() => handleDelete(agent.id)}>Supprimer</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Créer/Éditer */}
      <Modal open={createOpen || !!editAgent} onClose={() => { setCreateOpen(false); setEditAgent(null); resetForm(); }} title={editAgent ? 'Éditer Agent' : 'Nouvel Agent'}>
        <form onSubmit={editAgent ? handleUpdate : handleCreate} className="space-y-4">
          <Field label="Nom de l'agent">
            <Input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Mon Assistant IA" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type d'agent">
              <Select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
                {['assistant', 'specialist', 'autonomous', 'workflow'].map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Modèle IA">
              <Select value={formData.model} onChange={(e) => setFormData({...formData, model: e.target.value})}>
                <option value="">-- Sélectionner --</option>
                {models.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Description">
            <textarea className="input h-20" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Description de l'agent et son rôle..." />
          </Field>
          <Field label="Capacités (séparées par des virgules)">
            <Input value={formData.capabilities} onChange={(e) => setFormData({...formData, capabilities: e.target.value})} placeholder="web_search, code_execution, file_access..." />
          </Field>
          <Field label="Prompt Système (optionnel)">
            <textarea className="input h-24" value={formData.system_prompt} onChange={(e) => setFormData({...formData, system_prompt: e.target.value})} placeholder="Instructions système pour l'agent..." />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" onClick={() => { setCreateOpen(false); setEditAgent(null); resetForm(); }}>Annuler</Button>
            <Button type="submit" variant="primary">{editAgent ? 'Mettre à jour' : 'Créer l\'agent'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}