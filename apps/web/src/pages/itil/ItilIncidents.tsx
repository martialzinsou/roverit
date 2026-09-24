/**
 * Console de gestion des Incidents (ITIL Incident Management) :
 * qualification P1..P4 selon matrice impact x urgence, respect des SLA,
 * solutions de contournement (workaround) et suivi de la timeline.
 * Auteur : Martial Zinsou
 */
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Button, Input, Select, Field, Modal, Spinner, EmptyState } from '../../components/ui';
import { IncidentPriorityBadge, IncidentStatusBadge } from '../../components/StatusBadge';
import {
  calculateIncidentPriority,
  getIncidentSlaHours,
  type Incident,
  type ConfigurationItem,
  type IncidentImpact,
  type IncidentUrgency,
  type IncidentStatus,
} from '@roverit/shared';

export default function ItilIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [cis, setCis] = useState<ConfigurationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  // Modale création
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newImpact, setNewImpact] = useState<IncidentImpact>('moyen');
  const [newUrgency, setNewUrgency] = useState<IncidentUrgency>('moyenne');
  const [newCiId, setNewCiId] = useState('');
  const [newReporter, setNewReporter] = useState('');

  // Modale détail / édition
  const [selectedInc, setSelectedInc] = useState<(Incident & { timeline?: unknown[] }) | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editStatus, setEditStatus] = useState<IncidentStatus>('nouveau');
  const [editWorkaround, setEditWorkaround] = useState('');
  const [editResolution, setEditResolution] = useState('');
  const [newNote, setNewNote] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterPriority) params.set('priority', filterPriority);
      if (filterStatus) params.set('status', filterStatus);
      if (search) params.set('q', search);

      const [incRes, ciRes] = await Promise.all([
        api<Incident[]>(`/itil/incidents?${params.toString()}`),
        api<ConfigurationItem[]>('/itil/cmdb/cis'),
      ]);
      setIncidents(incRes);
      setCis(ciRes);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [filterPriority, filterStatus, search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDesc) return;
    try {
      await api('/itil/incidents', {
        method: 'POST',
        body: {
          title: newTitle,
          description: newDesc,
          impact: newImpact,
          urgency: newUrgency,
          ci_id: newCiId || null,
          reporter: newReporter || 'Utilisateur',
        },
      });
      setCreateOpen(false);
      setNewTitle('');
      setNewDesc('');
      void loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la déclaration');
    }
  };

  const openDetail = async (inc: Incident) => {
    try {
      const full = await api<Incident & { timeline: unknown[] }>(`/itil/incidents/${inc.id}`);
      setSelectedInc(full);
      setEditStatus(full.status);
      setEditWorkaround(full.workaround ?? '');
      setEditResolution(full.resolution ?? '');
      setDetailOpen(true);
    } catch {
      /* ignore */
    }
  };

  const handleUpdate = async () => {
    if (!selectedInc) return;
    try {
      await api(`/itil/incidents/${selectedInc.id}`, {
        method: 'PATCH',
        body: {
          status: editStatus,
          workaround: editWorkaround || null,
          resolution: editResolution || null,
        },
      });
      if (newNote) {
        await api(`/itil/incidents/${selectedInc.id}/timeline`, {
          method: 'POST',
          body: { notes: newNote, kind: 'commentaire' },
        });
        setNewNote('');
      }
      setDetailOpen(false);
      void loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur de mise à jour');
    }
  };

  const previewPriority = calculateIncidentPriority(newImpact, newUrgency);
  const previewSla = getIncidentSlaHours(previewPriority);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-black text-ink-100">Gestion des Incidents DSI (ITIL)</h1>
          <p className="mt-1 text-sm text-ink-400">
            Qualification de gravité, engagement de niveau de service (SLA) et rétablissement du service opérationnel.
          </p>
          <div className="mt-1 text-xs text-brand-400 font-medium">Auteur : Martial Zinsou</div>
        </div>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          + Déclarer un Incident
        </Button>
      </div>

      {/* Barre de filtres */}
      <Card className="flex flex-wrap items-center gap-4">
        <div className="min-w-[200px] flex-1">
          <Input
            placeholder="Rechercher par numéro, titre, déclarant…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
            <option value="">Toutes priorités</option>
            <option value="P1">P1 — Critique</option>
            <option value="P2">P2 — Majeur</option>
            <option value="P3">P3 — Moyen</option>
            <option value="P4">P4 — Mineur</option>
          </Select>
        </div>
        <div className="w-48">
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Tous statuts</option>
            <option value="nouveau">Nouveau</option>
            <option value="qualifie">Qualifié</option>
            <option value="en_cours">En cours</option>
            <option value="en_attente">En attente</option>
            <option value="resolu">Résolu</option>
            <option value="clos">Clos</option>
          </Select>
        </div>
      </Card>

      {/* Liste des Incidents */}
      {loading ? (
        <Spinner label="Chargement des incidents DSI…" />
      ) : incidents.length === 0 ? (
        <EmptyState message="Aucun incident correspondant aux critères." />
      ) : (
        <div className="space-y-3">
          {incidents.map((inc) => (
            <Card
              key={inc.id}
              className="cursor-pointer transition hover:border-brand-500 hover:bg-ink-850"
              onClick={() => void openDetail(inc)}
            >
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-brand-400">{inc.number}</span>
                    <IncidentPriorityBadge priority={inc.priority} />
                    <IncidentStatusBadge status={inc.status} />
                    {inc.sla_breached ? (
                      <span className="rounded bg-red-950 px-1.5 py-0.5 text-[11px] font-bold text-red-400 border border-red-800">
                        SLA Dépassé
                      </span>
                    ) : (
                      <span className="text-xs text-ink-500">Cible SLA : {inc.sla_resolution_hours}h</span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-ink-100">{inc.title}</h3>
                  <p className="line-clamp-2 text-xs text-ink-400">{inc.description}</p>
                </div>
                <div className="text-left md:text-right text-xs text-ink-400 shrink-0">
                  <div>Déclarant : <span className="text-ink-200">{inc.reporter}</span></div>
                  {inc.ci_name ? (
                    <div className="text-brand-300">CI : {inc.ci_name}</div>
                  ) : null}
                  {inc.assignee ? <div>Assigné : {inc.assignee}</div> : <div className="text-amber-400">Non assigné</div>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modale Déclaration */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Déclarer un nouvel Incident">
        <form onSubmit={handleCreate} className="space-y-4">
          <Field label="Titre de l'incident">
            <Input
              required
              placeholder="Ex: Latence réseau sur le switch cœur..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
          </Field>
          <Field label="Description détaillée & symptômes">
            <textarea
              required
              className="input h-24 w-full"
              placeholder="Décrivez les messages d'erreur et le périmètre impacté…"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Impact Métier">
              <Select value={newImpact} onChange={(e) => setNewImpact(e.target.value as IncidentImpact)}>
                <option value="critique">Critique (Bloque l'entreprise)</option>
                <option value="eleve">Élevé (Service dégradé)</option>
                <option value="moyen">Moyen (Gêne utilisateur)</option>
                <option value="faible">Faible (Impact marginal)</option>
              </Select>
            </Field>
            <Field label="Urgence Opérationnelle">
              <Select value={newUrgency} onChange={(e) => setNewUrgency(e.target.value as IncidentUrgency)}>
                <option value="critique">Critique (Immédiate)</option>
                <option value="haute">Haute (Dans l'heure)</option>
                <option value="moyenne">Moyenne (Journée)</option>
                <option value="faible">Faible (Planifiable)</option>
              </Select>
            </Field>
          </div>

          <div className="rounded-lg border border-brand-800/60 bg-brand-950/30 p-3 text-xs text-brand-300 flex items-center justify-between">
            <span>Priorité ITIL calculée automatiquement :</span>
            <div className="flex items-center gap-2">
              <IncidentPriorityBadge priority={previewPriority} />
              <span className="font-semibold text-ink-100">SLA Résolution : {previewSla}h</span>
            </div>
          </div>

          <Field label="Élément de Configuration (CI) impacté">
            <Select value={newCiId} onChange={(e) => setNewCiId(e.target.value)}>
              <option value="">-- Aucun CI rattaché --</option>
              {cis.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Déclarant / Service">
            <Input
              placeholder="Ex: Direction Financière, Jean Dupont..."
              value={newReporter}
              onChange={(e) => setNewReporter(e.target.value)}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="primary">
              Créer l'Incident
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modale Détail / Traitement */}
      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={selectedInc ? `${selectedInc.number} — ${selectedInc.title}` : 'Détail Incident'}
      >
        {selectedInc && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <IncidentPriorityBadge priority={selectedInc.priority} />
              <IncidentStatusBadge status={selectedInc.status} />
              <span className="text-xs text-ink-400">Ouvert le {new Date(selectedInc.opened_at).toLocaleString()}</span>
            </div>

            <div className="rounded-lg bg-ink-950 p-3 text-ink-300 text-xs">
              <div className="font-semibold text-ink-200 mb-1">Description :</div>
              {selectedInc.description}
            </div>

            <Field label="Statut de l'incident">
              <Select value={editStatus} onChange={(e) => setEditStatus(e.target.value as IncidentStatus)}>
                <option value="nouveau">Nouveau</option>
                <option value="qualifie">Qualifié</option>
                <option value="en_cours">En cours de résolution</option>
                <option value="en_attente">En attente tiers / usager</option>
                <option value="resolu">Résolu</option>
                <option value="clos">Clos</option>
              </Select>
            </Field>

            <Field label="Solution de contournement (Workaround)">
              <Input
                placeholder="Procédure provisoire pour restaurer le service..."
                value={editWorkaround}
                onChange={(e) => setEditWorkaround(e.target.value)}
              />
            </Field>

            <Field label="Résolution définitive">
              <Input
                placeholder="Cause traitée et validation de reprise..."
                value={editResolution}
                onChange={(e) => setEditResolution(e.target.value)}
              />
            </Field>

            <Field label="Ajouter une note de suivi (Timeline)">
              <Input
                placeholder="Action menée, test effectué..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
            </Field>

            <div className="flex justify-end gap-2 pt-3 border-t border-ink-800">
              <Button onClick={() => setDetailOpen(false)}>Fermer</Button>
              <Button variant="primary" onClick={() => void handleUpdate()}>
                Enregistrer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
