import { useEffect, useMemo, useState } from 'react';

const SESSION_KEY = 'medicos_session_id';
const SESSION_HISTORY_KEY = 'medicos_session_history';
const REMEMBER_SESSIONS_KEY = 'medicos_remember_sessions';
const PROFILE_KEY = 'medicos_profile';
const TTS_KEY = 'medicos_tts_enabled';

function randomId() {
  return `sess-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function safeParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((item) => item && item.id)
    .map((item) => ({
      id: item.id,
      createdAt: item.createdAt || new Date().toISOString(),
      lastUsedAt: item.lastUsedAt || item.createdAt || new Date().toISOString(),
      label: item.label || `Conversation ${item.id.slice(-4)}`,
    }));
}

function upsertHistory(history, sessionId) {
  const now = new Date().toISOString();
  const existing = history.find((item) => item.id === sessionId);
  if (existing) {
    return history.map((item) =>
      item.id === sessionId
        ? {
            ...item,
            lastUsedAt: now,
          }
        : item,
    );
  }

  return [
    {
      id: sessionId,
      createdAt: now,
      lastUsedAt: now,
      label: `Conversation ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    },
    ...history,
  ];
}

export function useSession() {
  const [rememberConversations, setRememberConversations] = useState(() => {
    const raw = localStorage.getItem(REMEMBER_SESSIONS_KEY);
    return raw === null ? true : raw === 'true';
  });

  const [sessionHistory, setSessionHistory] = useState(() => {
    const raw = localStorage.getItem(SESSION_HISTORY_KEY);
    return normalizeHistory(safeParse(raw, []));
  });

  const [sessionId, setSessionId] = useState(() => {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    return randomId();
  });

  const [profile, setProfile] = useState(() => {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return safeParse(raw, null);
  });

  const [ttsEnabled, setTtsEnabled] = useState(() => {
    const raw = localStorage.getItem(TTS_KEY);
    return raw === null ? true : raw === 'true';
  });

  useEffect(() => {
    setSessionHistory((prev) => upsertHistory(prev, sessionId));
  }, [sessionId]);

  useEffect(() => {
    localStorage.setItem(TTS_KEY, String(ttsEnabled));
  }, [ttsEnabled]);

  useEffect(() => {
    localStorage.setItem(REMEMBER_SESSIONS_KEY, String(rememberConversations));
  }, [rememberConversations]);

  useEffect(() => {
    if (profile) {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    }
  }, [profile]);

  useEffect(() => {
    if (!rememberConversations) {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_HISTORY_KEY);
      return;
    }

    localStorage.setItem(SESSION_KEY, sessionId);
    localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(sessionHistory));
  }, [rememberConversations, sessionHistory, sessionId]);

  const startNewConversation = () => {
    const newId = randomId();
    setSessionId(newId);
    if (rememberConversations) {
      localStorage.setItem(SESSION_KEY, newId);
    }
  };

  const switchConversation = (nextId) => {
    if (!nextId || nextId === sessionId) return;
    setSessionId(nextId);
  };

  const clearConversationMemory = () => {
    setSessionHistory([]);
    localStorage.removeItem(SESSION_HISTORY_KEY);
  };

  const value = useMemo(
    () => ({
      sessionId,
      setSessionId,
      sessionHistory,
      startNewConversation,
      switchConversation,
      clearConversationMemory,
      rememberConversations,
      setRememberConversations,
      profile,
      setProfile,
      ttsEnabled,
      setTtsEnabled,
    }),
    [profile, rememberConversations, sessionHistory, sessionId, ttsEnabled],
  );

  return value;
}
