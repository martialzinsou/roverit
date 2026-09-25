/**
 * AIOS Settings - Paramètres AIOS
 * Interface Liquid Glass révolutionnaire (Apple + Google)
 * Auteur : Martial Zinsou
 */
import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Card, Button, Input, Select, Field, Switch } from '../../components/ui';

interface Settings {
  general: {
    organization_name: string;
    default_model: string;
    language: string;
    timezone: string;
  };
  models: {
    auto_update: boolean;
    fallback_model: string;
    max_context: number;
  };
  agents: {
    max_concurrent: number;
    default_timeout: number;
    auto_restart: boolean;
    log_level: string;
  };
  workflows: {
    max_concurrent: number;
    default_timeout: number;
    retry_failed: boolean;
    max_retries: number;
  };
  security: {
    api_key_rotation: boolean;
    encryption_at_rest: boolean;
    audit_logging: boolean;
    rate_limiting: boolean;
    max_requests_per_minute: number;
  };
  costs: {
    budget_limit: number;
    alert_threshold: number;
    currency: string;
    cost_optimization: boolean;
  };
  integrations: {
    openai_enabled: boolean;
    anthropic_enabled: boolean;
    google_enabled: boolean;
    local_models_enabled: boolean;
  };
}

export default function AiosSettings() {
  const [settings, setSettings] = useState<Settings>({
    general: { organization_name: '', default_model: '', language: 'fr', timezone: 'Europe/Paris' },
    models: { auto_update: true, fallback_model: '', max_context: 8192 },
    agents: { max_concurrent: 10, default_timeout: 300, auto_restart: true, log_level: 'info' },
    workflows: { max_concurrent: 5, default_timeout: 600, retry_failed: true, max_retries: 3 },
    security: { api_key_rotation: false, encryption_at_rest: true, audit_logging: true, rate_limiting: true, max_requests_per_minute: 100 },
    costs: { budget_limit: 1000, alert_threshold: 0.8, currency: 'EUR', cost_optimization: true },
    integrations: { openai_enabled: true, anthropic_enabled: true, google_enabled: false, local_models_enabled: true }
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);

  const tabs = [
    { id: 'general', label: 'Général', icon: '⚙️' },
    { id: 'models', label: 'Modèles', icon: '🧠' },
    { id: 'agents', label: 'Agents', icon: '🤖' },
    { id: 'workflows', label: 'Workflows', icon: '⚡' },
    { id: 'security', label: 'Sécurité', icon: '🔒' },
    { id: 'costs', label: 'Coûts', icon: '💰' },
    { id: 'integrations', label: 'Intégrations', icon: '🔗' }
  ];

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await api<any>('/aios/settings');
      setSettings(res);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const handleChange = (section: keyof Settings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value }
    }));
  };

  const handleSave = async (section: keyof Settings) => {
    try {
      setSaving(true);
      await api(`/aios/settings/${section}`, {
        method: 'PATCH',
        body: settings[section]
      });
      alert('Paramètres sauvegardés !');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="text-white/50">Chargement des paramètres…</div></div>;
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <Card className="space-y-4">
              <h3 className="text-base font-bold text-white">Informations Organisation</h3>
              <Field label="Nom de l'organisation">
                <Input value={settings.general.organization_name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('general', 'organization_name', e.target.value)} placeholder="Mon Organisation" />
              </Field>
              <Field label="Modèle par défaut">
                <Select value={settings.general.default_model} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('general', 'default_model', e.target.value)}>
                  <option value="">-- Sélectionner --</option>
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Langue">
                  <Select value={settings.general.language} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('general', 'language', e.target.value)}>
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="de">Deutsch</option>
                  </Select>
                </Field>
                <Field label="Fuseau horaire">
                  <Select value={settings.general.timezone} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('general', 'timezone', e.target.value)}>
                    <option value="Europe/Paris">Europe/Paris</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="Asia/Tokyo">Asia/Tokyo</option>
                  </Select>
                </Field>
              </div>
            </Card>
          </div>
        );
      case 'models':
        return (
          <div className="space-y-6">
            <Card className="space-y-4">
              <h3 className="text-base font-bold text-white">Configuration Modèles</h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Mise à jour auto">
                  <Switch checked={settings.models.auto_update} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('models', 'auto_update', e.target.checked)} />
                </Field>
                <Field label="Modèle de secours">
                  <Select value={settings.models.fallback_model} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('models', 'fallback_model', e.target.value)}>
                    <option value="">-- Aucun --</option>
                  </Select>
                </Field>
              </div>
              <Field label="Contexte max (tokens)">
                <Input type="number" value={settings.models.max_context} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('models', 'max_context', parseInt(e.target.value) || 8192)} />
              </Field>
            </Card>
          </div>
        );
      case 'agents':
        return (
          <div className="space-y-6">
            <Card className="space-y-4">
              <h3 className="text-base font-bold text-white">Configuration Agents</h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Agents max simultanés">
                  <Input type="number" value={settings.agents.max_concurrent} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('agents', 'max_concurrent', parseInt(e.target.value) || 10)} />
                </Field>
                <Field label="Timeout par défaut (s)">
                  <Input type="number" value={settings.agents.default_timeout} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('agents', 'default_timeout', parseInt(e.target.value) || 300)} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Redémarrage auto">
                  <Switch checked={settings.agents.auto_restart} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('agents', 'auto_restart', e.target.checked)} />
                </Field>
                <Field label="Niveau de log">
                  <Select value={settings.agents.log_level} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('agents', 'log_level', e.target.value)}>
                    <option value="debug">Debug</option>
                    <option value="info">Info</option>
                    <option value="warn">Warn</option>
                    <option value="error">Error</option>
                  </Select>
                </Field>
              </div>
            </Card>
          </div>
        );
      case 'workflows':
        return (
          <div className="space-y-6">
            <Card className="space-y-4">
              <h3 className="text-base font-bold text-white">Configuration Workflows</h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Workflows max simultanés">
                  <Input type="number" value={settings.workflows.max_concurrent} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('workflows', 'max_concurrent', parseInt(e.target.value) || 5)} />
                </Field>
                <Field label="Timeout par défaut (s)">
                  <Input type="number" value={settings.workflows.default_timeout} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('workflows', 'default_timeout', parseInt(e.target.value) || 600)} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Retry auto échoués">
                  <Switch checked={settings.workflows.retry_failed} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('workflows', 'retry_failed', e.target.checked)} />
                </Field>
                <Field label="Max retries">
                  <Input type="number" value={settings.workflows.max_retries} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('workflows', 'max_retries', parseInt(e.target.value) || 3)} />
                </Field>
              </div>
            </Card>
          </div>
        );
      case 'security':
        return (
          <div className="space-y-6">
            <Card className="space-y-4">
              <h3 className="text-base font-bold text-white">Sécurité & Conformité</h3>
              <div className="space-y-3">
                <Field label="Rotation clés API">
                  <Switch checked={settings.security.api_key_rotation} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('security', 'api_key_rotation', e.target.checked)} />
                </Field>
                <Field label="Chiffrement au repos">
                  <Switch checked={settings.security.encryption_at_rest} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('security', 'encryption_at_rest', e.target.checked)} />
                </Field>
                <Field label="Journal d'audit">
                  <Switch checked={settings.security.audit_logging} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('security', 'audit_logging', e.target.checked)} />
                </Field>
                <Field label="Limitation de débit">
                  <Switch checked={settings.security.rate_limiting} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('security', 'rate_limiting', e.target.checked)} />
                </Field>
                <Field label="Max requêtes/minute">
                  <Input type="number" value={settings.security.max_requests_per_minute} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('security', 'max_requests_per_minute', parseInt(e.target.value) || 100)} />
                </Field>
              </div>
            </Card>
          </div>
        );
      case 'costs':
        return (
          <div className="space-y-6">
            <Card className="space-y-4">
              <h3 className="text-base font-bold text-white">Gestion des Coûts</h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Budget mensuel ($)">
                  <Input type="number" step="0.01" value={settings.costs.budget_limit} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('costs', 'budget_limit', parseFloat(e.target.value) || 1000)} />
                </Field>
                <Field label="Seuil d'alerte (%)">
                  <Input type="number" step="0.01" min="0" max="1" value={settings.costs.alert_threshold} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('costs', 'alert_threshold', parseFloat(e.target.value) || 0.8)} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Devise">
                  <Select value={settings.costs.currency} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('costs', 'currency', e.target.value)}>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                  </Select>
                </Field>
                <Field label="Optimisation coûts">
                  <Switch checked={settings.costs.cost_optimization} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('costs', 'cost_optimization', e.target.checked)} />
                </Field>
              </div>
            </Card>
          </div>
        );
      case 'integrations':
        return (
          <div className="space-y-6">
            <Card className="space-y-4">
              <h3 className="text-base font-bold text-white">Intégrations Externes</h3>
              <div className="space-y-3">
                <Field label="OpenAI">
                  <Switch checked={settings.integrations.openai_enabled} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('integrations', 'openai_enabled', e.target.checked)} />
                </Field>
                <Field label="Anthropic">
                  <Switch checked={settings.integrations.anthropic_enabled} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('integrations', 'anthropic_enabled', e.target.checked)} />
                </Field>
                <Field label="Google AI">
                  <Switch checked={settings.integrations.google_enabled} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('integrations', 'google_enabled', e.target.checked)} />
                </Field>
                <Field label="Modèles locaux">
                  <Switch checked={settings.integrations.local_models_enabled} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('integrations', 'local_models_enabled', e.target.checked)} />
                </Field>
              </div>
            </Card>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="text-white/50">Chargement des paramètres…</div></div>;
  }

  return (
    <div className="flex h-full">
      <aside className="w-48 flex flex-col border-r border-white/[0.06]" style={{ background: 'rgba(10,10,12,0.8)', backdropFilter: 'blur(40px)' }}>
        <div className="p-4 border-b border-white/[0.08]">
          <h3 className="font-bold text-white text-sm">Paramètres AIOS</h3>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'text-white bg-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] font-semibold'
                  : 'text-white/60 hover:text-white/90 hover:bg-white/[0.06]'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-auto p-8">
        {renderTab()}
        <div className="mt-6 flex justify-end">
          <Button variant="primary" onClick={() => handleSave(activeTab as keyof Settings)} disabled={saving}>
            {saving ? 'Sauvegarde…' : 'Sauvegarder les paramètres'}
          </Button>
        </div>
      </main>
    </div>
  );
}