import fs from 'fs';
import path from 'path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'url';
import { getFormSchema } from '../../server/forms/schemas.js';
import { validateForm } from '../../server/forms/validation.js';
import { buildTeddyBearXML } from '../../server/services/xml.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const suite = JSON.parse(fs.readFileSync(path.join(__dirname, 'mock-suite-seed-20260304.json'), 'utf-8'));

for (const caseItem of suite.formCases) {
  test(`[generated] ${caseItem.id}`, () => {
    const schema = getFormSchema(caseItem.formType);
    const result = validateForm(caseItem.formType, caseItem.formData, schema, {});

    assert.equal(result.canExport, caseItem.expected.canExport);
    assert.deepEqual(result.errors.map((item) => item.field), caseItem.expected.errorFields);
    assert.deepEqual(result.warnings.map((item) => item.field), caseItem.expected.warningFields);

    if (caseItem.formType === 'teddybear') {
      const xml = buildTeddyBearXML(caseItem.formData);
      assert.equal(xml.includes('<PrimaryMedic>'), caseItem.xmlExpectation.hasPrimaryMedic);
      assert.equal(xml.includes('<SecondMedic>'), caseItem.xmlExpectation.hasSecondMedic);
      assert.equal(xml.includes('<Recipient>'), caseItem.xmlExpectation.hasRecipient);
    }
  });
}
