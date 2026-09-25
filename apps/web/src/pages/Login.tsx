/**
 * Page de connexion : Thème Liquid Glass révolutionnaire
 * Apple Liquid Glass + Google Material 3 Expressive
 * Verre liquide, réfraction et halos iridescents
 * Auteur : Martial Zinsou
 */
import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Button, Field, Input } from '../components/ui';

const IMAC_DOTS = ['bg-[#0071e3]','bg-[#a855f7]','bg-[#f43f5e]','bg-[#f97316]','bg-[#eab308]','bg-[#10b981]','bg-[#e5e5ea]'];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname?: string } } };
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  if (user) { const back = location.state?.from?.pathname ?? '/'; navigate(back, { replace: true }); }
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try { await login(username, password); navigate('/', { replace: true }); } catch (err) { setError(err instanceof Error ? err.message : 'Échec de connexion'); } finally { setLoading(false); }
  };
  return (
    <div className="flex min-h-full items-center justify-center p-4 relative">
      <div className="liquid-orb w-[400px] h-[400px] -top-20 -left-20" style={{ background: 'radial-gradient(circle, rgba(0,113,227,0.12), transparent 70%)' }} />
      <div className="liquid-orb w-[500px] h-[500px] -bottom-20 -right-20" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.10), transparent 70%)' }} />
      <div className="w-full max-w-sm relative z-10">
        <div className="mb-8 text-center space-y-3">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[20px] text-3xl font-black text-white relative overflow-hidden" style={{
            background: 'linear-gradient(135deg, #0071e3 0%, #a855f7 50%, #f43f5e 100%)',
            boxShadow: '0 12px 32px rgba(0,113,227,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
          }}>
            <span className="relative z-10">R</span>
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
          </div>
          <div className="flex justify-center gap-1.5">
            {IMAC_DOTS.map((dot,i)=>(<span key={i} className={`h-2.5 w-2.5 rounded-full ${dot} ring-1 ring-white/20 shadow-sm`} />))}
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white">RoverIt. <span className="imac-gradient-text">Liquid.</span></h1>
          <p className="text-sm font-medium text-white/60">Workstation OS Hub • Liquid Glass</p>
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium text-white/50" style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)' }}>
            Auteur : <span className="font-semibold text-white/80">Martial Zinsou</span>
          </div>
        </div>
        <form onSubmit={submit} className="card rounded-[24px] p-7 space-y-5">
          {error ? <div className="rounded-2xl px-4 py-3 text-xs text-red-300" style={{ background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.2)', backdropFilter: 'blur(20px)' }}>{error}</div> : null}
          <Field label="Identifiant"><Input value={username} onChange={(e)=>setUsername(e.target.value)} autoFocus autoComplete="username" placeholder="admin, tech, client…" /></Field>
          <Field label="Mot de passe"><Input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} autoComplete="current-password" placeholder="••••••••" /></Field>
          <Button type="submit" variant="primary" className="w-full py-3 text-sm" disabled={loading}>{loading ? 'Connexion…' : 'Ouvrir la session →'}</Button>
          <div className="rounded-2xl p-3 text-center text-[11px] text-white/40" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            Démo : <span className="font-mono text-white/80">admin/admin</span> · <span className="font-mono text-white/80">tech</span> · <span className="font-mono text-white/80">client</span>
          </div>
        </form>
      </div>
    </div>
  );
}
