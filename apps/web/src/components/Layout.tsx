/**
 * Layout applicatif principal : barre latérale de navigation, indicateur
 * de connexion (en ligne/hors-ligne) et zone de contenu. Connecte le WebSocket.
 */
import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useOnlineStatus, useWsSync } from '../lib/hooks';
import { ROLE_LABELS, type Role } from '@roverit/shared';
import { isDesktop } from '../lib/desktop';

/** Entrées de navigation principales affichées dans la barre latérale. */
const NAV = [
  { to: '/', label: 'Tableau de bord', icon: '▤' },
  { to: '/machines', label: 'Inventaire', icon: '⛁' },
  { to: '/parts', label: 'Catalogue pièces', icon: '⚙' },
  { to: '/benchmark', label: 'Benchmark & thermique', icon: '☀' },
  { to: '/work-orders', label: 'Ordres de travail', icon: '✓' },
  { to: '/reports', label: 'Rapports & export', icon: '⤓' },
];

/** Habillage principal des pages authentifiées (sidebar + zone de contenu). */
export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { online, pending } = useOnlineStatus();
  const navigate = useNavigate();
  useWsSync();

  return (
    <div className="flex h-full">
      <aside className="flex w-64 flex-col border-r border-ink-800 bg-ink-900">
        <div className="flex items-center gap-3 border-b border-ink-800 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-lg font-black text-ink-950">
            R
          </div>
          <div>
            <div className="text-base font-bold leading-tight text-ink-100">RoverIt</div>
            <div className="text-[11px] text-ink-400">Workstation OS Hub</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600/15 text-brand-300'
                    : 'text-ink-300 hover:bg-ink-800 hover:text-ink-100'
                }`
              }
            >
              <span className="w-5 text-center">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          {user?.role === 'admin' ? (
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600/15 text-brand-300'
                    : 'text-ink-300 hover:bg-ink-800 hover:text-ink-100'
                }`
              }
            >
              <span className="w-5 text-center">⚿</span>
              Réglages & utilisateurs
            </NavLink>
          ) : null}
        </nav>

        <div className="border-t border-ink-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${online ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <span className="text-xs text-ink-300">
              {online ? 'En ligne' : pending > 0 ? `Hors-ligne · ${pending} en attente` : 'Hors-ligne'}
            </span>
          </div>
          {isDesktop() ? (
            <div className="mt-1 text-[11px] text-brand-400">● Mode desktop (matériel local)</div>
          ) : null}
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-ink-800 pt-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-ink-100">{user?.username}</div>
              <div className="truncate text-[11px] text-ink-400">
                {ROLE_LABELS[(user?.role as Role | undefined) ?? 'consultant']}
              </div>
            </div>
            <button
              className="rounded-md border border-ink-700 px-2 py-1 text-xs text-ink-300 hover:bg-ink-800"
              onClick={() => {
                void logout();
                navigate('/login');
              }}
            >
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-6">{children}</div>
      </main>
    </div>
  );
}