/**
 * AIOS Models - Gestion des modèles IA
 * Interface Liquid Glass révolutionnaire (Apple + Google)
 * Auteur : Martial Zinsou
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card, Button, Input, Select, Field, Modal, Spinner, EmptyState, Badge } from '../../components/ui';

interface AIModel {
  id: string;
  name: string;
  type: string;
  provider: string;
  parameters: number;
  context_length: number;
  status: string;
  cost_per_1k: number;
  created_at: string;
}

export default function AiosModels() {
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editModel, setEditModel] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    type: 'llm',
    provider: 'openai',
    parameters: 0,
    context_length: 4096,
    cost_per_1k: 0,
    api_endpoint: '',
    api_key: '',
    status: 'active'
  });

  const modelTypes = ['llm', 'embedding', 'vision', 'audio', 'multimodal'];
  const providers = ['openai', 'anthropic', 'google', 'cohere', 'huggingface', 'local', 'azure'];
  const statuses = ['active', 'deprecated', 'testing', 'archived'];

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api<any[]>('/aios/models');
      setModels(res);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredModels = models.filter(m => 
    (!statusFilter || m.status === statusFilter) &&
    (m.name.toLowerCase().includes(search.toLowerCase()) ||
     m.provider.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api('/aios/models', { method: 'POST', body: formData });
      setCreateOpen(false);
      resetForm();
      void loadData();
    } catch (err) { alert(err instanceof Error ? err.message : 'Erreur de création'); }
  }

  const handleUpdate = async () => {
    if (!editModel) return;
    try {
      await api(`/aios/models/${editModel.id}`, { method: 'PATCH', body: formData });
      setEditModel(null);
      resetForm();
      void loadData();
    } catch (err) { alert(err instanceof Error ? err.message : 'Erreur de mise à jour'); }
  }

  const openEdit = (model: any) => {
    setEditModel(model);
    setFormData({
      name: model.name,
      type: model.type,
      provider: model.provider,
      parameters: model.parameters,
      context_length: model.context_length,
      cost_per_1k: model.cost_per_1k,
      api_endpoint: model.api_endpoint || '',
      api_key: '',
      status: model.status
    });
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce modèle ?')) return;
    try {
      await api(`/aios/models/${id}`, { method: 'DELETE' });
      void loadData();
    } catch (err) { alert(err instanceof Error ? err.message : 'Erreur de suppression'); }
  }

  const resetForm = () => setFormData({
    name: '', type: 'llm', provider: 'openai', parameters: 0,
    context_length: 4096, cost_per_1k: 0, api_endpoint: '', api_key: '', status: 'active'
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Modèles IA. <span className="imac-gradient-text">Catalogue.</span>
          </h1>
          <p className="mt-1 text-sm text-white/60">Gestion de vos modèles de langage et d'embedding</p>
          <div className="mt-1 text-xs text-white/40 font-medium">Auteur : <span className="font-semibold text-white/60">Martial Zinsou</span></div>
        </div>
        <Button variant="primary" onClick={() => { resetForm(); setCreateOpen(true); }}>
          + Nouveau Modèle
        </Button>
      </div>

      {/* Filtres */}
      <Card className="flex flex-wrap items-center gap-4">
        <div className="min-w-[250px] flex-1">
          <input
            type="text"
            placeholder="Rechercher par nom, provider..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
          />
        </div>
        <div className="w-48">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tous statuts</option>
            {['active', 'deprecated', 'testing', 'archived'].map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
      </Card>

      {loading ? (
        <Spinner label="Chargement des modèles…" />
      ) : filteredModels.length === 0 ? (
        <EmptyState message="Aucun modèle trouvé." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredModels.map((model) => (
            <Card key={model.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(0,113,227,0.2), rgba(168,85,247,0.2))' }}>
                    <span className="text-xl">🧠</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{model.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium backdrop-blur-xl bg-sky-500/15 text-sky-300 border-sky-500/20">{model.type}</span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium backdrop-blur-xl bg-amber-500/15 text-amber-300 border-amber-500/20">{model.provider}</span>
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium backdrop-blur-xl ${model.status === 'active' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' : 'bg-white/[0.05] text-white/40 border-white/[0.08]'}`}>
                        {model.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="rounded-xl p-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="text-white/40">Paramètres</div>
                  <div className="font-mono text-white font-bold">{model.parameters.toLocaleString()}B</div>
                </div>
                <div className="rounded-xl p-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="text-white/40">Contexte</div>
                  <div className="font-mono text-white font-bold">{model.context_length.toLocaleString()}</div>
                </div>
                <div className="rounded-xl p-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="text-white/40">Coût/1k</div>
                  <div className="font-mono text-white font-bold">${model.cost_per_1k}/1k</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-white/60 border border-white/[0.08]">
                  {model.type}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-white/60 border border-white/[0.08]">
                  {model.provider}
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                <div className="text-xs text-white/40">
                  Créé le {new Date(model.created_at).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/aios/models/${model.id}`} className="btn-secondary text-xs">Détails</Link>
                  <Button variant="secondary" className="text-xs" onClick={() => openEdit(model)}>Éditer</Button>
                  <Button variant="danger" className="text-xs" onClick={() => handleDelete(model.id)}>Supprimer</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal open={createOpen || !!editModel} onClose={() => { setCreateOpen(false); setEditModel(null); resetForm(); }} title={editModel ? 'Éditer Modèle' : 'Nouveau Modèle'}>
        <form onSubmit={editModel ? handleUpdate : handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nom du modèle">
              <Input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Mon Modèle IA" />
            </Field>
            <Field label="Type">
              <Select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
                {['llm', 'embedding', 'vision', 'audio', 'multimodal'].map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Provider">
              <Select value={formData.provider} onChange={(e) => setFormData({...formData, provider: e.target.value})}>
                {['openai', 'anthropic', 'google', 'cohere', 'huggingface', 'local', 'azure'].map(p => <option key={p} value={p}>{p}</option>)}
              </Select>
            </Field>
            <Field label="Statut">
              <Select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                {['active', 'deprecated', 'testing', 'archived'].map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Paramètres (Milliards)">
              <Input type="number" value={formData.parameters} onChange={(e) => setFormData({...formData, parameters: parseInt(e.target.value) || 0})} placeholder="7" />
            </Field>
            <Field label="Longueur de contexte">
              <Input type="number" value={formData.context_length} onChange={(e) => setFormData({...formData, context_length: parseInt(e.target.value) || 4096})} placeholder="4096" />
            </Field>
            <Field label="Coût / 1k tokens ($)">
              <Input type="number" step="0.0001" value={formData.cost_per_1k} onChange={(e) => setFormData({...formData, cost_per_1k: parseFloat(e.target.value) || 0})} placeholder="0.002" />
            </Field>
          </div>
          <Field label="Endpoint API">
            <Input value={formData.api_endpoint} onChange={(e) => setFormData({...formData, api_endpoint: e.target.value})} placeholder="https://api.openai.com/v1" />
          </Field>
          <Field label="Clé API (laisser vide pour ne pas changer)">
            <Input type="password" value={formData.api_key} onChange={(e) => setFormData({...formData, api_key: e.target.value})} placeholder="••••••••" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" onClick={() => { setCreateOpen(false); setEditModel(null); resetForm(); }}>Annuler</Button>
            <Button type="submit" variant="primary">{editModel ? 'Mettre à jour' : 'Créer le modèle'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}