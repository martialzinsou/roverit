/**
 * Bibliothèque de composants UI Liquid Glass révolutionnaire
 * Apple Liquid Glass + Google Material 3 Expressive
 * Verre liquide ultra-translucide, réfraction et profondeur
 * Auteur : Martial Zinsou
 */
import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from 'react';

/** Conteneur de carte avec style unifié, className et clic optionnels. */
export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return <div className={`card ${className}`} onClick={onClick}>{children}</div>;
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
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/50">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-white/30">{hint}</span> : null}
    </label>
  );
}

/** Étiquette colorée selon un ton prédéfini (style Apple pill). */
export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) {
  const tones: Record<string, string> = {
    neutral: 'bg-white/[0.08] text-white/80 border-white/[0.12]',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
    green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
    red: 'bg-rose-500/15 text-rose-300 border-rose-500/20',
    blue: 'bg-sky-500/15 text-sky-300 border-sky-500/20',
    purple: 'bg-purple-500/15 text-purple-300 border-purple-500/20',
    gray: 'bg-white/[0.05] text-white/40 border-white/[0.08]',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-xl ${tones[tone] ?? tones.neutral}`} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)' }} onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-[24px] p-6" style={{
        background: 'linear-gradient(135deg, rgba(28,28,30,0.9) 0%, rgba(16,16,18,0.95) 100%)',
        backdropFilter: 'blur(40px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
      }} onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
          <button className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 hover:text-white transition" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }} onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Indicateur de chargement Apple. */
export function Spinner({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-[#0071e3]" style={{ boxShadow: '0 0 10px rgba(0,113,227,0.3)' }} />
      <span className="text-sm font-medium text-white/50">{label}</span>
    </div>
  );
}

/** Message d'état vide centré style Apple. */
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[24px] py-14 text-center font-medium" style={{
      background: 'rgba(255,255,255,0.04)',
      backdropFilter: 'blur(20px)',
      border: '1px dashed rgba(255,255,255,0.08)',
      color: 'rgba(255,255,255,0.4)',
    }}>
      {message}
    </div>
  );
}

/** Tuile statistique : grand chiffre Apple, label uppercase et accent de couleur. */
export function StatTile({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: string; accent?: string }) {
  return (
    <div className="card flex flex-col gap-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">{label}</span>
      <span className={`text-3xl font-extrabold tracking-tight ${accent ?? 'text-white'}`} style={{ textShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>{value}</span>
      {sub ? <span className="text-xs text-white/30">{sub}</span> : null}
    </div>
  );
}

export function Switch({ checked, onChange, className = '', ...props }: { checked: boolean; onChange: React.ChangeEventHandler<HTMLInputElement>; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const trackStyle: React.CSSProperties = {
    background: checked ? 'linear-gradient(135deg, #0071e3, #a855f7)' : 'rgba(255,255,255,0.12)'
  };
  const thumbStyle: React.CSSProperties = {
    transform: checked ? 'translateX(100%)' : 'translateX(0)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
  };

  return (
    <label className={`inline-flex items-center gap-3 cursor-pointer ${className}`}>
      <span className="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200" style={trackStyle}>
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only"
          {...props}
        />
        <span className="absolute left-0.5 inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200" style={thumbStyle} />
      </span>
    </label>
  );
}