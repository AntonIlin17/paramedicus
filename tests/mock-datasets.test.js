import test from 'node:test';
import assert from 'node:assert/strict';
import { getFormSchema } from '../server/forms/schemas.js';
import { validateForm } from '../server/forms/validation.js';
import { buildTeddyBearXML } from '../server/services/xml.js';
import {
  occurrenceCases,
  pipelineIntentPrompts,
  scheduleSnapshot,
  sourceDocuments,
  statusSnapshot,
  teddyBearCases,
  teddyBearXMLCases,
} from '../mocks/mock-datasets.js';

function assertFieldsContain(actualFields, expectedFields, caseId, fieldType) {
  for (const field of expectedFields) {
    assert.ok(
      actualFields.includes(field),
      `[${caseId}] expected ${fieldType} field "${field}" to be present; got ${JSON.stringify(actualFields)}`,
    );
  }
}

test('Curated occurrence mock datasets align with validation expectations', () => {
  const schema = getFormSchema('occurrence');

  for (const caseItem of occurrenceCases) {
    const result = validateForm('occurrence', caseItem.formData, schema, {});
    assert.equal(result.canExport, caseItem.expected.canExport, `[${caseItem.id}] canExport mismatch`);

    const errorFields = result.errors.map((item) => item.field);
    const warningFields = result.warnings.map((item) => item.field);

    assertFieldsContain(errorFields, caseItem.expected.errorFields, caseItem.id, 'error');
    assertFieldsContain(warningFields, caseItem.expected.warningFields, caseItem.id, 'warning');
  }
});

test('Curated teddy bear mock datasets align with validation expectations', () => {
  const schema = getFormSchema('teddybear');

  for (const caseItem of teddyBearCases) {
    const result = validateForm('teddybear', caseItem.formData, schema, {});
    assert.equal(result.canExport, caseItem.expected.canExport, `[${caseItem.id}] canExport mismatch`);

    const errorFields = result.errors.map((item) => item.field);
    const warningFields = result.warnings.map((item) => item.field);

    assertFieldsContain(errorFields, caseItem.expected.errorFields, caseItem.id, 'error');
    assertFieldsContain(warningFields, caseItem.expected.warningFields, caseItem.id, 'warning');
  }
});

test('Curated teddy bear XML cases include/exclude expected tags', () => {
  for (const caseItem of teddyBearXMLCases) {
    const xml = buildTeddyBearXML(caseItem.formData);

    for (const expectedTag of caseItem.expectedIncludes) {
      assert.ok(xml.includes(expectedTag), `[${caseItem.id}] missing XML tag/content: ${expectedTag}`);
    }

    for (const unexpectedTag of caseItem.expectedExcludes) {
      assert.ok(!xml.includes(unexpectedTag), `[${caseItem.id}] should not include XML tag/content: ${unexpectedTag}`);
    }
  }
});

test('PDF-derived status and schedule snapshot metadata is coherent', () => {
  assert.equal(sourceDocuments.extractedSummary.checklistRevision, '20260225');
  assert.equal(statusSnapshot.summary.revision, '20260225');
  assert.deepEqual(statusSnapshot.badItems, ['ACRc', 'CERT-Va', 'OVER']);
  assert.equal(statusSnapshot.criticalActionsCount, 3);

  assert.equal(scheduleSnapshot.source, 'fallback');
  assert.deepEqual(scheduleSnapshot.activeUnits, ['4012', '4018', '4044']);
  assert.equal(scheduleSnapshot.scheduledNightUnits.length, 3);
});

test('Intent prompt fixtures capture expected routing targets', () => {
  assert.ok(pipelineIntentPrompts.length >= 4);
  assert.ok(pipelineIntentPrompts.some((item) => item.expectedFormType === 'occurrence'));
  assert.ok(pipelineIntentPrompts.some((item) => item.expectedFormType === 'teddybear'));
  assert.ok(pipelineIntentPrompts.some((item) => item.expectedIntent === 'status_query'));
  assert.ok(pipelineIntentPrompts.some((item) => item.expectedIntent === 'shift_query'));
});
