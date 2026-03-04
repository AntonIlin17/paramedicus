import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { sessionManager } from '../services/session.js';
import { FORM_SCHEMAS, getFormSchema } from '../forms/schemas.js';
import { validateForm } from '../forms/validation.js';
import { buildOccurrencePDFHTML, buildTeddyBearPDFHTML } from '../forms/templates.js';
import { generateAndSavePDF } from '../services/pdf.js';
import { buildTeddyBearXML, saveXMLArtifact } from '../services/xml.js';

const router = express.Router();

function requireSession(req, res) {
  const sessionId = req.query.sessionId || req.body.sessionId || req.headers['x-session-id'];
  if (!sessionId) {
    res.status(400).json({ error: 'sessionId is required.' });
    return null;
  }
  const session = sessionManager.get(sessionId) || sessionManager.create(sessionId);
  return { sessionId, session };
}

function buildFormPayload(session, formType) {
  const schema = getFormSchema(formType);
  if (!schema) return null;
  const form = session.activeForms[formType] || { fields: {}, confidence: {} };
  const validation = validateForm(formType, form.fields, schema, form.confidence);
  return {
    formType,
    schema,
    fields: form.fields,
    confidence: form.confidence,
    validation,
  };
}

router.get('/', (req, res) => {
  const context = requireSession(req, res);
  if (!context) return;

  const forms = Object.keys(FORM_SCHEMAS).map((formType) => buildFormPayload(context.session, formType));
  res.json({
    currentForm: context.session.currentForm,
    activeForms: context.session.activeForms,
    forms,
  });
});

router.get('/:formType', (req, res) => {
  const context = requireSession(req, res);
  if (!context) return;

  const payload = buildFormPayload(context.session, req.params.formType);
  if (!payload) {
    res.status(404).json({ error: 'Unknown form type.' });
    return;
  }

  res.json(payload);
});

router.post('/:formType/field', (req, res) => {
  const context = requireSession(req, res);
  if (!context) return;

  const { field, value } = req.body || {};
  if (!field) {
    res.status(400).json({ error: 'field is required.' });
    return;
  }

  const schema = getFormSchema(req.params.formType);
  if (!schema || !schema.fields[field]) {
    res.status(400).json({ error: 'Invalid formType or field.' });
    return;
  }

  sessionManager.updateForm(context.sessionId, req.params.formType, { [field]: value }, {});
  res.json(buildFormPayload(sessionManager.get(context.sessionId), req.params.formType));
});

router.post('/:formType/review', (req, res) => {
  const context = requireSession(req, res);
  if (!context) return;

  const payload = buildFormPayload(context.session, req.params.formType);
  if (!payload) {
    res.status(404).json({ error: 'Unknown form type.' });
    return;
  }

  res.json(payload);
});

router.post('/:formType/export', async (req, res) => {
  const context = requireSession(req, res);
  if (!context) return;

  const formType = req.params.formType;
  const schema = getFormSchema(formType);
  if (!schema) {
    res.status(404).json({ error: 'Unknown form type.' });
    return;
  }

  const form = context.session.activeForms[formType] || { fields: {}, confidence: {} };
  const validation = validateForm(formType, form.fields, schema, form.confidence);
  if (!validation.canExport) {
    res.status(400).json({
      error: 'Form has blocking errors.',
      validation,
    });
    return;
  }

  try {
    const profile = context.session.profile || {};
    const html =
      formType === 'occurrence'
        ? buildOccurrencePDFHTML(form.fields, profile)
        : buildTeddyBearPDFHTML(form.fields, profile);

    const pdfArtifact = await generateAndSavePDF({
      sessionId: context.sessionId,
      formType,
      htmlContent: html,
    });

    const pdfRecord = sessionManager.addArtifact(context.sessionId, {
      id: uuidv4(),
      draftId: `${formType}-${Date.now()}`,
      type: 'pdf',
      formType,
      path: pdfArtifact.publicPath,
      fileName: pdfArtifact.fileName,
    });

    let xmlRecord = null;
    if (formType === 'teddybear') {
      const xmlContent = buildTeddyBearXML(form.fields);
      const xmlArtifact = saveXMLArtifact({
        sessionId: context.sessionId,
        formType,
        xmlContent,
      });

      xmlRecord = sessionManager.addArtifact(context.sessionId, {
        id: uuidv4(),
        draftId: `${formType}-${Date.now()}`,
        type: 'xml',
        formType,
        path: xmlArtifact.publicPath,
        fileName: xmlArtifact.fileName,
      });
    }

    res.json({
      ok: true,
      validation,
      artifacts: {
        pdf: pdfRecord,
        xml: xmlRecord,
      },
    });
  } catch (err) {
    console.error('[forms export] error', err.message);
    res.status(500).json({ error: 'Failed to export form.', detail: err.message });
  }
});

export default router;
