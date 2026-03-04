import test from 'node:test';
import assert from 'node:assert/strict';
import { getZodSchema } from '../server/forms/schemas.js';

test('Zod schema accepts valid occurrence data', () => {
  const schema = getZodSchema('occurrence');
  const parsed = schema.safeParse({
    date: '2026-03-03',
    time: '14:30',
    classification: 'Vehicle Incident',
    occurrence_type: 'Vehicle Related',
    brief_description: 'Minor station collision',
    service: 'EAI Ambulance Service',
    vehicle_number: '4012',
    role: 'Advanced Care Paramedic',
    badge_number: 'B-3047',
    observation: 'No injuries',
    requested_by: 'Supervisor Chen',
    report_creator: 'Jamie Adams',
  });

  assert.equal(parsed.success, true);
});

test('Zod schema rejects invalid types', () => {
  const schema = getZodSchema('teddybear');
  const parsed = schema.safeParse({
    date_time: 123,
    first_name: 'Jamie',
    last_name: 'Adams',
    medic_number: '10452',
  });

  assert.equal(parsed.success, false);
});
