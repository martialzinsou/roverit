/**
 * Page de connexion : Thème Apple iMac (https://www.apple.com/fr/imac/)
 * Carte en verre dépoli, bouton pill Apple Blue et palette des 7 couleurs iMac.
 * Auteur : Martial Zinsou
 */
import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Button, Field, Input } from '../components/ui';

const IMAC_DOTS = [
  'bg-[#0071e3]',
  'bg-[#a855f7]',
  'bg-[#f43f5e]',
  'bg-[#f97316]',
  'bg-[#eab308]',
  'bg-[#10b981]',
  'bg-[#e5e5ea]',
];

/** Formulaire de connexion ; redirige vers '/' ou la route d'origine. */
export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname?: string } } };
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    const back = location.state?.from?.pathname ?? '/';
    navigate(back, { replace: true });
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Titre style Apple iMac */}
        <div className="mb-8 text-center space-y-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#0071e3] to-[#a855f7] text-2xl font-black text-white shadow-apple-glow">
            R
          </div>
          <div className="flex justify-center gap-1.5 py-1">
            {IMAC_DOTS.map((dot, i) => (
              <span key={i} className={`h-2 w-2 rounded-full ${dot} ring-1 ring-white/30`} />
            ))}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            RoverIt. <span className="imac-gradient-text">Brillant.</span>
          </h1>
          <p className="text-xs text-ink-400">
            Workstation OS Hub & Gouvernance DSI
          </p>
          <div className="text-[11px] text-ink-500 font-medium">
            Auteur : <span className="text-ink-300 font-semibold">Martial Zinsou</span>
          </div>
        </div>

        <form onSubmit={submit} className="card rounded-3xl p-6 space-y-4">
          {error ? (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-xs text-red-300 backdrop-blur-md">
              {error}
            </div>
          ) : null}
          <Field label="Identifiant">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
              placeholder="admin, tech, client…"
            />
          </Field>
          <Field label="Mot de passe">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </Field>
          <Button type="submit" variant="primary" className="w-full py-2.5 text-sm" disabled={loading}>
            {loading ? 'Connexion en cours…' : 'Ouvrir la session'}
          </Button>
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3 text-center text-[11px] text-ink-400">
            Comptes démo : <span className="text-white font-mono">admin</span> / <span className="text-white font-mono">admin</span> · <span className="text-white font-mono">tech</span> · <span className="text-white font-mono">client</span>
          </div>
        </form>
      </div>
    </div>
  );
}
