import express from 'express';
import { runPipeline } from '../ai/pipeline.js';
import { sessionManager } from '../services/session.js';
import { getFormSchema } from '../forms/schemas.js';
import { validateForm } from '../forms/validation.js';

const router = express.Router();

router.post('/turn', async (req, res) => {
  const { sessionId, text, source = 'keyboard' } = req.body || {};
  if (!sessionId || !text) {
    res.status(400).json({ error: 'sessionId and text are required.' });
    return;
  }

  const session = sessionManager.get(sessionId) || sessionManager.create(sessionId);
  sessionManager.addMessage(sessionId, 'user', text, { source });

  try {
    const result = await runPipeline(session, text);

    if (result.formType && result.formUpdates) {
      sessionManager.updateForm(sessionId, result.formType, result.formUpdates, result.fieldConfidence || {});
    }

    sessionManager.addMessage(sessionId, 'assistant', result.responseText, { intent: result.intent });

    const updatedSession = sessionManager.get(sessionId);
    let formState = null;
    if (result.formType) {
      const form = updatedSession.activeForms[result.formType] || { fields: {}, confidence: {} };
      const schema = getFormSchema(result.formType);
      formState = {
        formType: result.formType,
        fields: form.fields,
        confidence: form.confidence,
        validation: validateForm(result.formType, form.fields, schema, form.confidence),
      };
    }

    res.json({
      ok: true,
      result,
      formState,
    });
  } catch (err) {
    console.error('[chat route] error', err.message);
    res.status(500).json({
      ok: false,
      error: 'I had a processing issue. Please try again.',
    });
  }
});

export default router;
