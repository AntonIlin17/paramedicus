import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.resolve(__dirname, '../data/drafts.json');

function nowISO() {
  return new Date().toISOString();
}

function normalizeDateTimeLocal(value) {
  if (value === undefined || value === null || value === '') return value;
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) {
    return raw;
  }
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return value;
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

function normalizeFieldValue(formType, field, value) {
  if (formType === 'teddybear' && field === 'date_time') {
    return normalizeDateTimeLocal(value);
  }
  return value;
}

function createEmptySession(id) {
  return {
    id,
    createdAt: nowISO(),
    profile: {
      firstName: '',
      lastName: '',
      medicNumber: '',
      badgeNumber: '',
      role: '',
      service: '',
      vehicleNumber: '',
    },
    messages: [],
    activeForms: {},
    currentForm: null,
    formHistory: [],
    artifacts: [],
  };
}

class SessionManager {
  constructor() {
    this.sessions = new Map();
  }

  has(id) {
    return this.sessions.has(id);
  }

  create(id) {
    if (!this.sessions.has(id)) {
      this.sessions.set(id, createEmptySession(id));
      this.persist();
    }
    return this.sessions.get(id);
  }

  get(id) {
    return this.sessions.get(id) || null;
  }

  updateProfile(id, partialProfile = {}) {
    const session = this.get(id) || this.create(id);
    session.profile = {
      ...session.profile,
      ...partialProfile,
    };
    this.persist();
    return session.profile;
  }

  addMessage(id, role, content, metadata = {}) {
    const session = this.get(id) || this.create(id);
    const msg = {
      role,
      content,
      timestamp: nowISO(),
      ...metadata,
    };

    if (session.messages.length >= 40) {
      const hasSystem = session.messages[0]?.role === 'system';
      if (hasSystem) {
        session.messages.splice(1, session.messages.length - 39);
      } else {
        session.messages.shift();
      }
    }

    session.messages.push(msg);
    this.persist();
    return msg;
  }

  updateForm(id, formType, fieldUpdates = {}, confidenceUpdates = {}) {
    const session = this.get(id) || this.create(id);
    const normalizedFieldUpdates = Object.fromEntries(
      Object.entries(fieldUpdates).map(([field, value]) => [field, normalizeFieldValue(formType, field, value)]),
    );
    const existing = session.activeForms[formType] || {
      fields: {},
      confidence: {},
      status: 'draft',
      updatedAt: nowISO(),
    };

    session.activeForms[formType] = {
      ...existing,
      fields: {
        ...(existing.fields || {}),
        ...normalizedFieldUpdates,
      },
      confidence: {
        ...(existing.confidence || {}),
        ...confidenceUpdates,
      },
      status: existing.status || 'draft',
      updatedAt: nowISO(),
    };

    session.currentForm = formType;
    this.persist();
    return session.activeForms[formType];
  }

  getForm(id, formType) {
    const session = this.get(id);
    if (!session) return null;
    const form = session.activeForms[formType] || { fields: {}, confidence: {}, status: 'draft' };
    return {
      fields: form.fields || {},
      confidence: form.confidence || {},
      status: form.status || 'draft',
    };
  }

  completeForm(id, formType) {
    const session = this.get(id) || this.create(id);
    const form = session.activeForms[formType];
    if (!form) {
      return null;
    }

    const completed = {
      id: `${formType}-${Date.now()}`,
      formType,
      completedAt: nowISO(),
      ...form,
      status: 'completed',
    };

    session.formHistory.push(completed);
    delete session.activeForms[formType];
    if (session.currentForm === formType) {
      session.currentForm = null;
    }

    this.persist();
    return completed;
  }

  setCurrentForm(id, formType) {
    const session = this.get(id) || this.create(id);
    session.currentForm = formType;
    this.persist();
    return session.currentForm;
  }

  addArtifact(id, artifact) {
    const session = this.get(id) || this.create(id);
    const normalized = {
      id: artifact.id || `artifact-${Date.now()}`,
      draftId: artifact.draftId || null,
      type: artifact.type,
      path: artifact.path,
      createdAt: artifact.createdAt || nowISO(),
      formType: artifact.formType || null,
      fileName: artifact.fileName || null,
    };
    session.artifacts.push(normalized);
    this.persist();
    return normalized;
  }

  serialize() {
    return {
      updatedAt: nowISO(),
      sessions: Array.from(this.sessions.values()),
    };
  }

  persist() {
    try {
      fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
      fs.writeFileSync(DATA_PATH, JSON.stringify(this.serialize(), null, 2), 'utf-8');
    } catch (err) {
      console.error('[session] Failed to persist sessions:', err.message);
    }
  }

  restore() {
    try {
      if (!fs.existsSync(DATA_PATH)) {
        return;
      }
      const raw = fs.readFileSync(DATA_PATH, 'utf-8');
      if (!raw.trim()) {
        return;
      }
      const parsed = JSON.parse(raw);
      const loadedSessions = Array.isArray(parsed) ? parsed : parsed.sessions;
      if (!Array.isArray(loadedSessions)) {
        return;
      }
      for (const session of loadedSessions) {
        if (session?.id) {
          this.sessions.set(session.id, {
            ...createEmptySession(session.id),
            ...session,
            profile: {
              ...createEmptySession(session.id).profile,
              ...(session.profile || {}),
            },
            messages: Array.isArray(session.messages) ? session.messages : [],
            activeForms: session.activeForms || {},
            formHistory: Array.isArray(session.formHistory) ? session.formHistory : [],
            artifacts: Array.isArray(session.artifacts) ? session.artifacts : [],
          });
        }
      }
      console.log(`[session] Restored ${this.sessions.size} sessions from disk`);
    } catch (err) {
      console.error('[session] Failed to restore sessions:', err.message);
    }
  }
}

export const sessionManager = new SessionManager();
