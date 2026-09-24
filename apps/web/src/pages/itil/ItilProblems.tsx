/**
 * Gestion des Problèmes & KEDB (ITIL Problem Management & Known Error Database) :
 * analyse des causes racines (RCA), capitalisation des solutions de contournement
 * et moteur de recherche d'erreurs connues pour résolution rapide des incidents.
 * Auteur : Martial Zinsou
 */
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Button, Input, Select, Field, Modal, Spinner, EmptyState } from '../../components/ui';
import {
  PROBLEM_STATUS_LABELS,
  type Problem,
  type KedbArticle,
  type ProblemStatus,
} from '@roverit/shared';

export default function ItilProblems() {
  const [tab, setTab] = useState<'problems' | 'kedb'>('problems');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [articles, setArticles] = useState<KedbArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKedb, setSearchKedb] = useState('');

  // Modale nouveau problème
  const [newProbOpen, setNewProbOpen] = useState(false);
  const [pTitle, setPTitle] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pRootCause, setPRootCause] = useState('');
  const [pWorkaround, setPWorkaround] = useState('');
  const [pSolution, setPSolution] = useState('');

  // Modale nouvel article KEDB
  const [newKbOpen, setNewKbOpen] = useState(false);
  const [kbTitle, setKbTitle] = useState('');
  const [kbSymptoms, setKbSymptoms] = useState('');
  const [kbRootCause, setKbRootCause] = useState('');
  const [kbWorkaround, setKbWorkaround] = useState('');
  const [kbFix, setKbFix] = useState('');
  const [kbCategory, setKbCategory] = useState('Matériel & Postes');

  const loadData = async () => {
    try {
      setLoading(true);
      const [probRes, kbRes] = await Promise.all([
        api<Problem[]>('/itil/problems'),
        api<KedbArticle[]>(`/itil/kedb${searchKedb ? `?q=${encodeURIComponent(searchKedb)}` : ''}`),
      ]);
      setProblems(probRes);
      setArticles(kbRes);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [searchKedb]);

  const handleCreateProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pTitle || !pDesc) return;
    try {
      await api('/itil/problems', {
        method: 'POST',
        body: {
          title: pTitle,
          description: pDesc,
          root_cause: pRootCause || null,
          workaround: pWorkaround || null,
          solution: pSolution || null,
        },
      });
      setNewProbOpen(false);
      setPTitle('');
      setPDesc('');
      void loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur de création');
    }
  };

  const handleCreateKedb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kbTitle || !kbSymptoms || !kbRootCause || !kbWorkaround) return;
    try {
      await api('/itil/kedb', {
        method: 'POST',
        body: {
          title: kbTitle,
          symptoms: kbSymptoms,
          root_cause: kbRootCause,
          workaround: kbWorkaround,
          permanent_fix: kbFix || null,
          category: kbCategory,
        },
      });
      setNewKbOpen(false);
      setKbTitle('');
      setKbSymptoms('');
      void loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur de publication KEDB');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-black text-ink-100">Gestion des Problèmes & KEDB</h1>
          <p className="mt-1 text-sm text-ink-400">
            Analyse des causes racines (RCA) et base de connaissances d'erreurs connues (Known Error Database).
          </p>
          <div className="mt-1 text-xs text-brand-400 font-medium">Auteur : Martial Zinsou</div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setNewKbOpen(true)}>+ Publier Fiche KEDB</Button>
          <Button variant="primary" onClick={() => setNewProbOpen(true)}>
            + Déclarer un Problème
          </Button>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 border-b border-ink-800 pb-2">
        <button
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === 'problems'
              ? 'bg-brand-600/20 text-brand-300 border border-brand-700/60'
              : 'text-ink-400 hover:text-ink-200'
          }`}
          onClick={() => setTab('problems')}
        >
          🔍 Problèmes Actifs ({problems.length})
        </button>
        <button
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === 'kedb'
              ? 'bg-brand-600/20 text-brand-300 border border-brand-700/60'
              : 'text-ink-400 hover:text-ink-200'
          }`}
          onClick={() => setTab('kedb')}
        >
          📖 Base d'Erreurs Connues (KEDB · {articles.length})
        </button>
      </div>

      {loading ? (
        <Spinner label="Chargement…" />
      ) : tab === 'problems' ? (
        <div className="space-y-4">
          {problems.length === 0 ? (
            <EmptyState message="Aucun problème déclaré." />
          ) : (
            problems.map((p) => (
              <Card key={p.id} className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-amber-400">{p.number}</span>
                    <span className="rounded-full bg-ink-800 border border-ink-700 px-2 py-0.5 text-xs font-medium text-ink-300">
                      {PROBLEM_STATUS_LABELS[p.status as ProblemStatus] ?? p.status}
                    </span>
                  </div>
                  <span className="text-xs text-ink-400">Assigné : {p.assignee ?? 'Non assigné'}</span>
                </div>
                <h3 className="text-base font-bold text-ink-100">{p.title}</h3>
                <p className="text-xs text-ink-400">{p.description}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
                  {p.root_cause && (
                    <div className="rounded-lg bg-red-950/20 border border-red-900/40 p-2.5 text-red-200">
                      <div className="font-bold text-red-400 mb-0.5">Cause Racine (Root Cause) :</div>
                      {p.root_cause}
                    </div>
                  )}
                  {p.workaround && (
                    <div className="rounded-lg bg-amber-950/20 border border-amber-900/40 p-2.5 text-amber-200">
                      <div className="font-bold text-amber-400 mb-0.5">Solution de contournement :</div>
                      {p.workaround}
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Recherche KEDB */}
          <Card className="flex items-center gap-3">
            <Input
              placeholder="Rechercher une erreur, un symptôme ou un mot-clé (ex: VPN, Throttling, BSOD)…"
              value={searchKedb}
              onChange={(e) => setSearchKedb(e.target.value)}
              className="flex-1"
            />
            {searchKedb && <Button onClick={() => setSearchKedb('')}>Effacer</Button>}
          </Card>

          {articles.length === 0 ? (
            <EmptyState message="Aucun article KEDB ne correspond à la recherche." />
          ) : (
            articles.map((art) => (
              <Card key={art.id} className="space-y-3 border-l-4 border-l-brand-500">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-brand-400">{art.number}</span>
                    <span className="rounded bg-ink-800 px-2 py-0.5 text-xs text-ink-300 font-semibold">
                      {art.category}
                    </span>
                  </div>
                  <span className="text-xs text-ink-500">{art.views_count} consultations</span>
                </div>
                <h3 className="text-base font-bold text-ink-100">{art.title}</h3>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-semibold text-ink-300">Symptômes constatés :</span>{' '}
                    <span className="text-ink-400">{art.symptoms}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-ink-300">Cause racine identifiée :</span>{' '}
                    <span className="text-ink-400">{art.root_cause}</span>
                  </div>
                  <div className="rounded-lg bg-emerald-950/30 border border-emerald-800/50 p-2.5 text-emerald-200">
                    <span className="font-bold text-emerald-400">Workaround (Procédure rapide) :</span>{' '}
                    {art.workaround}
                  </div>
                  {art.permanent_fix && (
                    <div className="rounded-lg bg-ink-950 p-2.5 text-ink-300">
                      <span className="font-bold text-brand-300">Correctif définitif (Fix) :</span>{' '}
                      {art.permanent_fix}
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Modale Déclaration Problème */}
      <Modal open={newProbOpen} onClose={() => setNewProbOpen(false)} title="Déclarer un Problème DSI">
        <form onSubmit={handleCreateProblem} className="space-y-4">
          <Field label="Intitulé du problème">
            <Input
              required
              placeholder="Ex: Crashs thermiques récurrents sur GPU..."
              value={pTitle}
              onChange={(e) => setPTitle(e.target.value)}
            />
          </Field>
          <Field label="Description du phénomène">
            <textarea
              required
              className="input h-20 w-full"
              placeholder="Nombre d'incidents associés, machines impactées…"
              value={pDesc}
              onChange={(e) => setPDesc(e.target.value)}
            />
          </Field>
          <Field label="Analyse Cause Racine (RCA)">
            <textarea
              className="input h-20 w-full"
              placeholder="Mécanisme physique ou logiciel à l'origine du défaut…"
              value={pRootCause}
              onChange={(e) => setPRootCause(e.target.value)}
            />
          </Field>
          <Field label="Solution de contournement (Workaround)">
            <Input
              placeholder="Procédure provisoire pour éviter la coupure..."
              value={pWorkaround}
              onChange={(e) => setPWorkaround(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" onClick={() => setNewProbOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="primary">
              Créer le Problème
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modale Publication KEDB */}
      <Modal open={newKbOpen} onClose={() => setNewKbOpen(false)} title="Publier une Fiche d'Erreur Connue (KEDB)">
        <form onSubmit={handleCreateKedb} className="space-y-4">
          <Field label="Titre de la fiche">
            <Input
              required
              placeholder="Ex: Résolution du blocage VPN à 98%..."
              value={kbTitle}
              onChange={(e) => setKbTitle(e.target.value)}
            />
          </Field>
          <Field label="Catégorie">
            <Select value={kbCategory} onChange={(e) => setKbCategory(e.target.value)}>
              <option value="Matériel & Postes">Matériel & Postes de travail</option>
              <option value="Réseau & VPN">Réseau & Télétravail</option>
              <option value="Applications & ERP">Applications Métier & ERP</option>
              <option value="Sécurité & Accès">Sécurité & Identités</option>
            </Select>
          </Field>
          <Field label="Symptômes précis">
            <textarea
              required
              className="input h-16 w-full"
              placeholder="Ce que l'usager ou le technicien voit…"
              value={kbSymptoms}
              onChange={(e) => setKbSymptoms(e.target.value)}
            />
          </Field>
          <Field label="Cause racine">
            <Input
              required
              placeholder="Ex: Fragmentation de paquets MTU/MSS..."
              value={kbRootCause}
              onChange={(e) => setKbRootCause(e.target.value)}
            />
          </Field>
          <Field label="Solution de contournement (Workaround)">
            <textarea
              required
              className="input h-20 w-full"
              placeholder="Instructions concrètes étape par étape…"
              value={kbWorkaround}
              onChange={(e) => setKbWorkaround(e.target.value)}
            />
          </Field>
          <Field label="Correctif permanent (Optionnel)">
            <Input
              placeholder="Ex: Déploiement automatique du patch v7.4..."
              value={kbFix}
              onChange={(e) => setKbFix(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" onClick={() => setNewKbOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="primary">
              Publier dans la KEDB
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
