import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { sessionManager } from '../services/session.js';
import { getFormSchema } from '../forms/schemas.js';
import { validateForm } from '../forms/validation.js';
import { buildOccurrencePDFHTML, buildTeddyBearPDFHTML, applyTemplateValues, buildEmailHTML } from '../forms/templates.js';
import { generateAndSavePDF } from '../services/pdf.js';
import { buildTeddyBearXML, saveXMLArtifact } from '../services/xml.js';
import { buildEmailPreview, sendFormEmail } from '../services/email.js';
import { config } from '../config.js';

const router = express.Router();

function getSessionContext(req, res) {
  const sessionId = req.body.sessionId || req.query.sessionId || req.headers['x-session-id'];
  if (!sessionId) {
    res.status(400).json({ error: 'sessionId is required' });
    return null;
  }
  const session = sessionManager.get(sessionId);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return null;
  }
  return { sessionId, session };
}

function deriveArtifacts(formType, sessionId, formData, profile) {
  return (async () => {
    const html = formType === 'occurrence' ? buildOccurrencePDFHTML(formData, profile) : buildTeddyBearPDFHTML(formData, profile);

    const pdf = await generateAndSavePDF({
      sessionId,
      formType,
      htmlContent: html,
    });

    let xml = null;
    let xmlContent = null;
    if (formType === 'teddybear') {
      xmlContent = buildTeddyBearXML(formData);
      xml = saveXMLArtifact({ sessionId, formType, xmlContent });
    }

    return {
      pdf,
      xml,
      xmlContent,
    };
  })();
}

function buildEmailPayload({ schema, form, profile, formType, validation, to }) {
  const subject = applyTemplateValues(schema.emailSubjectTemplate, {
    ...form.fields,
    report_creator: form.fields.report_creator || `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
    first_name: form.fields.first_name || profile.firstName || '',
    last_name: form.fields.last_name || profile.lastName || '',
    occurrence_ref: form.fields.occurrence_ref || `OCC-${Date.now()}`,
    form_number: form.fields.form_number || `TB-${Date.now()}`,
  });

  const htmlBody = buildEmailHTML({
    formType,
    formName: schema.displayName,
    formData: form.fields,
    profile,
    validation,
  });

  return {
    to,
    subject,
    htmlBody,
  };
}

router.post('/preview', async (req, res) => {
  const context = getSessionContext(req, res);
  if (!context) return;

  const formType = req.body.formType || context.session.currentForm;
  const to = req.body.to || config.DEFAULT_RECIPIENT;

  if (!formType) {
    res.status(400).json({ error: 'No active form selected for preview.' });
    return;
  }

  const schema = getFormSchema(formType);
  if (!schema) {
    res.status(400).json({ error: 'Invalid form type.' });
    return;
  }

  const form = context.session.activeForms[formType] || { fields: {}, confidence: {} };
  const validation = validateForm(formType, form.fields, schema, form.confidence);

  try {
    const emailPayload = buildEmailPayload({
      schema,
      form,
      profile: context.session.profile || {},
      formType,
      validation,
      to,
    });

    let pdf = null;
    let xml = null;
    let artifactWarning = null;

    try {
      const artifacts = await deriveArtifacts(formType, context.sessionId, form.fields, context.session.profile || {});
      pdf = artifacts.pdf;
      xml = artifacts.xml;
    } catch (artifactErr) {
      console.error('[email preview] artifact generation error', artifactErr.message);
      artifactWarning = `Preview generated, but attachment generation failed: ${artifactErr.message}`;
    }

    const preview = buildEmailPreview({
      to: emailPayload.to,
      subject: emailPayload.subject,
      htmlBody: emailPayload.htmlBody,
      pdfFilename: pdf?.fileName || `${formType}-preview.pdf`,
      xmlFilename: formType === 'teddybear' ? xml?.fileName || 'teddybear-preview.xml' : undefined,
      demoMode: config.DEMO_MODE,
    });

    if (pdf) {
      sessionManager.addArtifact(context.sessionId, {
        id: uuidv4(),
        draftId: `${formType}-${Date.now()}`,
        type: 'pdf',
        formType,
        path: pdf.publicPath,
        fileName: pdf.fileName,
      });
    }

    if (xml) {
      sessionManager.addArtifact(context.sessionId, {
        id: uuidv4(),
        draftId: `${formType}-${Date.now()}`,
        type: 'xml',
        formType,
        path: xml.publicPath,
        fileName: xml.fileName,
      });
    }

    res.json({
      ok: true,
      validation,
      preview,
      warning: artifactWarning,
      artifacts: {
        pdfUrl: pdf?.publicPath || null,
        xmlUrl: xml?.publicPath || null,
      },
    });
  } catch (err) {
    console.error('[email preview] error', err.message);
    res.status(500).json({ error: 'Failed to build email preview.', detail: err.message });
  }
});

router.post('/send', async (req, res) => {
  const context = getSessionContext(req, res);
  if (!context) return;

  const formType = req.body.formType || context.session.currentForm;
  const to = req.body.to || config.DEFAULT_RECIPIENT;

  if (!formType) {
    res.status(400).json({ error: 'No active form selected for send.' });
    return;
  }

  const schema = getFormSchema(formType);
  if (!schema) {
    res.status(400).json({ error: 'Invalid form type.' });
    return;
  }

  const form = context.session.activeForms[formType] || { fields: {}, confidence: {} };
  const validation = validateForm(formType, form.fields, schema, form.confidence);
  if (!validation.canExport) {
    res.status(400).json({ error: 'Form has blocking validation errors.', validation });
    return;
  }

  try {
    const { pdf, xml, xmlContent } = await deriveArtifacts(
      formType,
      context.sessionId,
      form.fields,
      context.session.profile || {},
    );
    const emailPayload = buildEmailPayload({
      schema,
      form,
      profile: context.session.profile || {},
      formType,
      validation,
      to,
    });

    const sendResult = await sendFormEmail({
      to: emailPayload.to,
      subject: emailPayload.subject,
      htmlBody: emailPayload.htmlBody,
      pdfBuffer: pdf.buffer,
      pdfFilename: pdf.fileName,
      xmlContent,
      xmlFilename: xml?.fileName,
    });

    sessionManager.addArtifact(context.sessionId, {
      id: uuidv4(),
      draftId: `${formType}-${Date.now()}`,
      type: 'pdf',
      formType,
      path: pdf.publicPath,
      fileName: pdf.fileName,
    });

    if (xml) {
      sessionManager.addArtifact(context.sessionId, {
        id: uuidv4(),
        draftId: `${formType}-${Date.now()}`,
        type: 'xml',
        formType,
        path: xml.publicPath,
        fileName: xml.fileName,
      });
    }

    const completed = sessionManager.completeForm(context.sessionId, formType);

    res.json({
      ok: true,
      sendResult,
      completed,
      validation,
    });
  } catch (err) {
    console.error('[email send] error', err.message);
    res.status(500).json({ error: 'Failed to send email.', detail: err.message });
  }
});

export default router;
