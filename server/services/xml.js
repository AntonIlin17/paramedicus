import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Builder } from 'xml2js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARTIFACT_DIR = path.resolve(__dirname, '../data/artifacts');

export function buildTeddyBearXML(formData = {}) {
  const root = {
    TeddyBearTracking: {
      $: { version: '1.0' },
      Meta: {
        GeneratedAt: new Date().toISOString(),
        FormId: formData.form_number || `TB-${Date.now()}`,
        GeneratedBy: 'MedicOS AI Assistant',
      },
      Distribution: {
        DateTime: formData.date_time || new Date().toISOString(),
      },
      PrimaryMedic: {
        FirstName: formData.first_name || '',
        LastName: formData.last_name || '',
        MedicNumber: formData.medic_number || '',
      },
      Recipient: {},
    },
  };

  if (formData.second_first_name || formData.second_last_name || formData.second_medic_number) {
    root.TeddyBearTracking.SecondMedic = {};
    if (formData.second_first_name) root.TeddyBearTracking.SecondMedic.FirstName = formData.second_first_name;
    if (formData.second_last_name) root.TeddyBearTracking.SecondMedic.LastName = formData.second_last_name;
    if (formData.second_medic_number) root.TeddyBearTracking.SecondMedic.MedicNumber = formData.second_medic_number;
  }

  if (formData.recipient_age !== undefined && formData.recipient_age !== null && formData.recipient_age !== '') {
    root.TeddyBearTracking.Recipient.Age = String(formData.recipient_age);
  }
  if (formData.recipient_gender) {
    root.TeddyBearTracking.Recipient.Gender = formData.recipient_gender;
  }
  if (formData.recipient_type) {
    root.TeddyBearTracking.Recipient.Type = formData.recipient_type;
  }

  if (Object.keys(root.TeddyBearTracking.Recipient).length === 0) {
    delete root.TeddyBearTracking.Recipient;
  }

  const builder = new Builder({
    headless: false,
    xmldec: {
      version: '1.0',
      encoding: 'UTF-8',
    },
    renderOpts: { pretty: true, indent: '  ', newline: '\n' },
  });

  return builder.buildObject(root);
}

export function saveXMLArtifact({ sessionId, formType, xmlContent }) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const fileName = `${sessionId}_${formType}_${Date.now()}.xml`;
  const absolutePath = path.join(ARTIFACT_DIR, fileName);
  fs.writeFileSync(absolutePath, xmlContent, 'utf-8');
  return {
    fileName,
    absolutePath,
    publicPath: `/api/artifacts/${fileName}`,
  };
}
