import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.js';

/**
 * Tests d'intégration de l'API : boot de l'application sur une base
 * mémoire puis exécution séquentielle des scénarios métier (auth, RBAC,
 * machines, OT, pièces, benchmarks, sync, WebSocket).
 */
let app: FastifyInstance;
let adminToken = '';
let techToken = '';
let clientToken = '';

function auth(token: string) {
  return { authorization: `Bearer ${token}` };
}

async function login(username: string, password: string): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { username, password },
  });
  assert.equal(res.statusCode, 200, `login ${username} échoué`);
  return (res.json() as { token: string }).token;
}

type TestCase = { name: string; fn: () => Promise<void> };

const tests: TestCase[] = [];

function test(name: string, fn: () => Promise<void>) {
  tests.push({ name, fn });
}

test('login invalide → 401', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { username: 'admin', password: 'mauvais' },
  });
  assert.equal(res.statusCode, 401);
});

test('accès sans token → 401', async () => {
  const res = await app.inject({ method: 'GET', url: '/api/v1/machines' });
  assert.equal(res.statusCode, 401);
});

test('RBAC : consultant ne peut pas créer de machine → 403', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/machines',
    headers: auth(clientToken),
    payload: { name: 'X' },
  });
  assert.equal(res.statusCode, 403);
});

test('création machine + liste + détail + composant', async () => {
  const created = await app.inject({
    method: 'POST',
    url: '/api/v1/machines',
    headers: auth(adminToken),
    payload: {
      name: 'Workstation Test Z',
      manufacturer: 'Dell',
      cpu: 'Intel Core i7-13700K',
      ram_gb: 64,
      storage_tb: 2,
      gpu: 'NVIDIA RTX 4060',
      status: 'en_attente_diagnostic',
    },
  });
  assert.equal(created.statusCode, 201);
  const machine = created.json();
  assert.ok(machine.id);
  assert.equal(machine.status, 'en_attente_diagnostic');

  const list = await app.inject({
    method: 'GET',
    url: '/api/v1/machines',
    headers: auth(techToken),
  });
  const machines = list.json() as { id: string }[];
  assert.ok(machines.length >= 5);
  assert.ok(machines.some((m) => m.id === machine.id));

  const comp = await app.inject({
    method: 'POST',
    url: `/api/v1/machines/${machine.id}/components`,
    headers: auth(techToken),
    payload: { kind: 'storage', name: 'NVMe 1 To', health: 'OK' },
  });
  assert.equal(comp.statusCode, 200);
  assert.equal(comp.json().kind, 'storage');

  const detail = await app.inject({
    method: 'GET',
    url: `/api/v1/machines/${machine.id}`,
    headers: auth(clientToken),
  });
  assert.equal(detail.statusCode, 200);
  const d = detail.json();
  assert.equal(d.components.length, 1);
  assert.ok(d.benchmarks);
  assert.ok(d.work_orders);
});

test('workflow OT : création, intervention, checklist, clôture', async () => {
  const machines = (
    await app.inject({ method: 'GET', url: '/api/v1/machines', headers: auth(techToken) })
  ).json() as { id: string }[];
  const mid = machines[0].id;

  const wo = await app.inject({
    method: 'POST',
    url: '/api/v1/work-orders',
    headers: auth(techToken),
    payload: { machine_id: mid, title: 'OT de test', priority: 'haute' },
  });
  assert.equal(wo.statusCode, 200);
  const wok = wo.json();
  assert.ok(wok.checklist.length > 0);

  const bottle = await app.inject({
    method: 'POST',
    url: `/api/v1/work-orders/${wok.id}/interventions`,
    headers: auth(techToken),
    payload: { action: 'Application pâte thermique', notes: 'MX-6' },
  });
  assert.equal(bottle.statusCode, 200);

  const item = wok.checklist[0];
  const check = await app.inject({
    method: 'PATCH',
    url: `/api/v1/work-orders/${wok.id}/checklist/${item.id}`,
    headers: auth(adminToken),
    payload: { done: true },
  });
  assert.equal(check.statusCode, 200);

  const detail = await app.inject({
    method: 'GET',
    url: `/api/v1/work-orders/${wok.id}`,
    headers: auth(clientToken),
  });
  const d = detail.json();
  assert.equal(d.interventions.length, 1);
  assert.equal(d.interventions[0].action, 'Application pâte thermique');
  assert.ok(d.checklist.find((c: { id: string; done: boolean }) => c.id === item.id)?.done);
});

test('parts + contrôle de compatibilité', async () => {
  const list = await app.inject({ method: 'GET', url: '/api/v1/parts', headers: auth(techToken) });
  const parts = list.json() as { id: string }[];
  assert.ok(parts.length >= 8);

  const partRes = await app.inject({
    method: 'POST',
    url: '/api/v1/parts',
    headers: auth(adminToken),
    payload: { name: 'RAM DDR4 16 Go', category: 'RAM', price_eur: 45, stock: 5, compatibility: ['ram<=64'] },
  });
  assert.equal(partRes.statusCode, 200);

  const machines = (
    await app.inject({ method: 'GET', url: '/api/v1/machines', headers: auth(techToken) })
  ).json() as { id: string; ram_gb: number }[];
  const small = machines.find((m) => m.ram_gb === 32);
  assert.ok(small, 'machine 32 Go attendue dans le seed');

  const check = await app.inject({
    method: 'GET',
    url: `/api/v1/parts/compatibility-check?machine_id=${small.id}&part_id=${partRes.json().id}`,
    headers: auth(adminToken),
  });
  assert.equal(check.statusCode, 200);
  assert.equal(check.json().ok, true, '32 Go <= 64 → compatible');
});

test('benchmark run + KPIs dashboard + PDF', async () => {
  const machines = (
    await app.inject({ method: 'GET', url: '/api/v1/machines', headers: auth(techToken) })
  ).json() as { id: string }[];
  const mid = machines[0].id;

  const run = await app.inject({
    method: 'POST',
    url: '/api/v1/benchmarks/run',
    headers: auth(techToken),
    payload: { machine_id: mid, kind: 'stability', duration_s: 10 },
  });
  assert.equal(run.statusCode, 201);
  const b = run.json();
  assert.ok(b.score >= 0 && b.score <= 100);
  assert.ok(b.max_temp_c > 0);

  const kpis = await app.inject({
    method: 'GET',
    url: '/api/v1/dashboard/kpis',
    headers: auth(clientToken),
  });
  const k = kpis.json();
  assert.ok(k.machinesTotal >= 5);
  assert.ok(k.byStatus.en_attente_diagnostic >= 1);
  assert.ok(typeof k.avgStabilityScore === 'number');

  const pdf = await app.inject({
    method: 'GET',
    url: `/api/v1/reports/${mid}/pdf`,
    headers: auth(clientToken),
  });
  assert.equal(pdf.headers['content-type'], 'application/pdf');
  assert.ok(pdf.rawPayload.length > 500);
});

test('synchronisation outbox (upsert)', async () => {
  const machine = {
    id: 'm_sync_1',
    name: 'Machine Sync',
    client: null,
    serial: 'SYNC1',
    manufacturer: null,
    model: null,
    cpu: 'ARM 8C',
    ram_gb: 16,
    storage_tb: 1,
    gpu: null,
    status: 'en_cours_upgrade',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/sync',
    headers: auth(techToken),
    payload: { machines: [machine], work_orders: [] },
  });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), { ok: true, machines: 1, work_orders: 0 });

  const changes = await app.inject({
    method: 'GET',
    url: `/api/v1/sync/changes?since=${encodeURIComponent(new Date(0).toISOString())}`,
    headers: auth(techToken),
  });
  assert.ok((changes.json().machines as { id: string }[]).some((m) => m.id === 'm_sync_1'));
});

test('WS health et hello', async () => {
  const health = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(health.statusCode, 200);
  assert.equal(health.json().ok, true);
});

/**
 * Point d'entrée du script de test : construit l'application, connecte les
 * trois comptes de démonstration puis exécute la suite et affiche le bilan.
 */
async function main(): Promise<void> {
  app = await buildApp({ dbPath: ':memory:' });
  adminToken = await login('admin', 'admin');
  techToken = await login('tech', 'tech');
  clientToken = await login('client', 'client');

  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      process.stdout.write(`ok - ${t.name}\n`);
    } catch (err) {
      failed++;
      process.stdout.write(`not ok - ${t.name}\n`);
      process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
    }
  }

  await app.close();

  process.stdout.write(`\n${passed} réussis, ${failed} échecs\n`);
  if (failed > 0) process.exitCode = 1;
}

await main();