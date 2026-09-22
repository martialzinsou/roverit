import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';

/**
 * Hache un mot de passe en clair avec un sel aléatoire (scrypt).
 * Le résultat suit le format `sel:hash`.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Vérifie qu'un mot de passe correspond au haché stocké, en utilisant
 * une comparaison à temps constant pour éviter les attaques temporelles.
 */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  return timingSafeEqual(Buffer.from(hash, 'hex'), candidate);
}