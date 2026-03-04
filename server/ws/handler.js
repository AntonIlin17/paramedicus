import { runPipeline } from '../ai/pipeline.js';
import { sessionManager } from '../services/session.js';
import { validateForm } from '../forms/validation.js';
import { getFormSchema } from '../forms/schemas.js';

function send(ws, payload) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function buildFormState(session, formType) {
  if (!formType) return null;
  const form = session.activeForms[formType] || { fields: {}, confidence: {} };
  const schema = getFormSchema(formType);
  const validation = validateForm(formType, form.fields || {}, schema, form.confidence || {});
  return {
    formType,
    fields: form.fields || {},
    confidence: form.confidence || {},
    validation,
    schema,
  };
}

export async function handleWSMessage(ws, sessionId, rawMessage) {
  let msg;
  try {
    msg = typeof rawMessage === 'string' ? JSON.parse(rawMessage) : rawMessage;
  } catch {
    send(ws, { type: 'error', message: 'Invalid websocket message format.' });
    return;
  }

  const session = sessionManager.get(sessionId) || sessionManager.create(sessionId);

  if (msg.type === 'user_message') {
    const text = String(msg.text || '').trim();
    if (!text) {
      send(ws, { type: 'error', message: 'Message text is empty.' });
      return;
    }

    sessionManager.addMessage(sessionId, 'user', text, { source: msg.source || 'keyboard' });
    send(ws, { type: 'typing', active: true });

    try {
      const result = await runPipeline(sessionManager.get(sessionId), text);

      sessionManager.addMessage(sessionId, 'assistant', result.responseText, {
        intent: result.intent,
      });

      if (result.formUpdates && result.formType) {
        sessionManager.updateForm(sessionId, result.formType, result.formUpdates, result.fieldConfidence || {});
      }

      const updatedSession = sessionManager.get(sessionId);
      const formState = result.formType ? buildFormState(updatedSession, result.formType) : null;

      send(ws, {
        type: 'assistant_message',
        payload: {
          text: result.responseText,
          intent: result.intent,
          intentConfidence: result.intentConfidence,
          formType: result.formType,
          formUpdates: result.formUpdates,
          fieldConfidence: result.fieldConfidence,
          validationWarnings: result.validationWarnings,
          suggestedActions: result.suggestedActions,
          followupQuestion: result.followupQuestion,
          formState,
          cleanedText: result.cleanedText,
          missingRequired: result.missingRequired,
        },
      });
    } catch (err) {
      console.error('[ws] Pipeline error:', err.message);
      const fallbackText = 'I had a brief processing issue, but I am still here. Please repeat that or type it, and I will continue your form.';
      sessionManager.addMessage(sessionId, 'assistant', fallbackText, { error: err.message });

      send(ws, {
        type: 'assistant_message',
        payload: {
          text: fallbackText,
          intent: 'general_chat',
          formType: null,
          formUpdates: null,
          fieldConfidence: {},
          validationWarnings: [],
          suggestedActions: ['Start New Form', 'View Schedule', 'Check Status'],
          followupQuestion: null,
          formState: null,
        },
      });
    } finally {
      send(ws, { type: 'typing', active: false });
    }
    return;
  }

  if (msg.type === 'update_profile') {
    const profile = sessionManager.updateProfile(sessionId, msg.profile || {});
    send(ws, { type: 'profile_updated', payload: profile });
    return;
  }

  if (msg.type === 'update_form_field') {
    const { formType, field, value } = msg;
    if (!formType || !field) {
      send(ws, { type: 'error', message: 'formType and field are required for manual updates.' });
      return;
    }

    sessionManager.updateForm(sessionId, formType, { [field]: value }, {});
    const updatedSession = sessionManager.get(sessionId);
    send(ws, {
      type: 'form_updated',
      payload: buildFormState(updatedSession, formType),
    });
    return;
  }

  if (msg.type === 'request_form_review') {
    const targetForm = msg.formType || session.currentForm;
    if (!targetForm) {
      send(ws, { type: 'error', message: 'No active form available for review.' });
      return;
    }

    const updatedSession = sessionManager.get(sessionId);
    const formState = buildFormState(updatedSession, targetForm);

    send(ws, {
      type: 'form_review',
      payload: {
        formType: targetForm,
        profile: updatedSession.profile,
        formData: formState?.fields || {},
        confidence: formState?.confidence || {},
        validation: formState?.validation,
      },
    });
    return;
  }

  if (msg.type === 'set_current_form') {
    sessionManager.setCurrentForm(sessionId, msg.formType || null);
    send(ws, { type: 'current_form_set', payload: { currentForm: msg.formType || null } });
    return;
  }

  if (msg.type === 'ping') {
    send(ws, { type: 'pong', ts: Date.now() });
    return;
  }

  send(ws, { type: 'error', message: `Unknown message type: ${msg.type}` });
}
