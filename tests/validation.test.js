import test from 'node:test';
import assert from 'node:assert/strict';
import { validateForm } from '../server/forms/validation.js';
import { getFormSchema } from '../server/forms/schemas.js';

const occurrenceValid = {
  date: '2026-03-03',
  time: '14:30',
  classification: 'Vehicle Incident',
  occurrence_type: 'Vehicle Related',
  brief_description: 'Minor backing incident at station',
  service: 'EAI Ambulance Service',
  vehicle_number: '4012',
  role: 'Advanced Care Paramedic',
  badge_number: 'B-3047',
  observation: 'Rear bumper contacted wall. No injuries.',
  requested_by: 'Supervisor Chen',
  report_creator: 'Jamie Adams',
};

const teddyValid = {
  form_number: 'TB-123',
  date_time: '2026-03-03T14:30',
  first_name: 'Jamie',
  last_name: 'Adams',
  medic_number: '10452',
  recipient_age: 7,
  recipient_gender: 'Female',
  recipient_type: 'Bystander',
};

test('Required fields missing returns errors', () => {
  const result = validateForm('occurrence', {}, getFormSchema('occurrence'));
  assert.ok(result.errors.length > 0);
  assert.equal(result.canExport, false);
});

test('Valid occurrence form has no blocking errors', () => {
  const result = validateForm('occurrence', occurrenceValid, getFormSchema('occurrence'));
  assert.equal(result.errors.length, 0);
  assert.equal(result.canExport, true);
});

test('Invalid medic number format returns error', () => {
  const result = validateForm(
    'teddybear',
    {
      ...teddyValid,
      medic_number: '1045',
    },
    getFormSchema('teddybear'),
  );

  assert.ok(result.errors.some((e) => e.field === 'medic_number'));
  assert.equal(result.canExport, false);
});

test('Invalid vehicle number format returns warning', () => {
  const result = validateForm(
    'occurrence',
    {
      ...occurrenceValid,
      vehicle_number: '41',
    },
    getFormSchema('occurrence'),
  );

  assert.ok(result.warnings.some((w) => w.field === 'vehicle_number'));
});
