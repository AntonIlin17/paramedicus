import { API_BASE } from './constants';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data?.error || 'Request failed';
    const err = new Error(message);
    err.payload = data;
    throw err;
  }
  return data;
}

export function fetchHealth() {
  return request('/api/health');
}

export function chatTurn(payload) {
  return request('/api/chat/turn', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getForm(sessionId, formType) {
  return request(`/api/forms/${formType}?sessionId=${encodeURIComponent(sessionId)}`);
}

export function updateFormField(sessionId, formType, field, value) {
  return request(`/api/forms/${formType}/field`, {
    method: 'POST',
    body: JSON.stringify({ sessionId, field, value }),
  });
}

export function reviewForm(sessionId, formType) {
  return request(`/api/forms/${formType}/review`, {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  });
}

export function emailPreview(payload) {
  return request('/api/email/preview', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function sendEmail(payload) {
  return request('/api/email/send', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getSchedule() {
  return request('/api/schedule');
}

export function getStatus(medicNumber) {
  const query = medicNumber ? `?medicNumber=${encodeURIComponent(medicNumber)}` : '';
  return request(`/api/status${query}`);
}
