/**
 * Layout applicatif principal : Thème Liquid Glass révolutionnaire
 * Fusion Apple Liquid Glass (WWDC25) + Google Material 3 Expressive
 * Sidebar verre liquide ultra-flou, halos iridescents, profondeur multi-couches
 * Auteur : Martial Zinsou
 */
import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useOnlineStatus, useWsSync } from '../lib/hooks';
import { ROLE_LABELS, type Role } from '@roverit/shared';
import { isDesktop } from '../lib/desktop';

const IMAC_COLORS = [
  { name: 'Bleu', bg: 'bg-[#0071e3]' },
  { name: 'Mauve', bg: 'bg-[#a855f7]' },
  { name: 'Rose', bg: 'bg-[#f43f5e]' },
  { name: 'Orange', bg: 'bg-[#f97316]' },
  { name: 'Jaune', bg: 'bg-[#eab308]' },
  { name: 'Vert', bg: 'bg-[#10b981]' },
  { name: 'Argent', bg: 'bg-[#e5e5ea]' },
];

const NAV_ATELIER = [
  { to: '/', label: 'Tableau de bord', icon: '▤' },
  { to: '/machines', label: 'Inventaire matériel', icon: '⛁' },
  { to: '/parts', label: 'Catalogue pièces', icon: '⚙' },
  { to: '/benchmark', label: 'Benchmark & thermique', icon: '☀' },
  { to: '/work-orders', label: 'Ordres de travail', icon: '✓' },
  { to: '/reports', label: 'Rapports & export', icon: '⤓' },
];

const NAV_ITIL = [
  { to: '/itil', label: 'Supervision DSI', icon: '📊' },
  { to: '/itil/incidents', label: 'Incidents & SLA', icon: '🚨' },
  { to: '/itil/cmdb', label: 'CMDB & Dépendances', icon: '🏛️' },
  { to: '/itil/changes', label: 'Changements & CAB', icon: '🔄' },
  { to: '/itil/problems', label: 'Problèmes & KEDB', icon: '🔍' },
  { to: '/itil/services', label: 'Catalogue DSI', icon: '📦' },
];

const NAV_AIOS = [
  { to: '/aios', label: 'Tableau de bord IA', icon: '🧠' },
  { to: '/aios/chat', label: 'Chat IA', icon: '💬' },
  { to: '/aios/agents', label: 'Agents', icon: '🤖' },
  { to: '/aios/models', label: 'Modèles', icon: '🧠' },
  { to: '/aios/workflows', label: 'Workflows', icon: '⚡' },
  { to: '/aios/analytics', label: 'Analytics', icon: '📊' },
  { to: '/aios/settings', label: 'Paramètres', icon: '⚙️' },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { online, pending } = useOnlineStatus();
  const navigate = useNavigate();
  useWsSync();

  return (
    <div className="flex h-full relative">
      {/* Orbes liquides décoratifs en arrière-plan */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="liquid-orb w-[600px] h-[600px] -top-48 -left-32" style={{ background: 'radial-gradient(circle, rgba(0,113,227,0.15), transparent 70%)' }} />
        <div className="liquid-orb w-[500px] h-[500px] top-1/2 -right-24" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.12), transparent 70%)' }} />
        <div className="liquid-orb w-[700px] h-[400px] bottom-0 left-1/3" style={{ background: 'radial-gradient(circle, rgba(244,63,94,0.08), transparent 70%)' }} />
      </div>

      <aside className="flex w-64 flex-col relative z-10" style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '4px 0 32px rgba(0,0,0,0.3), inset -1px 0 0 rgba(255,255,255,0.06)',
      }}>
        <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[16px] text-lg font-black text-white relative overflow-hidden" style={{
              background: 'linear-gradient(135deg, #0071e3 0%, #a855f7 50%, #f43f5e 100%)',
              boxShadow: '0 8px 24px rgba(0,113,227,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
            }}>
              <span className="relative z-10">R</span>
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
            </div>
            <div>
              <div className="text-[15px] font-bold leading-tight tracking-tight text-white">RoverIt</div>
              <div className="text-[11px] font-medium text-white/50">Liquid Glass • DSI</div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {IMAC_COLORS.map((c) => (
                <span key={c.name} title={c.name} className={`h-2.5 w-2.5 rounded-full ${c.bg} ring-1 ring-white/20 shadow-sm`} />
              ))}
            </div>
            <span className="text-[8px] font-bold uppercase tracking-[0.15em] text-white/30">Liquid</span>
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto p-3">
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">Atelier & Matériel</div>
            <div className="space-y-1">
              {NAV_ATELIER.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[13px] font-medium transition-all duration-300 ${
                    isActive ? 'text-white' : 'text-white/55 hover:text-white/90'
                  }`
                } style={({ isActive }) => isActive ? {
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)',
                } : {}}>
                  <span className="w-5 text-center text-[15px]">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>

          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#2997ff]/80">Gouvernance DSI • ITIL v4</div>
            <div className="space-y-1">
              {NAV_ITIL.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === '/itil'} className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[13px] font-medium transition-all duration-300 ${
                    isActive ? 'text-[#2997ff]' : 'text-white/55 hover:text-white/90'
                  }`
                } style={({ isActive }) => isActive ? {
                  background: 'linear-gradient(135deg, rgba(0,113,227,0.15) 0%, rgba(168,85,247,0.10) 100%)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(0,113,227,0.25)',
                  boxShadow: '0 4px 16px rgba(0,113,227,0.2), 0 0 20px rgba(0,113,227,0.1)',
                } : {}}>
                  <span className="w-5 text-center text-[15px]">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>

          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#a855f7]/80">AI Operating System</div>
            <div className="space-y-1">
              {NAV_AIOS.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === '/aios'} className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[13px] font-medium transition-all duration-300 ${
                    isActive ? 'text-[#a855f7]' : 'text-white/55 hover:text-white/90'
                  }`
                } style={({ isActive }) => isActive ? {
                  background: 'linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(244,63,94,0.10) 100%)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(168,85,247,0.25)',
                  boxShadow: '0 4px 16px rgba(168,85,247,0.2), 0 0 20px rgba(168,85,247,0.1)',
                } : {}}>
                  <span className="w-5 text-center text-[15px]">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>

          {user?.role === 'admin' ? (
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">Administration</div>
              <NavLink to="/settings" className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[13px] font-medium transition-all duration-300 ${
                  isActive ? 'text-white' : 'text-white/55 hover:text-white/90'
                }`
              } style={({ isActive }) => isActive ? {
                background: 'rgba(255,255,255,0.10)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.10)',
              } : {}}>
                <span className="w-5 text-center">⚿</span>
                Réglages
              </NavLink>
            </div>
          ) : null}
        </nav>

        <div className="p-4 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(20px)' }}>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${online ? 'bg-emerald-400' : 'bg-red-400'}`} style={online ? { boxShadow: '0 0 12px rgba(52,211,153,0.6)' } : {}} />
            <span className="text-xs font-medium text-white/80">{online ? 'Connecté' : pending > 0 ? `${pending} en attente` : 'Hors-ligne'}</span>
          </div>
          {isDesktop() ? <div className="text-[11px] font-medium text-[#2997ff]">● Matériel local</div> : null}
          <div className="text-[10px] text-white/30">Auteur : <span className="font-semibold text-white/60">Martial Zinsou</span></div>
          <div className="flex items-center justify-between gap-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-white">{user?.username}</div>
              <div className="truncate text-[10px] text-white/40">{ROLE_LABELS[(user?.role as Role | undefined) ?? 'consultant']}</div>
            </div>
            <button className="rounded-full px-3 py-1 text-xs font-medium text-white/70 hover:text-white transition" style={{
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.10)',
            }} onClick={() => { void logout(); navigate('/login'); }}>
              Quitter
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-8 relative z-10">{children}</main>
    </div>
  );
}
