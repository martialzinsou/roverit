import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import type { User } from '@roverit/shared';
import {
  authenticate,
  httpError,
  requireRole,
  signToken,
} from '../lib/auth.js';
import { verifyPassword } from '../lib/password.js';
import { broadcast } from '../lib/events.js';

/**
 * Routes d'authentification : connexion (POST /auth/login), profil courant
 * (GET /auth/me), liste des utilisateurs et déconnexion.
 */
export function authRoutes(db: Database.Database) {
  return async function (app: FastifyInstance): Promise<void> {
    app.post('/auth/login', async (req, _reply) => {
      const body = req.body as { username?: string; password?: string };
      if (!body?.username || !body?.password) {
        throw httpError(400, 'Identifiant et mot de passe requis');
      }
      const row = db
        .prepare('SELECT * FROM users WHERE username = ?')
        .get(body.username) as
        | (User & { password_hash: string })
        | undefined;
      if (!row || !verifyPassword(body.password, row.password_hash)) {
        throw httpError(401, 'Identifiants invalides');
      }
      const user: User = {
        id: row.id,
        username: row.username,
        email: row.email,
        role: row.role,
        created_at: row.created_at,
      };
      const token = signToken({
        userId: row.id,
        username: row.username,
        role: row.role,
      });
      return { token, user };
    });

    app.get('/auth/me', { preHandler: authenticate }, async (req) => {
      const row = db
        .prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?')
        .get(req.user?.userId ?? '') as User | undefined;
      if (!row) throw httpError(404, 'Utilisateur introuvable');
      return row;
    });

    app.get(
      '/users',
      { preHandler: [authenticate, requireRole('admin')] },
      async () => {
        return db
          .prepare('SELECT id, username, email, role, created_at FROM users ORDER BY username')
          .all() as User[];
      },
    );

    app.post('/logout', { preHandler: authenticate }, async (_req, reply) => {
      broadcast('auth', { action: 'logout' });
      return reply.send({ ok: true });
    });
  };
}