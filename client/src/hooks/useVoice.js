import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE } from '../utils/constants';

const VOICE_URI_KEY = 'medicos_tts_voice_uri';
const LISTENING_SILENCE_TIMEOUT_MS = 1400;
const LISTENING_MAX_DURATION_MS = 14000;
const PREMIUM_TTS_MAX_FAILURES = 2;

function pickPreferredVoice(voices = [], selectedVoiceURI = '') {
  if (!voices.length) return null;

  if (selectedVoiceURI) {
    const selected = voices.find((voice) => voice.voiceURI === selectedVoiceURI);
    if (selected) return selected;
  }

  const scoreVoice = (voice) => {
    const name = String(voice.name || '');
    const lang = String(voice.lang || '');
    let score = 0;

    if (/en/i.test(lang)) score += 35;
    if (/en-CA|en-US|en-GB/i.test(lang)) score += 20;
    if (voice.default) score += 10;

    if (/natural|neural|premium|enhanced|wavenet|online/i.test(name)) score += 55;
    if (/female|aria|jenny|samantha|zira|ava|serena|siri|alloy|sofia|natasha|olivia|emma|karen/i.test(name))
      score += 60;
    if (/google uk english female|microsoft aria|microsoft zira|samantha/i.test(name)) score += 45;
    if (/google/i.test(name)) score += 25;

    if (/male|david|mark|james|alex|guy|man/i.test(name)) score -= 50;
    if (/local service|legacy/i.test(name)) score -= 20;

    if (/compact|espeak|robot/i.test(name)) score -= 25;

    return score;
  };

  return [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] || null;
}

function base64ToBlob(base64, mimeType = 'audio/mpeg') {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export function useVoice({ onTranscript, onInterimTranscript }) {
  const recognitionRef = useRef(null);
  const handlersRef = useRef({ onTranscript, onInterimTranscript });
  const preferredVoiceRef = useRef(null);
  const voicesRef = useRef([]);
  const currentAudioRef = useRef(null);
  const currentAudioUrlRef = useRef(null);
  const isRecognitionActiveRef = useRef(false);
  const isManualStopRef = useRef(false);
  const silenceTimerRef = useRef(null);
  const maxDurationTimerRef = useRef(null);
  const premiumFailureCountRef = useRef(0);

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [voiceOptions, setVoiceOptions] = useState([]);
  const [voicesReady, setVoicesReady] = useState(false);
  const [premiumTTS, setPremiumTTS] = useState(null);
  const [selectedVoiceURI, setSelectedVoiceURIState] = useState(() => localStorage.getItem(VOICE_URI_KEY) || '');

  useEffect(() => {
    handlersRef.current = { onTranscript, onInterimTranscript };
  }, [onTranscript, onInterimTranscript]);

  useEffect(() => {
    let mounted = true;

    async function loadHealth() {
      try {
        const response = await fetch(`${API_BASE}/api/health`);
        const data = await response.json();
        if (mounted) {
          setPremiumTTS(data?.features?.premiumTTS === true ? true : false);
        }
      } catch {
        // Keep unknown state so we can still try premium endpoint directly.
      }
    }

    loadHealth();

    return () => {
      mounted = false;
    };
  }, []);

  const setSelectedVoiceURI = useCallback((voiceURI) => {
    setSelectedVoiceURIState(voiceURI || '');
    if (voiceURI) {
      localStorage.setItem(VOICE_URI_KEY, voiceURI);
    } else {
      localStorage.removeItem(VOICE_URI_KEY);
    }

    if (voicesRef.current.length > 0) {
      preferredVoiceRef.current = pickPreferredVoice(voicesRef.current, voiceURI || '');
    }
  }, []);

  useEffect(() => {
    if (!window.speechSynthesis) return;

    let intervalId = null;
    let tries = 0;

    const refreshVoices = () => {
      const voices = window.speechSynthesis.getVoices() || [];
      const englishVoices = voices.filter((voice) => /en/i.test(voice.lang || ''));
      const activeVoices = englishVoices.length > 0 ? englishVoices : voices;

      voicesRef.current = activeVoices;
      setVoiceOptions(
        activeVoices.map((voice) => ({
          voiceURI: voice.voiceURI,
          name: voice.name,
          lang: voice.lang,
        })),
      );

      if (activeVoices.length > 0) {
        const preferred = pickPreferredVoice(activeVoices, selectedVoiceURI);
        const selectedVoice = activeVoices.find((voice) => voice.voiceURI === selectedVoiceURI);
        const selectedLooksMale = /male|david|mark|james|alex|guy|man/i.test(String(selectedVoice?.name || ''));
        preferredVoiceRef.current = preferred;
        if ((!selectedVoiceURI || (selectedLooksMale && preferred?.voiceURI !== selectedVoiceURI)) && preferred?.voiceURI) {
          setSelectedVoiceURIState(preferred.voiceURI);
          localStorage.setItem(VOICE_URI_KEY, preferred.voiceURI);
        }
        setVoicesReady(true);
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    };

    refreshVoices();
    window.speechSynthesis.onvoiceschanged = refreshVoices;

    intervalId = setInterval(() => {
      tries += 1;
      refreshVoices();
      if (tries >= 30) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }, 100);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [selectedVoiceURI]);

  const clearListenTimers = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
  }, []);

  const stopListeningInternal = useCallback(
    (reason = 'manual') => {
      const recognition = recognitionRef.current;
      clearListenTimers();
      handlersRef.current.onInterimTranscript?.('');

      if (!recognition || !isRecognitionActiveRef.current) {
        setIsListening(false);
        return;
      }

      isManualStopRef.current = reason !== 'error';
      try {
        recognition.stop();
      } catch {
        isRecognitionActiveRef.current = false;
        setIsListening(false);
      }
    },
    [clearListenTimers],
  );

  const armSilenceStop = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }

    silenceTimerRef.current = setTimeout(() => {
      stopListeningInternal('silence');
    }, LISTENING_SILENCE_TIMEOUT_MS);
  }, [stopListeningInternal]);

  const armMaxDurationStop = useCallback(() => {
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
    }

    maxDurationTimerRef.current = setTimeout(() => {
      stopListeningInternal('max_duration');
    }, LISTENING_MAX_DURATION_MS);
  }, [stopListeningInternal]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      recognitionRef.current = null;
      return;
    }

    const recognition = new SpeechRecognition();
    // We stop manually after a short silence to avoid sticky sessions.
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-CA';

    recognition.onstart = () => {
      isRecognitionActiveRef.current = true;
      setIsListening(true);
      armMaxDurationStop();
      armSilenceStop();
    };

    recognition.onresult = (event) => {
      let interim = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript.trim();
        if (event.results[i].isFinal && transcript) {
          finalTranscript = `${finalTranscript} ${transcript}`.trim();
        } else if (!event.results[i].isFinal) {
          interim += `${transcript} `;
        }
      }

      handlersRef.current.onInterimTranscript?.(interim.trim());
      armSilenceStop();

      if (finalTranscript) {
        handlersRef.current.onTranscript?.(finalTranscript);
        handlersRef.current.onInterimTranscript?.('');
        setTimeout(() => {
          stopListeningInternal('final');
        }, 80);
      }
    };

    recognition.onerror = (event) => {
      isRecognitionActiveRef.current = false;
      clearListenTimers();
      handlersRef.current.onInterimTranscript?.('');
      setIsListening(false);

      if (event.error === 'aborted' && isManualStopRef.current) {
        isManualStopRef.current = false;
        return;
      }

      if (event.error !== 'aborted') {
        console.error('[voice] recognition error', event.error);
      }

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setIsSupported(false);
      }
    };

    recognition.onend = () => {
      isRecognitionActiveRef.current = false;
      isManualStopRef.current = false;
      clearListenTimers();
      setIsListening(false);
      handlersRef.current.onInterimTranscript?.('');
    };

    recognitionRef.current = recognition;
    setIsSupported(true);

    return () => {
      clearListenTimers();
      if (isRecognitionActiveRef.current) {
        try {
          recognition.abort();
        } catch {
          // no-op
        }
      }
      recognitionRef.current = null;
    };
  }, [armMaxDurationStop, armSilenceStop, clearListenTimers, stopListeningInternal]);

  const stopSpeaking = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.src = '';
      currentAudioRef.current = null;
    }
    if (currentAudioUrlRef.current) {
      URL.revokeObjectURL(currentAudioUrlRef.current);
      currentAudioUrlRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const startListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || isListening || isRecognitionActiveRef.current) return;

    stopSpeaking();
    handlersRef.current.onInterimTranscript?.('');
    isManualStopRef.current = false;

    try {
      recognition.start();
      setIsListening(true);
      armMaxDurationStop();
      armSilenceStop();
    } catch (err) {
      console.error('[voice] failed to start listening', err.message);
      setIsListening(false);
    }
  }, [armMaxDurationStop, armSilenceStop, isListening, stopSpeaking]);

  const stopListening = useCallback(() => {
    stopListeningInternal('manual');
  }, [stopListeningInternal]);

  const speakWithBrowser = useCallback(
    (text) => {
      if (!window.speechSynthesis) return;

      const utterance = new SpeechSynthesisUtterance(text);
      const voice = pickPreferredVoice(voicesRef.current, selectedVoiceURI) || preferredVoiceRef.current;
      if (voice) {
        utterance.voice = voice;
      }

      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    },
    [selectedVoiceURI],
  );

  const speak = useCallback(
    async (text) => {
      if (!text) return;

      stopSpeaking();

      const shouldTryPremium = premiumTTS !== false && premiumFailureCountRef.current < PREMIUM_TTS_MAX_FAILURES;

      if (shouldTryPremium) {
        try {
          const response = await fetch(`${API_BASE}/api/voice/tts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text,
            }),
          });

          if (!response.ok) {
            premiumFailureCountRef.current += 1;
            if (response.status >= 400 && response.status < 500) {
              setPremiumTTS(false);
            }
            throw new Error(`TTS ${response.status}`);
          }

          const payload = await response.json();
          const blob = base64ToBlob(payload.audioBase64, payload.mimeType || 'audio/mpeg');
          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);
          currentAudioRef.current = audio;
          currentAudioUrlRef.current = audioUrl;
          premiumFailureCountRef.current = 0;
          setPremiumTTS(true);

          audio.onplay = () => setIsSpeaking(true);
          audio.onended = () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
            if (currentAudioRef.current === audio) {
              currentAudioRef.current = null;
            }
            if (currentAudioUrlRef.current === audioUrl) {
              currentAudioUrlRef.current = null;
            }
          };
          audio.onerror = () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
            if (currentAudioRef.current === audio) {
              currentAudioRef.current = null;
            }
            if (currentAudioUrlRef.current === audioUrl) {
              currentAudioUrlRef.current = null;
            }
          };

          await audio.play();
          return;
        } catch (err) {
          console.warn('[voice] premium TTS failed, falling back to browser voice:', err.message);
          if (premiumFailureCountRef.current >= PREMIUM_TTS_MAX_FAILURES) {
            setPremiumTTS(false);
          }
        }
      }

      if (voicesReady || voicesRef.current.length > 0) {
        speakWithBrowser(text);
        return;
      }

      let attempts = 0;
      const timer = setInterval(() => {
        attempts += 1;
        if (voicesRef.current.length > 0 || attempts >= 18) {
          clearInterval(timer);
          speakWithBrowser(text);
        }
      }, 120);
    },
    [premiumTTS, speakWithBrowser, stopSpeaking, voicesReady],
  );

  return {
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
  };
}
