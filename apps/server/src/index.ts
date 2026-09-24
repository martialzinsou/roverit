/**
 * Point d'entrée du serveur : construit l'application Fastify puis
 * démarre l'écoute HTTP sur le port/host configurés.
 * Auteur : Martial Zinsou
 */
import { buildApp } from './app.js';
import { config } from './config.js';

const app = await buildApp({
  dbPath: config.dbPath,
  publicDir: config.publicDir,
  logger: true,
});

try {
  await app.listen({ port: config.port, host: config.host });
  app.log.info(`RoverIt API prête sur http://${config.host}:${config.port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}