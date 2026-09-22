/**
 * Bibliothèque de composants UI réutilisables (formulaires, badges, modales…).
 * Composants génériques stylés avec Tailwind, sans logique métier.
 */
import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from 'react';

/** Conteneur de carte avec style unifié et className optionnel. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
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

/** Étiquette colorée selon un ton prédéfini (neutral, amber, green, red…). */
export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) {
  const tones: Record<string, string> = {
    neutral: 'bg-ink-800 text-ink-200 border-ink-700',
    amber: 'bg-brand-900/40 text-brand-300 border-brand-700',
    green: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
    red: 'bg-red-900/40 text-red-300 border-red-700',
    blue: 'bg-sky-900/40 text-sky-300 border-sky-700',
    gray: 'bg-ink-800 text-ink-400 border-ink-700',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone] ?? tones.neutral}`}
    >
      {children}
    </span>
  );
}

/** Fenêtre modale centrée avec fond sombre ; se ferme sur clic extérieur. */
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl border border-ink-700 bg-ink-900 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-ink-100">{title}</h3>
          <button className="text-ink-400 hover:text-ink-100" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Indicateur de chargement avec libellé optionnel. */
export function Spinner({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-ink-400">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

/** Message d'état vide centré, dans un encadré en pointillés. */
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-ink-700 py-12 text-center text-ink-500">
      {message}
    </div>
  );
}

/** Tuile statistique : libellé, valeur, sous-texte et couleur d'accent. */
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
    <Card className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">{label}</span>
      <span className={`text-2xl font-bold ${accent ?? 'text-ink-100'}`}>{value}</span>
      {sub ? <span className="text-xs text-ink-500">{sub}</span> : null}
    </Card>
  );
}