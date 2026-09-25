/**
 * RoverIt — index.test.ts
 * Auteur : Martial Zinsou
 */
import {
  LIFECYCLE_STATUSES,
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_STATUSES,
  BENCHMARK_KINDS,
  newId,
  nowIso,
} from './index.js';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

test('newId génère des identifiants uniques', () => {
  assert.notStrictEqual(newId(), newId());
});

test('nowIso retourne une date ISO valide', () => {
  assert.match(nowIso(), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
});

test('les listes de statuts contiennent les valeurs attendues', () => {
  assert.equal(LIFECYCLE_STATUSES.length, 5);
  assert.ok(LIFECYCLE_STATUSES.includes('pret_deploiement'));
  assert.ok(WORK_ORDER_STATUSES.includes('terminee'));
  assert.ok(WORK_ORDER_PRIORITIES.includes('critique'));
  assert.equal(BENCHMARK_KINDS.length, 5);
});