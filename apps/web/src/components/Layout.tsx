/**
 * Layout applicatif principal : Thème Apple iMac (https://www.apple.com/fr/imac/)
 * Barre latérale translucide (verre dépoli macOS), palette des 7 couleurs éclatantes de l'iMac,
 * typographie épurée San Francisco et intégration harmonieuse Atelier + Gouvernance DSI.
 * Auteur : Martial Zinsou
 */
import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useOnlineStatus, useWsSync } from '../lib/hooks';
import { ROLE_LABELS, type Role } from '@roverit/shared';
import { isDesktop } from '../lib/desktop';

/** Les 7 couleurs éclatantes de l'iMac M4 */
const IMAC_COLORS = [
  { name: 'Bleu', bg: 'bg-[#0071e3]' },
  { name: 'Mauve', bg: 'bg-[#a855f7]' },
  { name: 'Rose', bg: 'bg-[#f43f5e]' },
  { name: 'Orange', bg: 'bg-[#f97316]' },
  { name: 'Jaune', bg: 'bg-[#eab308]' },
  { name: 'Vert', bg: 'bg-[#10b981]' },
  { name: 'Argent', bg: 'bg-[#e5e5ea]' },
];

/** Entrées de navigation atelier. */
const NAV_ATELIER = [
  { to: '/', label: 'Tableau de bord', icon: '▤' },
  { to: '/machines', label: 'Inventaire matériel', icon: '⛁' },
  { to: '/parts', label: 'Catalogue pièces', icon: '⚙' },
  { to: '/benchmark', label: 'Benchmark & thermique', icon: '☀' },
  { to: '/work-orders', label: 'Ordres de travail', icon: '✓' },
  { to: '/reports', label: 'Rapports & export', icon: '⤓' },
];

/** Entrées de navigation Gouvernance ITIL & DSI. */
const NAV_ITIL = [
  { to: '/itil', label: 'Supervision DSI', icon: '📊' },
  { to: '/itil/incidents', label: 'Incidents & SLA', icon: '🚨' },
  { to: '/itil/cmdb', label: 'CMDB & Dépendances', icon: '🏛️' },
  { to: '/itil/changes', label: 'Changements & CAB', icon: '🔄' },
  { to: '/itil/problems', label: 'Problèmes & KEDB', icon: '🔍' },
  { to: '/itil/services', label: 'Catalogue DSI', icon: '📦' },
];

/** Habillage principal des pages authentifiées (sidebar verre dépoli + zone de contenu). */
export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { online, pending } = useOnlineStatus();
  const navigate = useNavigate();
  useWsSync();

  return (
    <div className="flex h-full">
      {/* Barre latérale macOS / iMac */}
      <aside className="flex w-64 flex-col border-r border-white/[0.08] bg-black/60 backdrop-blur-2xl">
        {/* En-tête avec logo RoverIt et les 7 nuances iMac */}
        <div className="border-b border-white/[0.08] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0071e3] to-[#a855f7] text-lg font-black text-white shadow-lg shadow-[#0071e3]/20">
              R
            </div>
            <div>
              <div className="text-base font-bold leading-tight tracking-tight text-white">RoverIt</div>
              <div className="text-[11px] font-medium text-ink-400">Workstation OS Hub</div>
            </div>
          </div>
          {/* Les 7 points de couleur signature iMac */}
          <div className="mt-3 flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              {IMAC_COLORS.map((c) => (
                <span
                  key={c.name}
                  title={`iMac en finition ${c.name}`}
                  className={`h-2 w-2 rounded-full ${c.bg} ring-1 ring-white/20 transition-transform hover:scale-125`}
                />
              ))}
            </div>
            <span className="text-[9px] font-semibold uppercase tracking-widest text-ink-500">iMac Edition</span>
          </div>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto p-3">
          {/* Section Atelier & Reconditionnement */}
          <div>
            <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-400/90">
              Atelier & Matériel
            </div>
            <div className="space-y-0.5">
              {NAV_ATELIER.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-white/[0.12] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] font-semibold'
                        : 'text-ink-400 hover:bg-white/[0.06] hover:text-white'
                    }`
                  }
                >
                  <span className="w-4 text-center text-sm">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>

          {/* Section Gouvernance DSI / ITIL v4 */}
          <div>
            <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#2997ff]">
              Gouvernance DSI · ITIL v4
            </div>
            <div className="space-y-0.5">
              {NAV_ITIL.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/itil'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-[#0071e3]/20 text-[#2997ff] border border-[#0071e3]/30 font-semibold shadow-[0_0_15px_rgba(0,113,227,0.25)]'
                        : 'text-ink-400 hover:bg-white/[0.06] hover:text-white'
                    }`
                  }
                >
                  <span className="w-4 text-center text-sm">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>

          {user?.role === 'admin' ? (
            <div>
              <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-400/90">
                Administration
              </div>
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-white/[0.12] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] font-semibold'
                      : 'text-ink-400 hover:bg-white/[0.06] hover:text-white'
                  }`
                }
              >
                <span className="w-4 text-center text-sm">⚿</span>
                Réglages & utilisateurs
              </NavLink>
            </div>
          ) : null}
        </nav>

        {/* Pied de sidebar Apple */}
        <div className="border-t border-white/[0.08] px-5 py-3.5 bg-black/30">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${online ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-red-400'}`} />
            <span className="text-xs text-ink-300 font-medium">
              {online ? 'Connecté' : pending > 0 ? `Hors-ligne · ${pending} en attente` : 'Hors-ligne'}
            </span>
          </div>
          {isDesktop() ? (
            <div className="mt-1 text-[11px] text-[#2997ff]">● Profil matériel local actif</div>
          ) : null}
          <div className="mt-2 text-[10px] text-ink-500">
            Auteur : <span className="text-ink-300 font-semibold">Martial Zinsou</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-white/[0.08] pt-2.5">
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-white">{user?.username}</div>
              <div className="truncate text-[10px] text-ink-400">
                {ROLE_LABELS[(user?.role as Role | undefined) ?? 'consultant']}
              </div>
            </div>
            <button
              className="rounded-full border border-white/[0.12] bg-white/[0.08] px-3 py-1 text-xs font-medium text-ink-200 hover:bg-white/[0.15] hover:text-white transition active:scale-95"
              onClick={() => {
                void logout();
                navigate('/login');
              }}
            >
              Quitter
            </button>
          </div>
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
