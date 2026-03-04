import { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from './components/Layout';
import ChatPanel from './components/ChatPanel';
import FormPreview from './components/FormPreview';
import EmailPreview from './components/EmailPreview';
import StatusDashboard from './components/StatusDashboard';
import ShiftView from './components/ShiftView';
import WelcomeScreen from './components/WelcomeScreen';
import { useSession } from './hooks/useSession';
import { useWebSocket } from './hooks/useWebSocket';
import { useVoice } from './hooks/useVoice';
import { emailPreview, getSchedule, getStatus, sendEmail } from './utils/api';
import { VOICE_STATE } from './utils/constants';

function id(prefix = 'msg') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function defaultMessages() {
  return [
    {
      id: id('assistant'),
      role: 'assistant',
      content:
        'I can help complete your occurrence and teddy bear forms by voice. Ask about schedule, status, or weather anytime.',
    },
  ];
}

function hydrateSessionMessages(serverMessages = []) {
  if (!Array.isArray(serverMessages) || serverMessages.length === 0) {
    return defaultMessages();
  }

  return serverMessages
    .filter((message) => message?.content)
    .map((message) => ({
      id: id(message.role === 'user' ? 'user' : 'assistant'),
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: String(message.content),
      source: message.source || (message.role === 'user' ? 'keyboard' : undefined),
    }));
}

export default function App() {
  const {
    sessionId,
    sessionHistory,
    startNewConversation,
    switchConversation,
    rememberConversations,
    setRememberConversations,
    profile,
    setProfile,
    ttsEnabled,
    setTtsEnabled,
  } = useSession();

  const [messages, setMessages] = useState(defaultMessages);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceProcessing, setVoiceProcessing] = useState(false);

  const [currentForm, setCurrentForm] = useState(null);
  const [formStates, setFormStates] = useState({});
  const [lastUpdatedFields, setLastUpdatedFields] = useState([]);
  const [suggestedActions, setSuggestedActions] = useState([]);

  const [panelMode, setPanelMode] = useState('form');
  const [scheduleData, setScheduleData] = useState(null);
  const [statusData, setStatusData] = useState(null);

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailPreviewData, setEmailPreviewData] = useState(null);
  const [emailArtifacts, setEmailArtifacts] = useState(null);
  const [emailTo, setEmailTo] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const appendMessage = useCallback((message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const loadSchedule = useCallback(async () => {
    try {
      const result = await getSchedule();
      setScheduleData(result.data);
      setPanelMode('schedule');
    } catch (err) {
      appendMessage({ id: id(), role: 'assistant', content: `I could not load schedule right now: ${err.message}` });
    }
  }, [appendMessage]);

  const loadStatus = useCallback(async () => {
    try {
      const result = await getStatus(profile?.medicNumber);
      setStatusData(result);
      setPanelMode('status');
    } catch (err) {
      appendMessage({ id: id(), role: 'assistant', content: `I could not load status right now: ${err.message}` });
    }
  }, [appendMessage, profile?.medicNumber]);

  const {
    isListening,
    isSpeaking,
    isSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    voiceOptions,
    selectedVoiceURI,
    setSelectedVoiceURI,
  } = useVoice({
    onTranscript: (text) => {
      if (!text) return;
      setInterimTranscript('');
      setVoiceProcessing(true);
      sendUserMessage(text, 'voice');
    },
    onInterimTranscript: (text) => {
      setInterimTranscript(text);
    },
  });

  const handleServerMessage = useCallback(
    async (event) => {
      if (event.type === 'session_init') {
        const session = event.payload?.session;
        if (!session) return;

        setMessages(hydrateSessionMessages(session.messages));

        const activeForms = session.activeForms || {};
        const firstActive = Object.keys(activeForms)[0] || null;

        const nextFormStates = Object.fromEntries(
          Object.entries(activeForms).map(([formType, data]) => [
            formType,
            {
              formType,
              schema: null,
              fields: data?.fields || {},
              confidence: data?.confidence || {},
              validation: null,
            },
          ]),
        );

        setFormStates(nextFormStates);
        setCurrentForm(session.currentForm || firstActive || null);

        if (session.profile?.firstName || session.profile?.medicNumber) {
          setProfile(session.profile);
        }

        return;
      }

      if (event.type === 'typing') {
        setTyping(Boolean(event.active));
        return;
      }

      if (event.type === 'assistant_message') {
        const payload = event.payload || {};

        appendMessage({
          id: id('assistant'),
          role: 'assistant',
          content: payload.text,
          formUpdates: payload.formUpdates || null,
        });

        if (payload.formType) {
          setCurrentForm(payload.formType);
          setPanelMode('form');
        }

        if (payload.formState?.formType) {
          setFormStates((prev) => ({
            ...prev,
            [payload.formState.formType]: payload.formState,
          }));
        }

        if (payload.formUpdates) {
          const updated = Object.keys(payload.formUpdates);
          setLastUpdatedFields(updated);
          setTimeout(() => setLastUpdatedFields([]), 900);
        }

        setSuggestedActions(payload.suggestedActions || []);
        setVoiceProcessing(false);

        if (payload.intent === 'shift_query') {
          loadSchedule();
        }
        if (payload.intent === 'status_query') {
          loadStatus();
        }

        if (ttsEnabled && payload.text) {
          speak(payload.text);
        }
        return;
      }

      if (event.type === 'form_updated') {
        const payload = event.payload;
        if (payload?.formType) {
          setFormStates((prev) => ({ ...prev, [payload.formType]: payload }));
        }
        return;
      }

      if (event.type === 'profile_updated') {
        setProfile(event.payload);
        return;
      }

      if (event.type === 'error') {
        setVoiceProcessing(false);
        appendMessage({ id: id('assistant'), role: 'assistant', content: event.message || 'Something went wrong.' });
      }
    },
    [appendMessage, loadSchedule, loadStatus, setProfile, speak, ttsEnabled],
  );

  const { isConnected, send } = useWebSocket({
    sessionId,
    onMessage: handleServerMessage,
  });

  const sendUserMessage = useCallback(
    (text, source = 'keyboard') => {
      const trimmed = String(text || '').trim();
      if (!trimmed) return;

      appendMessage({
        id: id('user'),
        role: 'user',
        content: trimmed,
        source,
      });

      send({
        type: 'user_message',
        text: trimmed,
        source,
      });
    },
    [appendMessage, send],
  );

  useEffect(() => {
    if (isConnected && profile) {
      send({
        type: 'update_profile',
        profile,
      });
    }
  }, [isConnected, profile, send]);

  useEffect(() => {
    setTyping(false);
    setInterimTranscript('');
    setVoiceProcessing(false);
    setCurrentForm(null);
    setFormStates({});
    setLastUpdatedFields([]);
    setSuggestedActions([]);
    setPanelMode('form');
    setScheduleData(null);
    setStatusData(null);
    setEmailModalOpen(false);
    setEmailPreviewData(null);
    setEmailArtifacts(null);
    setEmailTo('');
    setMessages(defaultMessages());
  }, [sessionId]);

  useEffect(() => {
    if (!voiceProcessing) return undefined;

    const timer = setTimeout(() => {
      setVoiceProcessing(false);
    }, 12000);

    return () => clearTimeout(timer);
  }, [voiceProcessing]);

  const voiceState = useMemo(() => {
    if (isListening) return VOICE_STATE.LISTENING;
    if (voiceProcessing || typing) return VOICE_STATE.PROCESSING;
    if (isSpeaking) return VOICE_STATE.SPEAKING;
    return VOICE_STATE.IDLE;
  }, [isListening, isSpeaking, typing, voiceProcessing]);

  const handleStartShift = (nextProfile) => {
    setProfile(nextProfile);
    send({ type: 'update_profile', profile: nextProfile });
    appendMessage({
      id: id('assistant'),
      role: 'assistant',
      content: `Welcome ${nextProfile.firstName}. Start talking whenever you are ready.`,
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!input.trim()) return;
    sendUserMessage(input, 'keyboard');
    setInput('');
  };

  const handleSuggestedAction = async (action) => {
    if (action === 'Review Form' || action === 'Send Report') {
      await handleReviewSend();
      return;
    }
    if (action === 'Check Status') {
      await loadStatus();
      return;
    }
    if (action === 'View Schedule') {
      await loadSchedule();
      return;
    }
    if (action === 'Start New Form') {
      setCurrentForm(null);
      setPanelMode('form');
      send({ type: 'set_current_form', formType: null });
    }
  };

  const handleFieldChange = (formType, field, value) => {
    setFormStates((prev) => ({
      ...prev,
      [formType]: {
        ...prev[formType],
        fields: {
          ...(prev[formType]?.fields || {}),
          [field]: value,
        },
      },
    }));

    send({
      type: 'update_form_field',
      formType,
      field,
      value,
    });
  };

  const handleReviewSend = useCallback(async () => {
    if (!currentForm) {
      appendMessage({ id: id('assistant'), role: 'assistant', content: 'There is no active form to review yet.' });
      return;
    }

    try {
      const previewResult = await emailPreview({
        sessionId,
        formType: currentForm,
        to: emailTo || undefined,
      });

      setEmailPreviewData(previewResult.preview);
      setEmailArtifacts(previewResult.artifacts);
      setEmailTo(previewResult.preview.to || '');
      setEmailModalOpen(true);

      if (previewResult.warning) {
        appendMessage({
          id: id('assistant'),
          role: 'assistant',
          content: previewResult.warning,
        });
      }
    } catch (err) {
      const issues = err.payload?.validation?.errors || [];
      const text = issues.length
        ? `Form needs required fields before send: ${issues.map((x) => x.field).join(', ')}`
        : `Could not build email preview: ${err.message}`;
      appendMessage({ id: id('assistant'), role: 'assistant', content: text });
    }
  }, [appendMessage, currentForm, emailTo, sessionId]);

  const handleSendEmail = useCallback(async () => {
    if (!currentForm) return;
    setIsSendingEmail(true);
    try {
      const result = await sendEmail({
        sessionId,
        formType: currentForm,
        to: emailTo || emailPreviewData?.to,
      });
      setEmailModalOpen(false);
      appendMessage({
        id: id('assistant'),
        role: 'assistant',
        content: result.sendResult?.simulated
          ? 'Email simulated successfully in demo mode. Form archived.'
          : 'Email sent successfully and form archived.',
      });
      setCurrentForm(null);
      setPanelMode('form');
      setFormStates((prev) => {
        const next = { ...prev };
        delete next[currentForm];
        return next;
      });
    } catch (err) {
      appendMessage({ id: id('assistant'), role: 'assistant', content: `Send failed: ${err.message}` });
    } finally {
      setIsSendingEmail(false);
    }
  }, [appendMessage, currentForm, emailPreviewData?.to, emailTo, sessionId]);

  const handleNewConversation = () => {
    stopListening();
    stopSpeaking();
    startNewConversation();
  };

  const handleToggleRemember = (checked) => {
    setRememberConversations(checked);
    if (!checked) {
      handleNewConversation();
    }
  };

  if (!profile) {
    return <WelcomeScreen onStart={handleStartShift} />;
  }

  const rightPanel =
    panelMode === 'schedule' ? (
      <ShiftView data={scheduleData} />
    ) : panelMode === 'status' ? (
      <StatusDashboard data={statusData} />
    ) : (
      <FormPreview
        formType={currentForm}
        formState={currentForm ? formStates[currentForm] : null}
        onFieldChange={handleFieldChange}
        onReviewSend={handleReviewSend}
        lastUpdatedFields={lastUpdatedFields}
      />
    );

  return (
    <>
      <Layout
        profile={profile}
        ttsEnabled={ttsEnabled}
        onToggleTts={() => {
          if (ttsEnabled) {
            stopSpeaking();
          }
          setTtsEnabled((prev) => !prev);
        }}
        sessionId={sessionId}
        sessionHistory={sessionHistory}
        onSwitchConversation={switchConversation}
        onNewConversation={handleNewConversation}
        rememberConversations={rememberConversations}
        onToggleRemember={handleToggleRemember}
        voiceOptions={voiceOptions}
        selectedVoiceURI={selectedVoiceURI}
        onSelectVoice={setSelectedVoiceURI}
        left={
          <ChatPanel
            messages={messages}
            typing={typing}
            interimTranscript={interimTranscript}
            input={input}
            onInputChange={setInput}
            onSubmit={handleSubmit}
            voiceState={voiceState}
            isVoiceSupported={isSupported}
            onStartListening={startListening}
            onStopListening={stopListening}
            onStopSpeaking={stopSpeaking}
            suggestedActions={suggestedActions}
            onSuggestedAction={handleSuggestedAction}
            isConnected={isConnected}
          />
        }
        right={rightPanel}
      />

      <EmailPreview
        open={emailModalOpen}
        preview={{ ...emailPreviewData, to: emailTo || emailPreviewData?.to || '' }}
        artifacts={emailArtifacts}
        isSending={isSendingEmail}
        onClose={() => setEmailModalOpen(false)}
        onSend={handleSendEmail}
        onToChange={setEmailTo}
      />
    </>
  );
}
