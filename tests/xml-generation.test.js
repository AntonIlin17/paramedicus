import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTeddyBearXML } from '../server/services/xml.js';

test('Teddy Bear XML snapshot with optional fields omitted', () => {
  const xml = buildTeddyBearXML({
    form_number: 'TB-1709500000000',
    date_time: '2026-03-03T14:30:00',
    first_name: 'Jamie',
    last_name: 'Adams',
    medic_number: '10452',
  });

  assert.match(xml, /<TeddyBearTracking version="1.0">/);
  assert.match(xml, /<FormId>TB-1709500000000<\/FormId>/);
  assert.match(xml, /<PrimaryMedic>/);
  assert.doesNotMatch(xml, /<SecondMedic>/);
  assert.doesNotMatch(xml, /<Recipient>/);
});

test('Teddy Bear XML contains all fields when present', () => {
  const xml = buildTeddyBearXML({
    form_number: 'TB-222',
    date_time: '2026-03-03T14:30:00',
    first_name: 'Jamie',
    last_name: 'Adams',
    medic_number: '10452',
    second_first_name: 'Lisa',
    second_last_name: 'Patel',
    second_medic_number: '10789',
    recipient_age: 7,
    recipient_gender: 'Female',
    recipient_type: 'Bystander',
  });

  assert.match(xml, /<SecondMedic>/);
  assert.match(xml, /<Recipient>/);
  assert.match(xml, /<Age>7<\/Age>/);
  assert.match(xml, /<Type>Bystander<\/Type>/);
});
