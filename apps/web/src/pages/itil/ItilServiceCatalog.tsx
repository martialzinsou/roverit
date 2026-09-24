/**
 * Catalogue de Services & Demandes usagers (ITIL Service Request Management) :
 * catalogue des prestations DSI (dotation matériel, accès, VPN, maintenance),
 * soumission de demandes et suivi des engagements de livraison.
 * Auteur : Martial Zinsou
 */
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Button, Input, Select, Field, Modal, Spinner, EmptyState } from '../../components/ui';
import {
  SERVICE_CATALOG_CATEGORY_LABELS,
  SERVICE_REQUEST_STATUS_LABELS,
  type ServiceCatalogItem,
  type ServiceRequest,
  type ServiceCatalogCategory,
  type ServiceRequestStatus,
} from '@roverit/shared';

export default function ItilServiceCatalog() {
  const [tab, setTab] = useState<'catalog' | 'requests'>('catalog');
  const [catalog, setCatalog] = useState<ServiceCatalogItem[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modale commander un service
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ServiceCatalogItem | null>(null);
  const [beneficiary, setBeneficiary] = useState('');
  const [department, setDepartment] = useState('');
  const [details, setDetails] = useState('');
  const [priority, setPriority] = useState<'basse' | 'normale' | 'urgente'>('normale');

  const loadData = async () => {
    try {
      setLoading(true);
      const [catRes, reqRes] = await Promise.all([
        api<ServiceCatalogItem[]>('/itil/services/catalog'),
        api<ServiceRequest[]>('/itil/services/requests'),
      ]);
      setCatalog(catRes);
      setRequests(reqRes);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const openOrder = (item: ServiceCatalogItem) => {
    setSelectedItem(item);
    setOrderModalOpen(true);
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !beneficiary || !department || !details) return;
    try {
      await api('/itil/services/requests', {
        method: 'POST',
        body: {
          item_id: selectedItem.id,
          beneficiary,
          department,
          details,
          priority,
        },
      });
      setOrderModalOpen(false);
      setBeneficiary('');
      setDepartment('');
      setDetails('');
      setTab('requests');
      void loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur de commande');
    }
  };

  const handleUpdateStatus = async (id: string, status: ServiceRequestStatus) => {
    try {
      await api(`/itil/services/requests/${id}`, {
        method: 'PATCH',
        body: { status },
      });
      void loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const filteredCatalog = categoryFilter
    ? catalog.filter((c) => c.category === categoryFilter)
    : catalog;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-black text-ink-100">Catalogue de Services DSI & Demandes</h1>
          <p className="mt-1 text-sm text-ink-400">
            Guichet unique des prestations informatiques (dotations, accès, équipements) et engagements de livraison.
          </p>
          <div className="mt-1 text-xs text-brand-400 font-medium">Auteur : Martial Zinsou</div>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 border-b border-ink-800 pb-2">
        <button
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === 'catalog'
              ? 'bg-brand-600/20 text-brand-300 border border-brand-700/60'
              : 'text-ink-400 hover:text-ink-200'
          }`}
          onClick={() => setTab('catalog')}
        >
          📦 Catalogue des Prestations ({catalog.length})
        </button>
        <button
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === 'requests'
              ? 'bg-brand-600/20 text-brand-300 border border-brand-700/60'
              : 'text-ink-400 hover:text-ink-200'
          }`}
          onClick={() => setTab('requests')}
        >
          📋 Demandes en cours ({requests.length})
        </button>
      </div>

      {loading ? (
        <Spinner label="Chargement du catalogue DSI…" />
      ) : tab === 'catalog' ? (
        <div className="space-y-4">
          <Card className="flex items-center gap-4">
            <span className="text-xs uppercase font-bold text-ink-400">Filtrer par catégorie :</span>
            <div className="w-64">
              <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="">Toutes les catégories</option>
                {Object.entries(SERVICE_CATALOG_CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCatalog.map((item) => (
              <Card key={item.id} className="flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{item.icon}</span>
                    <span className="rounded bg-ink-800 border border-ink-700 px-2 py-0.5 text-[11px] font-semibold text-ink-300">
                      {SERVICE_CATALOG_CATEGORY_LABELS[item.category as ServiceCatalogCategory] ?? item.category}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-ink-100">{item.title}</h3>
                  <p className="text-xs text-ink-400">{item.description}</p>
                </div>

                <div className="border-t border-ink-800 pt-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="text-ink-400">Délai estimé : <span className="font-semibold text-ink-200">{item.estimated_delivery_days} jours</span></div>
                    {item.price_eur > 0 ? (
                      <div className="text-brand-300 font-semibold">{item.price_eur} € HT</div>
                    ) : (
                      <div className="text-emerald-400 font-semibold">Inclus DSI</div>
                    )}
                  </div>
                  <Button variant="primary" onClick={() => openOrder(item)}>
                    Commander →
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <EmptyState message="Aucune demande de service enregistrée." />
          ) : (
            requests.map((req) => (
              <Card key={req.id} className="space-y-3">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-bold text-brand-400">{req.number}</span>
                      <span className="rounded bg-ink-800 border border-ink-700 px-2 py-0.5 text-xs text-ink-300 font-semibold">
                        {SERVICE_REQUEST_STATUS_LABELS[req.status as ServiceRequestStatus] ?? req.status}
                      </span>
                      <span className="text-xs text-ink-500">
                        Échéance : {new Date(req.due_date).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-ink-100">{req.item_title}</h3>
                    <p className="text-xs text-ink-400">
                      Bénéficiaire : <span className="text-ink-200 font-semibold">{req.beneficiary}</span> ({req.department})
                    </p>
                    <p className="text-xs text-ink-400 mt-1 italic">« {req.details} »</p>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    {req.status === 'soumise' && (
                      <Button
                        className="text-xs"
                        variant="primary"
                        onClick={() => void handleUpdateStatus(req.id, 'approuvee')}
                      >
                        Valider (Approuver)
                      </Button>
                    )}
                    {req.status === 'approuvee' && (
                      <Button
                        className="text-xs"
                        onClick={() => void handleUpdateStatus(req.id, 'en_traitement')}
                      >
                        Prendre en charge
                      </Button>
                    )}
                    {req.status === 'en_traitement' && (
                      <Button
                        className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                        onClick={() => void handleUpdateStatus(req.id, 'livree')}
                      >
                        Marquer Livrée ✓
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Modale de Commande */}
      <Modal
        open={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        title={selectedItem ? `Commander : ${selectedItem.title}` : 'Nouvelle Demande'}
      >
        <form onSubmit={handleOrderSubmit} className="space-y-4">
          <Field label="Bénéficiaire (Nom & Prénom)">
            <Input
              required
              placeholder="Ex: Sophie Martin..."
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value)}
            />
          </Field>
          <Field label="Service / Département">
            <Input
              required
              placeholder="Ex: Direction Financière, R&D..."
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </Field>
          <Field label="Précisions sur le besoin">
            <textarea
              required
              className="input h-20 w-full"
              placeholder="Date d'arrivée prévue, logiciels spécifiques souhaités…"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </Field>
          <Field label="Urgence de la demande">
            <Select value={priority} onChange={(e) => setPriority(e.target.value as 'basse' | 'normale' | 'urgente')}>
              <option value="normale">Normale (Délai standard)</option>
              <option value="urgente">Urgente (Arrivée imminente)</option>
              <option value="basse">Basse (Projet moyen terme)</option>
            </Select>
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" onClick={() => setOrderModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="primary">
              Envoyer la Demande
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
