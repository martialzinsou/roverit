/**
 * Réglages & utilisateurs (réservé admin) : liste des comptes
 * et des rôles RBAC de l'application.
 */
import { useEffect, useState } from 'react';
import { ROLE_LABELS, type Role, type User } from '@roverit/shared';
import { api } from '../lib/api';
import { Card, Spinner } from '../components/ui';
import { Badge } from '../components/ui';

/** Liste des comptes utilisateurs et de leurs rôles. */
export default function Settings() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api<User[]>('/users')
      .then(setUsers)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-100">Réglages & utilisateurs</h1>
        <p className="text-sm text-ink-400">Gestion des rôles (RBAC) — réservé à l'administrateur.</p>
      </div>

      {error ? <div className="rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</div> : null}

      <Card>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink-300">Comptes ({users.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-ink-800 bg-ink-950/60">
              <tr>
                <th className="th">Identifiant</th>
                <th className="th">Email</th>
                <th className="th">Rôle</th>
                <th className="th">Créé le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="td font-medium text-ink-100">{u.username}</td>
                  <td className="td text-ink-400">{u.email ?? '—'}</td>
                  <td className="td">
                    <Badge tone={u.role === 'admin' ? 'amber' : u.role === 'technicien' ? 'blue' : 'neutral'}>
                      {ROLE_LABELS[u.role as Role]}
                    </Badge>
                  </td>
                  <td className="td text-ink-500">{new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink-500">
          Permissions : Technicien = inventaire + OT + benchmarks · Admin = + catalogue pièces, comptes et suppression · Consultant = lecture seule + rapports.
        </p>
      </Card>
    </div>
  );
}