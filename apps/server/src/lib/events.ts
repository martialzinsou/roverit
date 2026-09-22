import type { WebSocket } from 'ws';

/**
 * Registry des connexions WebSocket actives, utilisé pour diffuser
 * les événements temps réel (machines, OT, benchmarks...) aux clients.
 */
const sockets = new Set<WebSocket>();

/** Enregistre un client WebSocket et le retire automatiquement à sa fermeture. */
export function addSocket(client: WebSocket): void {
  sockets.add(client);
  client.on('close', () => sockets.delete(client));
}

/** Diffuse un événement (payload sérialisé JSON) à toutes les connexions ouvertes. */
export function broadcast(event: string, payload: unknown): void {
  const message = JSON.stringify({ event, payload, ts: new Date().toISOString() });
  for (const client of sockets) {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  }
}

/** Nombre de connexions WebSocket actuellement ouvertes. */
export function socketCount(): number {
  return sockets.size;
}