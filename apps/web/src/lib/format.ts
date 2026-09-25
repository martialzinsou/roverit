/**
 * RoverIt — format.ts
 * Auteur : Martial Zinsou
 */
/**
 * Fonctions utilitaires de formatage et d'affichage (dates, montants,
 * pourcentages, couleurs) communes à toutes les pages.
 */

/** Attend 'ms' millisecondes (sommeil asynchrone). */
export function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Formate une date ISO au format court français (ou '—' si absente). */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Formate une date ISO avec l'heure au format français (ou '—' si absente). */
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Formate un montant en euros (locale fr-FR, devise EUR) ou '—' si nul. */
export function fmtMoney(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

/** Formate un pourcentage arrondi (ex. « 75 % ») ou '—' si nul. */
export function fmtPct(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${Math.round(value)} %`;
}

/** Borne une valeur entre les bornes min et max. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Classe de couleur Tailwind selon le niveau de score de stabilité. */
export function scoreColor(score: number): string {
  if (score >= 90) return 'text-emerald-400';
  if (score >= 75) return 'text-lime-400';
  if (score >= 55) return 'text-amber-400';
  return 'text-red-400';
}

/** Classe de couleur Tailwind selon la température (seuils d'alerte). */
export function tempColor(temp: number | null | undefined): string {
  if (temp == null) return 'text-ink-400';
  if (temp > 90) return 'text-red-400';
  if (temp > 78) return 'text-amber-400';
  return 'text-emerald-400';
}