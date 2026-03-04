import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getFormSchema } from '../server/forms/schemas.js';
import { validateForm } from '../server/forms/validation.js';
import { buildTeddyBearXML } from '../server/services/xml.js';
import { mockProfiles, scheduleSnapshot, sourceDocuments, statusSnapshot } from '../mocks/mock-datasets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv = []) {
  const args = {
    count: 8,
    seed: Date.now(),
    output: 'mocks/generated',
    withTests: false,
    validOnly: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--count') {
      args.count = Number(argv[i + 1]);
      i += 1;
      continue;
    }
    if (token === '--seed') {
      args.seed = Number(argv[i + 1]);
      i += 1;
      continue;
    }
    if (token === '--output') {
      args.output = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === '--with-tests') {
      args.withTests = true;
      continue;
    }
    if (token === '--valid-only') {
      args.validOnly = true;
      continue;
    }
    if (token === '--help' || token === '-h') {
      args.help = true;
    }
  }

  if (!Number.isFinite(args.count) || args.count < 1) args.count = 8;
  if (!Number.isFinite(args.seed)) args.seed = Date.now();
  if (!args.output || typeof args.output !== 'string') args.output = 'mocks/generated';

  return args;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function rng() {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

function randomInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function randomDate(rng) {
  const month = pad2(randomInt(rng, 1, 12));
  const day = pad2(randomInt(rng, 1, 28));
  return `2026-${month}-${day}`;
}

function randomTime(rng) {
  const hh = pad2(randomInt(rng, 0, 23));
  const mm = pad2(randomInt(rng, 0, 59));
  return `${hh}:${mm}`;
}

function randomDateTime(rng) {
  return `${randomDate(rng)}T${randomTime(rng)}`;
}

function makeOccurrenceValid(rng, profile, index) {
  const classification = pick(rng, [
    'Vehicle Incident',
    'Equipment Failure',
    'Workplace Injury',
    'Patient Complaint',
    'Near Miss',
    'Other',
  ]);
  const occurrenceType = pick(rng, ['Call Related', 'Non-Call Related', 'Station Related', 'Vehicle Related']);
  const service = profile?.service || pick(rng, ['EAI Ambulance Service', 'Muskoka Paramedic Services', 'County EMS']);
  const role = profile?.role || pick(rng, ['Primary Care Paramedic', 'Advanced Care Paramedic', 'Supervisor', 'Driver']);
  const vehicleNumber = String(profile?.vehicleNumber || randomInt(rng, 4001, 4099));

  return {
    id: `occ-${index}-valid`,
    formType: 'occurrence',
    formData: {
      date: randomDate(rng),
      time: randomTime(rng),
      classification,
      occurrence_type: occurrenceType,
      brief_description: `Generated incident ${index} - ${classification.toLowerCase()}`,
      service,
      vehicle_number: vehicleNumber,
      role,
      badge_number: profile?.badgeNumber || `B-${randomInt(rng, 3000, 3999)}`,
      observation: `Generated observation ${index}. No patient injury reported.`,
      requested_by: pick(rng, ['Supervisor Chen', 'Operations Lead', 'Duty Commander']),
      report_creator: `${profile?.firstName || 'Alex'} ${profile?.lastName || 'Morgan'}`.trim(),
    },
  };
}

function makeOccurrenceInvalid(rng, profile, index) {
  const base = makeOccurrenceValid(rng, profile, index).formData;
  const mode = pick(rng, ['missing_required', 'bad_vehicle']);
  const data = { ...base };

  if (mode === 'missing_required') {
    delete data.observation;
    delete data.requested_by;
  } else if (mode === 'bad_vehicle') {
    data.vehicle_number = String(randomInt(rng, 1, 999));
  }

  return {
    id: `occ-${index}-${mode}`,
    formType: 'occurrence',
    formData: data,
  };
}

function makeTeddyValid(rng, profile, index) {
  const includeSecond = rng() > 0.6;
  const includeRecipient = rng() > 0.25;

  const data = {
    form_number: `TB-${1709500000000 + index}`,
    date_time: randomDateTime(rng),
    first_name: profile?.firstName || pick(rng, ['Jamie', 'Lisa', 'Alex', 'Morgan']),
    last_name: profile?.lastName || pick(rng, ['Adams', 'Patel', 'Chen', 'Diaz']),
    medic_number: profile?.medicNumber || String(randomInt(rng, 10000, 99999)),
  };

  if (includeSecond) {
    data.second_first_name = pick(rng, ['Taylor', 'Jordan', 'Riley']);
    data.second_last_name = pick(rng, ['Brown', 'Wong', 'Singh']);
    data.second_medic_number = String(randomInt(rng, 10000, 99999));
  }

  if (includeRecipient) {
    data.recipient_age = randomInt(rng, 2, 14);
    data.recipient_gender = pick(rng, ['Male', 'Female', 'Other']);
    data.recipient_type = pick(rng, ['Patient', 'Family', 'Bystander']);
  }

  return {
    id: `tb-${index}-valid`,
    formType: 'teddybear',
    formData: data,
  };
}

function makeTeddyInvalid(rng, profile, index) {
  const base = makeTeddyValid(rng, profile, index).formData;
  const mode = pick(rng, ['bad_primary_medic', 'bad_age', 'bad_second_medic']);
  const data = { ...base };

  if (mode === 'bad_primary_medic') {
    data.medic_number = String(randomInt(rng, 1000, 9999));
  } else if (mode === 'bad_age') {
    data.recipient_age = randomInt(rng, 121, 160);
    data.recipient_type = data.recipient_type || 'Patient';
  } else if (mode === 'bad_second_medic') {
    data.second_medic_number = String(randomInt(rng, 100, 999));
  }

  return {
    id: `tb-${index}-${mode}`,
    formType: 'teddybear',
    formData: data,
  };
}

function buildExpected(caseItem) {
  const schema = getFormSchema(caseItem.formType);
  const validation = validateForm(caseItem.formType, caseItem.formData, schema, {});
  return {
    canExport: validation.canExport,
    errorFields: validation.errors.map((item) => item.field),
    warningFields: validation.warnings.map((item) => item.field),
  };
}

function buildXMLExpectation(caseItem) {
  if (caseItem.formType !== 'teddybear') return null;
  const xml = buildTeddyBearXML(caseItem.formData);
  return {
    hasSecondMedic: xml.includes('<SecondMedic>'),
    hasRecipient: xml.includes('<Recipient>'),
    hasPrimaryMedic: xml.includes('<PrimaryMedic>'),
  };
}

function buildSuite({ seed, count, validOnly }) {
  const rng = mulberry32(seed);
  const formCases = [];

  for (let i = 1; i <= count; i += 1) {
    const profile = pick(rng, mockProfiles);
    const occValid = makeOccurrenceValid(rng, profile, i);
    const tbValid = makeTeddyValid(rng, profile, i);
    formCases.push(occValid, tbValid);

    if (!validOnly) {
      const occInvalid = makeOccurrenceInvalid(rng, profile, i);
      const tbInvalid = makeTeddyInvalid(rng, profile, i);
      formCases.push(occInvalid, tbInvalid);
    }
  }

  const finalizedCases = formCases.map((item) => ({
    ...item,
    expected: buildExpected(item),
    xmlExpectation: buildXMLExpectation(item),
  }));

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      seed,
      count,
      validOnly,
      sourceDocuments,
      notes: 'Generated mock datasets and expected test assertions.',
    },
    profiles: mockProfiles,
    statusSnapshot,
    scheduleSnapshot,
    formCases: finalizedCases,
  };
}

function buildGeneratedTestContent(jsonFileName) {
  return `import fs from 'fs';
import path from 'path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'url';
import { getFormSchema } from '../../server/forms/schemas.js';
import { validateForm } from '../../server/forms/validation.js';
import { buildTeddyBearXML } from '../../server/services/xml.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const suite = JSON.parse(fs.readFileSync(path.join(__dirname, '${jsonFileName}'), 'utf-8'));

for (const caseItem of suite.formCases) {
  test(\`[generated] \${caseItem.id}\`, () => {
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
`;
}

function writeOutput({ suite, outputDir, withTests }) {
  fs.mkdirSync(outputDir, { recursive: true });
  const fileBase = `mock-suite-seed-${suite.meta.seed}`;
  const jsonPath = path.join(outputDir, `${fileBase}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(suite, null, 2)}\n`, 'utf-8');

  let testPath = null;
  if (withTests) {
    testPath = path.join(outputDir, `${fileBase}.test.js`);
    fs.writeFileSync(testPath, buildGeneratedTestContent(path.basename(jsonPath)), 'utf-8');
  }

  return {
    jsonPath,
    testPath,
  };
}

function printHelp() {
  console.log(`Usage: node scripts/generate-mocks.js [options]

Options:
  --count <n>       Number of valid scenarios per form type (default: 8)
  --seed <n>        Deterministic seed (default: current timestamp)
  --output <dir>    Output directory (default: mocks/generated)
  --with-tests      Generate a runnable node:test file beside the JSON suite
  --valid-only      Generate only valid form cases
  --help            Show this help

Examples:
  node scripts/generate-mocks.js --count 10 --seed 20260304
  node scripts/generate-mocks.js --count 5 --with-tests
`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const suite = buildSuite({
    seed: args.seed,
    count: args.count,
    validOnly: args.validOnly,
  });

  const outputDir = path.resolve(ROOT, args.output);
  const out = writeOutput({
    suite,
    outputDir,
    withTests: args.withTests,
  });

  console.log(`Mock suite generated: ${path.relative(ROOT, out.jsonPath)}`);
  if (out.testPath) {
    console.log(`Generated test file: ${path.relative(ROOT, out.testPath)}`);
    console.log(`Run with: node --test ${path.relative(ROOT, out.testPath)}`);
  }
}

main();
