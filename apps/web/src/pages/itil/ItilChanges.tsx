/**
 * Gestion des Changements & CAB (ITIL Change Enablement / Management) :
 * demandes de changement (RFC), évaluation des risques, plans de retour arrière (rollback),
 * calendrier de maintenance et vote du comité consultatif (CAB).
 * Auteur : Martial Zinsou
 */
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Button, Input, Select, Field, Modal, Spinner, EmptyState } from '../../components/ui';
import { ChangeStatusBadge, ChangeRiskBadge } from '../../components/StatusBadge';
import {
  CHANGE_TYPE_LABELS,
  type ChangeRequest,
  type CabApproval,
  type ChangeType,
  type ChangeRisk,
  type ChangeStatus,
} from '@roverit/shared';

export default function ItilChanges() {
  const [changes, setChanges] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modale nouveau RFC
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [changeType, setChangeType] = useState<ChangeType>('normal');
  const [riskLevel, setRiskLevel] = useState<ChangeRisk>('modere');
  const [reason, setReason] = useState('');
  const [impactAnalysis, setImpactAnalysis] = useState('');
  const [rollbackPlan, setRollbackPlan] = useState('');
  const [scheduledStart, setScheduledStart] = useState('');

  // Modale détail / vote CAB
  const [selectedChange, setSelectedChange] = useState<(ChangeRequest & { cab_votes?: CabApproval[] }) | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [voteDecision, setVoteDecision] = useState<'pour' | 'contre' | 'abstention'>('pour');
  const [voteComment, setVoteComment] = useState('');
  const [newStatus, setNewStatus] = useState<ChangeStatus>('soumis');

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('change_type', typeFilter);

      const res = await api<ChangeRequest[]>(`/itil/changes?${params.toString()}`);
      setChanges(res);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [statusFilter, typeFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !reason || !rollbackPlan) return;
    try {
      await api('/itil/changes', {
        method: 'POST',
        body: {
          title,
          description,
          change_type: changeType,
          risk_level: riskLevel,
          reason,
          impact_analysis: impactAnalysis || 'Analyse d’impact préliminaire',
          rollback_plan: rollbackPlan,
          scheduled_start: scheduledStart || null,
        },
      });
      setCreateOpen(false);
      setTitle('');
      setDescription('');
      setReason('');
      setRollbackPlan('');
      void loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur de création du changement');
    }
  };

  const openDetail = async (ch: ChangeRequest) => {
    try {
      const full = await api<ChangeRequest & { cab_votes: CabApproval[] }>(`/itil/changes/${ch.id}`);
      setSelectedChange(full);
      setNewStatus(full.status);
      setDetailOpen(true);
    } catch {
      /* ignore */
    }
  };

  const handleVote = async () => {
    if (!selectedChange) return;
    try {
      await api(`/itil/changes/${selectedChange.id}/cab-vote`, {
        method: 'POST',
        body: { decision: voteDecision, comment: voteComment || null },
      });
      setVoteComment('');
      void openDetail(selectedChange);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors du vote');
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedChange) return;
    try {
      await api(`/itil/changes/${selectedChange.id}`, {
        method: 'PATCH',
        body: { status: newStatus },
      });
      setDetailOpen(false);
      void loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur de statut');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-black text-ink-100">Gestion des Changements (RFC & CAB)</h1>
          <p className="mt-1 text-sm text-ink-400">
            Contrôle des évolutions d'infrastructure, analyse d'impact, comités consultatifs et réversibilité.
          </p>
          <div className="mt-1 text-xs text-brand-400 font-medium">Auteur : Martial Zinsou</div>
        </div>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          + Demande de Changement (RFC)
        </Button>
      </div>

      {/* Filtres */}
      <Card className="flex flex-wrap items-center gap-4">
        <div className="w-56">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tous statuts</option>
            <option value="soumis">Soumis</option>
            <option value="analyse_impact">Analyse d'impact</option>
            <option value="en_attente_cab">En attente revue CAB</option>
            <option value="approuve">Approuvé par le CAB</option>
            <option value="applique">Appliqué avec succès</option>
            <option value="rejete">Rejeté</option>
            <option value="echec">Échec / Rollback</option>
          </Select>
        </div>
        <div className="w-64">
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">Tous types de changements</option>
            {Object.entries(CHANGE_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {/* Liste des RFC */}
      {loading ? (
        <Spinner label="Chargement des demandes de changement…" />
      ) : changes.length === 0 ? (
        <EmptyState message="Aucune demande de changement trouvée." />
      ) : (
        <div className="space-y-3">
          {changes.map((ch) => (
            <Card
              key={ch.id}
              className="cursor-pointer transition hover:border-brand-500 hover:bg-ink-850"
              onClick={() => void openDetail(ch)}
            >
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-sky-400">{ch.number}</span>
                    <ChangeStatusBadge status={ch.status} />
                    <ChangeRiskBadge risk={ch.risk_level} />
                    <span className="text-xs text-ink-400">
                      {CHANGE_TYPE_LABELS[ch.change_type]?.split('(')[0] ?? ch.change_type}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-ink-100">{ch.title}</h3>
                  <p className="line-clamp-2 text-xs text-ink-400">{ch.reason}</p>
                </div>
                <div className="text-left md:text-right text-xs text-ink-400 shrink-0">
                  <div>Demandeur : <span className="text-ink-200">{ch.requester}</span></div>
                  {ch.scheduled_start && <div>Prévu : {new Date(ch.scheduled_start).toLocaleDateString()}</div>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modale Nouveau RFC */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Créer une Demande de Changement (RFC)">
        <form onSubmit={handleCreate} className="space-y-4">
          <Field label="Intitulé du changement">
            <Input
              required
              placeholder="Ex: Migration noyau PostgreSQL 16..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field label="Description technique">
            <textarea
              required
              className="input h-20 w-full"
              placeholder="Détail des opérations et composants modifiés…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Catégorie ITIL">
              <Select value={changeType} onChange={(e) => setChangeType(e.target.value as ChangeType)}>
                <option value="normal">Changement Normal (Exige revue CAB)</option>
                <option value="standard">Changement Standard (Pré-approuvé)</option>
                <option value="urgent">Changement d'Urgence (ECAB / Incident majeur)</option>
              </Select>
            </Field>
            <Field label="Niveau de Risque">
              <Select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value as ChangeRisk)}>
                <option value="faible">Risque Faible</option>
                <option value="modere">Risque Modéré</option>
                <option value="eleve">Risque Élevé</option>
                <option value="critique">Risque Critique</option>
              </Select>
            </Field>
          </div>
          <Field label="Motif / Justification business">
            <Input
              required
              placeholder="Ex: Correctif CVE sécurité, optimisation performances..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <Field label="Analyse d'impact & temps d'indisponibilité prévisible">
            <Input
              placeholder="Ex: Coupure de 3 minutes lors du switchover de la VM..."
              value={impactAnalysis}
              onChange={(e) => setImpactAnalysis(e.target.value)}
            />
          </Field>
          <Field label="Plan de retour arrière (Rollback Plan - Obligatoire ITIL)">
            <textarea
              required
              className="input h-20 w-full"
              placeholder="Procédure pas-à-pas pour restaurer l'état antérieur en cas d'échec…"
              value={rollbackPlan}
              onChange={(e) => setRollbackPlan(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="primary">
              Soumettre la RFC
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modale Détail RFC + Vote CAB */}
      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={selectedChange ? `${selectedChange.number} — ${selectedChange.title}` : 'Revue RFC'}
      >
        {selectedChange && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-2">
              <ChangeStatusBadge status={selectedChange.status} />
              <ChangeRiskBadge risk={selectedChange.risk_level} />
              <span className="text-xs text-ink-400">Demandé par {selectedChange.requester}</span>
            </div>

            <div className="space-y-2 rounded-lg bg-ink-950 p-3 text-xs text-ink-300">
              <div><span className="font-semibold text-ink-200">Motif :</span> {selectedChange.reason}</div>
              <div><span className="font-semibold text-ink-200">Analyse d'impact :</span> {selectedChange.impact_analysis}</div>
              <div className="rounded border border-red-900/50 bg-red-950/30 p-2 text-red-200">
                <span className="font-bold text-red-400">Plan de Rollback :</span> {selectedChange.rollback_plan}
              </div>
            </div>

            {/* Section Vote CAB */}
            <div className="rounded-lg border border-ink-800 p-3 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink-300">
                Avis du Comité Consultatif des Changements (CAB)
              </h4>
              <div className="flex items-center gap-2">
                <Select
                  value={voteDecision}
                  onChange={(e) => setVoteDecision(e.target.value as 'pour' | 'contre' | 'abstention')}
                  className="w-36"
                >
                  <option value="pour">Pour</option>
                  <option value="contre">Contre</option>
                  <option value="abstention">Abstention</option>
                </Select>
                <Input
                  placeholder="Commentaire de vote..."
                  value={voteComment}
                  onChange={(e) => setVoteComment(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={() => void handleVote()}>Voter</Button>
              </div>

              {selectedChange.cab_votes && selectedChange.cab_votes.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-ink-800">
                  {selectedChange.cab_votes.map((v) => (
                    <div key={v.id} className="flex items-center justify-between text-xs text-ink-400">
                      <div>
                        <span className="font-semibold text-ink-200">{v.user_name}</span> :{' '}
                        <span
                          className={
                            v.decision === 'pour'
                              ? 'text-emerald-400 font-bold'
                              : v.decision === 'contre'
                              ? 'text-red-400 font-bold'
                              : 'text-ink-400'
                          }
                        >
                          {v.decision.toUpperCase()}
                        </span>{' '}
                        {v.comment ? `(${v.comment})` : ''}
                      </div>
                      <span className="text-[11px] text-ink-500">{new Date(v.voted_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Statut d'avancement */}
            <div className="flex items-center gap-3 pt-2">
              <Field label="Mise à jour du statut RFC">
                <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value as ChangeStatus)}>
                  <option value="soumis">Soumis</option>
                  <option value="analyse_impact">Analyse d'impact</option>
                  <option value="en_attente_cab">En attente revue CAB</option>
                  <option value="approuve">Approuvé par le CAB</option>
                  <option value="en_cours_deploiement">En cours de déploiement</option>
                  <option value="applique">Appliqué avec succès</option>
                  <option value="rejete">Rejeté</option>
                  <option value="echec">Échec / Rollback</option>
                  <option value="clos">Clos</option>
                </Select>
              </Field>
              <Button variant="primary" className="mt-5" onClick={() => void handleUpdateStatus()}>
                Mettre à jour
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
