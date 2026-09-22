import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Configuration centrale du serveur, chargée depuis les variables
 * d'environnement (avec valeurs par défaut pour le développement local).
 */
export const config = {
  port: Number(process.env.PORT ?? 3001),
  host: process.env.HOST ?? '0.0.0.0',
  jwtSecret:
    process.env.JWT_SECRET ?? 'dev-secret-roverit-change-in-prod',
  tokenTtl: process.env.TOKEN_TTL ?? '12h',
  dbPath:
    process.env.DB_PATH ??
    path.join(__dirname, '..', 'data', 'roverit.db'),
  publicDir: process.env.PUBLIC_DIR ?? path.resolve(__dirname, '..', '..', 'web', 'dist'),
};