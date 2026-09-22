/**
 * Page de connexion : champ identifiants/mot de passe, gestion de l'erreur
 * et redirection vers la page d'origine après authentification.
 */
import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Button, Field, Input } from '../components/ui';

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
    <div className="flex min-h-full items-center justify-center bg-ink-950 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-600 text-2xl font-black text-ink-950">
            R
          </div>
          <h1 className="text-2xl font-bold text-ink-100">RoverIt</h1>
          <p className="text-sm text-ink-400">Workstation OS Hub — reconditionnement & supervision</p>
        </div>

        <form onSubmit={submit} className="card space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-300">
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
          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </Button>
          <p className="text-center text-xs text-ink-500">
            Démo : admin/admin · tech/tech · client/client
          </p>
        </form>
      </div>
    </div>
  );
}