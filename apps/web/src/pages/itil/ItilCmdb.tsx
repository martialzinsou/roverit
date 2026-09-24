/**
 * CMDB & Éléments de Configuration (ITIL Service Asset & Configuration Management) :
 * cartographie des actifs DSI (serveurs, réseaux, bases, applications, postes de travail)
 * et gestion des liens de dépendances entre CIs.
 * Auteur : Martial Zinsou
 */
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Button, Input, Select, Field, Modal, Spinner, EmptyState } from '../../components/ui';
import { CiStatusBadge, CiCriticalityBadge } from '../../components/StatusBadge';
import {
  CI_TYPE_LABELS,
  CI_RELATION_LABELS,
  type ConfigurationItem,
  type CiRelation,
  type CiType,
  type CiStatus,
  type CiCriticality,
  type CiRelationType,
} from '@roverit/shared';

export default function ItilCmdb() {
  const [cis, setCis] = useState<ConfigurationItem[]>([]);
  const [relations, setRelations] = useState<CiRelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [criticalityFilter, setCriticalityFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modale nouveau CI
  const [ciModalOpen, setCiModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<CiType>('server');
  const [newModel, setNewModel] = useState('');
  const [newSerial, setNewSerial] = useState('');
  const [newStatus, setNewStatus] = useState<CiStatus>('en_service');
  const [newCriticality, setNewCriticality] = useState<CiCriticality>('standard');
  const [newSite, setNewSite] = useState('');
  const [newIp, setNewIp] = useState('');
  const [newOwner, setNewOwner] = useState('');

  // Modale nouvelle relation
  const [relModalOpen, setRelModalOpen] = useState(false);
  const [sourceCiId, setSourceCiId] = useState('');
  const [targetCiId, setTargetCiId] = useState('');
  const [relType, setRelType] = useState<CiRelationType>('depend_de');
  const [relNotes, setRelNotes] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      if (criticalityFilter) params.set('criticality', criticalityFilter);
      if (search) params.set('q', search);

      const [ciRes, relRes] = await Promise.all([
        api<ConfigurationItem[]>(`/itil/cmdb/cis?${params.toString()}`),
        api<CiRelation[]>('/itil/cmdb/relations'),
      ]);
      setCis(ciRes);
      setRelations(relRes);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [typeFilter, criticalityFilter, search]);

  const handleCreateCi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    try {
      await api('/itil/cmdb/cis', {
        method: 'POST',
        body: {
          name: newName,
          type: newType,
          model: newModel || null,
          serial: newSerial || null,
          status: newStatus,
          criticality: newCriticality,
          site: newSite || null,
          ip_address: newIp || null,
          owner: newOwner || null,
        },
      });
      setCiModalOpen(false);
      setNewName('');
      void loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur de création du CI');
    }
  };

  const handleCreateRel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceCiId || !targetCiId || sourceCiId === targetCiId) {
      alert('Veuillez sélectionner deux CIs distincts');
      return;
    }
    try {
      await api('/itil/cmdb/relations', {
        method: 'POST',
        body: {
          source_ci_id: sourceCiId,
          target_ci_id: targetCiId,
          relation_type: relType,
          notes: relNotes || null,
        },
      });
      setRelModalOpen(false);
      setRelNotes('');
      void loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur de création de la relation');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-black text-ink-100">CMDB · Éléments de Configuration (CIs)</h1>
          <p className="mt-1 text-sm text-ink-400">
            Base de données de gestion des configurations (SACM ITIL v4) et relations d'interdépendance.
          </p>
          <div className="mt-1 text-xs text-brand-400 font-medium">Auteur : Martial Zinsou</div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setRelModalOpen(true)}>+ Nouvelle Relation</Button>
          <Button variant="primary" onClick={() => setCiModalOpen(true)}>
            + Nouveau CI
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card className="flex flex-wrap items-center gap-4">
        <div className="min-w-[200px] flex-1">
          <Input
            placeholder="Rechercher par nom, modèle, IP, série…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">Tous types</option>
            {Object.entries(CI_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-44">
          <Select value={criticalityFilter} onChange={(e) => setCriticalityFilter(e.target.value)}>
            <option value="">Toutes criticités</option>
            <option value="vitale">Vitale</option>
            <option value="critique">Critique</option>
            <option value="importante">Importante</option>
            <option value="standard">Standard</option>
          </Select>
        </div>
      </Card>

      {/* Cartographie des relations */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between border-b border-ink-800 pb-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink-300">
            Cartographie des Dépendances DSI ({relations.length} relations actives)
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {relations.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-lg border border-ink-800 bg-ink-950/60 p-2.5 text-xs"
            >
              <div className="font-semibold text-ink-200">{r.source_ci_name}</div>
              <div className="px-2 py-0.5 rounded bg-brand-950 text-brand-400 font-mono text-[11px] border border-brand-800/60">
                {CI_RELATION_LABELS[r.relation_type as CiRelationType] ?? r.relation_type}
              </div>
              <div className="font-semibold text-ink-200">{r.target_ci_name}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Liste des CIs */}
      {loading ? (
        <Spinner label="Chargement de la CMDB…" />
      ) : cis.length === 0 ? (
        <EmptyState message="Aucun élément de configuration trouvé." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cis.map((ci) => (
            <Card key={ci.id} className="flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-ink-400">
                    {CI_TYPE_LABELS[ci.type] ?? ci.type}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <CiCriticalityBadge criticality={ci.criticality} />
                    <CiStatusBadge status={ci.status} />
                  </div>
                </div>
                <h3 className="text-base font-bold text-ink-100">{ci.name}</h3>
                {ci.model && <div className="text-xs text-ink-300 mt-0.5">{ci.model}</div>}
                {ci.notes && <div className="text-xs text-ink-500 mt-2 line-clamp-2">{ci.notes}</div>}
              </div>

              <div className="border-t border-ink-800 pt-2 text-[11px] text-ink-400 space-y-0.5">
                {ci.ip_address && (
                  <div>
                    IP : <span className="font-mono text-ink-200">{ci.ip_address}</span>
                  </div>
                )}
                {ci.site && <div>Localisation : {ci.site}</div>}
                {ci.owner && <div>Propriétaire : {ci.owner}</div>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modale Nouveau CI */}
      <Modal open={ciModalOpen} onClose={() => setCiModalOpen(false)} title="Ajouter un Élément de Configuration (CI)">
        <form onSubmit={handleCreateCi} className="space-y-4">
          <Field label="Nom du CI">
            <Input
              required
              placeholder="Ex: Cluster DB PostgreSQL 16..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type d'actif">
              <Select value={newType} onChange={(e) => setNewType(e.target.value as CiType)}>
                {Object.entries(CI_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Criticité Métier">
              <Select value={newCriticality} onChange={(e) => setNewCriticality(e.target.value as CiCriticality)}>
                <option value="vitale">Vitale (Cœur de métier)</option>
                <option value="critique">Critique</option>
                <option value="importante">Importante</option>
                <option value="standard">Standard</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Modèle / Version">
              <Input
                placeholder="Ex: Dell PowerEdge R750..."
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
              />
            </Field>
            <Field label="Numéro de série / Asset Tag">
              <Input
                placeholder="Ex: SN-2024-8841..."
                value={newSerial}
                onChange={(e) => setNewSerial(e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Adresse IP">
              <Input
                placeholder="10.0.x.x..."
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
              />
            </Field>
            <Field label="Site / Emplacement">
              <Input
                placeholder="Ex: Datacenter Baie A..."
                value={newSite}
                onChange={(e) => setNewSite(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Équipe propriétaire / Responsable">
            <Input
              placeholder="Ex: Équipe Systèmes & Virtualisation..."
              value={newOwner}
              onChange={(e) => setNewOwner(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" onClick={() => setCiModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="primary">
              Créer le CI
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modale Nouvelle Relation */}
      <Modal
        open={relModalOpen}
        onClose={() => setRelModalOpen(false)}
        title="Créer une liaison d'interdépendance"
      >
        <form onSubmit={handleCreateRel} className="space-y-4">
          <Field label="CI Source">
            <Select value={sourceCiId} onChange={(e) => setSourceCiId(e.target.value)}>
              <option value="">-- Sélectionner CI source --</option>
              {cis.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Type de dépendance ITIL">
            <Select value={relType} onChange={(e) => setRelType(e.target.value as CiRelationType)}>
              {Object.entries(CI_RELATION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="CI Cible">
            <Select value={targetCiId} onChange={(e) => setTargetCiId(e.target.value)}>
              <option value="">-- Sélectionner CI cible --</option>
              {cis.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Notes techniques">
            <Input
              placeholder="Ex: Agrégation LACP 2x10G, cluster actif/passif..."
              value={relNotes}
              onChange={(e) => setRelNotes(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" onClick={() => setRelModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="primary">
              Enregistrer la relation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
