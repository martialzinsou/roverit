/**
 * RoverIt — auth.ts
 * Auteur : Martial Zinsou
 */
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Role } from '@roverit/shared';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

/**
 * Contexte d'authentification décodé depuis le JWT et attaché à la requête.
 */
export interface AuthContext {
  userId: string;
  username: string;
  role: Role;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthContext;
  }
}

/** Signe un JWT contenant le contexte d'authentification de l'utilisateur. */
export function signToken(ctx: AuthContext): string {
  return jwt.sign(ctx, config.jwtSecret, {
    expiresIn: config.tokenTtl as jwt.SignOptions['expiresIn'],
  });
}

/** Vérifie un JWT et renvoie le contexte d'authentification associé. */
export function verifyToken(token: string): AuthContext {
  return jwt.verify(token, config.jwtSecret) as AuthContext;
}

/** Crée une erreur HTTP transportant un code de statut. */
export function httpError(status: number, message: string): Error & { statusCode: number } {
  const err = new Error(message) as Error & { statusCode: number };
  err.statusCode = status;
  return err;
}

/**
 * Middleware Fastify : exige un en-tête `Authorization: Bearer <token>`
 * valide, puis attache le contexte utilisateur à la requête.
 */
export async function authenticate(
  req: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw httpError(401, 'Authentification requise');
  }
  try {
    req.user = verifyToken(header.slice(7));
  } catch {
    throw httpError(401, 'Token invalide ou expiré');
  }
}

/**
 * Fabrique un middleware Fastify vérifiant que le rôle de l'utilisateur
 * authentifié est inclus dans la liste autorisée (RBAC).
 */
export function requireRole(...roles: Role[]) {
  return async function (
    req: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> {
    if (!req.user) {
      throw httpError(401, 'Authentification requise');
    }
    if (!roles.includes(req.user.role)) {
      throw httpError(403, 'Droits insuffisants pour cette opération');
    }
  };
}