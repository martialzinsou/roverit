/**
 * Bibliothèque de composants UI réutilisables (formulaires, badges, modales…).
 * Composants génériques stylés avec Tailwind, sans logique métier.
 * Auteur : Martial Zinsou
 */
import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from 'react';

/** Conteneur de carte avec style unifié, className et clic optionnels. */
export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div className={`card ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}

/** Bouton générique avec variantes de style primary/secondary/danger. */
export function Button({
  children,
  variant = 'secondary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  const styles =
    variant === 'primary' ? 'btn-primary' : variant === 'danger' ? 'btn-danger' : 'btn-secondary';
  return (
    <button className={`${styles} ${className}`} {...props}>
      {children}
    </button>
  );
}

/** Champ de saisie texte générique stylé. */
export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`input ${className}`} {...props} />;
}

/** Liste déroulante générique stylée. */
export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`input ${className}`} {...props}>
      {children}
    </select>
  );
}

/** Wrapper de champ de formulaire : libellé, contenu et aide optionnelle. */
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-400">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-ink-500">{hint}</span> : null}
    </label>
  );
}

/** Étiquette colorée selon un ton prédéfini (style Apple pill). */
export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) {
  const tones: Record<string, string> = {
    neutral: 'bg-white/[0.08] text-ink-200 border-white/[0.12]',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    red: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    blue: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    purple: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    gray: 'bg-white/[0.06] text-ink-400 border-white/[0.1]',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-medium backdrop-blur-md ${tones[tone] ?? tones.neutral}`}
    >
      {children}
    </span>
  );
}

/** Fenêtre modale centrée (Feuille macOS en verre dépoli). */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-3xl border border-white/[0.14] bg-[#1c1c1e]/95 p-6 shadow-2xl backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between border-b border-white/[0.08] pb-3">
          <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.08] text-xs text-ink-300 hover:bg-white/[0.15] hover:text-white transition"
            onClick={onClose}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Indicateur de chargement Apple. */
export function Spinner({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-ink-400">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#0071e3] border-t-transparent" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

/** Message d'état vide centré style Apple. */
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] py-14 text-center text-ink-400 font-medium">
      {message}
    </div>
  );
}

/** Tuile statistique : grand chiffre Apple, label uppercase et accent de couleur. */
export function StatTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  accent?: string;
}) {
  return (
    <Card className="flex flex-col gap-1.5 hover:border-white/[0.2] transition">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">{label}</span>
      <span className={`text-3xl font-extrabold tracking-tight ${accent ?? 'text-white'}`}>{value}</span>
      {sub ? <span className="text-xs text-ink-400/90">{sub}</span> : null}
    </Card>
  );
}