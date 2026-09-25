/**
 * RoverIt — Parts.tsx
 * Auteur : Martial Zinsou
 */
/**
 * Catalogue de pièces : stocks, prix unitaires, règles de compatibilité
 * et ajustement du stock par l'administrateur.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { newId, type Part } from '@roverit/shared';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Card, EmptyState, Field, Input, Modal, Spinner } from '../components/ui';
import { fmtMoney } from '../lib/format';

/** Tableau du catalogue de pièces avec création et variation de stock. */
export default function Parts() {
  const { user } = useAuth();
  const admin = user?.role === 'admin';
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', category: 'RAM', price_eur: '', stock: '', compatibility: '' });

  const load = () => {
    setLoading(true);
    api<Part[]>('/parts')
      .then(setParts)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload: Part = {
      id: newId(),
      name: form.name.trim(),
      category: form.category,
      price_eur: Number(form.price_eur) || 0,
      stock: Number(form.stock) || 0,
      compatibility: form.compatibility.split(',').map((s) => s.trim()).filter(Boolean),
    };
    try {
      await api('/parts', { method: 'POST', body: payload, queueOffline: true });
      setOpen(false);
      setForm({ name: '', category: 'RAM', price_eur: '', stock: '', compatibility: '' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const updateStock = async (part: Part, delta: number) => {
    const stock = Math.max(0, part.stock + delta);
    await api(`/parts/${part.id}`, { method: 'PATCH', body: { ...part, stock }, queueOffline: true });
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-100">Catalogue de pièces</h1>
          <p className="text-sm text-ink-400">
            Gestion des stocks, coûts et règles de compatibilité ({parts.length} références).
          </p>
        </div>
        {admin ? (
          <Button variant="primary" onClick={() => setOpen(true)}>+ Nouvelle pièce</Button>
        ) : null}
      </div>

      {loading ? (
        <Spinner />
      ) : parts.length === 0 ? (
        <EmptyState message="Aucune pièce au catalogue." />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-ink-800 bg-ink-950/60">
                <tr>
                  <th className="th">Référence</th>
                  <th className="th">Catégorie</th>
                  <th className="th">Prix unitaire</th>
                  <th className="th">Stock</th>
                  <th className="th">Compatibilité</th>
                  <th className="th">Valeur stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {parts.map((p) => (
                  <tr key={p.id}>
                    <td className="td font-medium text-ink-100">{p.name}</td>
                    <td className="td text-ink-400">{p.category}</td>
                    <td className="td">{fmtMoney(p.price_eur)}</td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        {admin ? (
                          <button className="btn-secondary !px-2 !py-0.5 text-xs" onClick={() => void updateStock(p, -1)}>−</button>
                        ) : null}
                        <span className={`font-semibold ${p.stock === 0 ? 'text-red-400' : p.stock < 5 ? 'text-amber-400' : 'text-ink-100'}`}>
                          {p.stock}
                        </span>
                        {admin ? (
                          <button className="btn-secondary !px-2 !py-0.5 text-xs" onClick={() => void updateStock(p, 1)}>+</button>
                        ) : null}
                      </div>
                    </td>
                    <td className="td font-mono text-xs text-ink-400">{p.compatibility.join(', ') || '—'}</td>
                    <td className="td text-ink-300">{fmtMoney(p.price_eur * p.stock)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nouvelle pièce">
        <form onSubmit={submit} className="space-y-4">
          {error ? <div className="rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</div> : null}
          <Field label="Nom">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="NVMe Samsung 990 PRO 2 To" />
          </Field>
          <Field label="Catégorie">
            <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prix (EUR)">
              <Input type="number" min={0} step="0.1" value={form.price_eur} onChange={(e) => setForm({ ...form, price_eur: e.target.value })} />
            </Field>
            <Field label="Stock">
              <Input type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </Field>
          </div>
          <Field label="Règles de compatibilité" hint="Séparées par des virgules — ex : ram<=64, ddr4, tbp<=500, all">
            <Input value={form.compatibility} onChange={(e) => setForm({ ...form, compatibility: e.target.value })} placeholder="ram<=64, ddr4" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Ajout…' : 'Ajouter'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}