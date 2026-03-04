import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Volume2 } from 'lucide-react';
import { VOICE_STATE } from '../utils/constants';

const BAR_COUNT = 28;

const STATE_META = {
  [VOICE_STATE.IDLE]: { label: 'Tap to talk', color: 'bg-[var(--primary)]' },
  [VOICE_STATE.LISTENING]: { label: 'Listening...', color: 'bg-red-600' },
  [VOICE_STATE.PROCESSING]: { label: 'Thinking...', color: 'bg-indigo-600' },
  [VOICE_STATE.SPEAKING]: { label: 'Speaking...', color: 'bg-green-600' },
};

export default function VoiceButton({ voiceState, isSupported, onStartListening, onStopListening, onStopSpeaking }) {
  const [bars, setBars] = useState(Array.from({ length: BAR_COUNT }, () => 10));
  const intervalRef = useRef(null);

  const meta = useMemo(() => STATE_META[voiceState] || STATE_META[VOICE_STATE.IDLE], [voiceState]);

  useEffect(() => {
    function cleanupVisualizer() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setBars(Array.from({ length: BAR_COUNT }, () => 10));
    }

    if (voiceState === VOICE_STATE.LISTENING) {
      intervalRef.current = setInterval(() => {
        setBars(Array.from({ length: BAR_COUNT }, () => 8 + Math.round(Math.random() * 22)));
      }, 90);
    } else {
      cleanupVisualizer();
    }

    return () => {
      cleanupVisualizer();
    };
  }, [voiceState]);

  const onTap = () => {
    if (!isSupported) return;

    if (voiceState === VOICE_STATE.LISTENING) {
      onStopListening?.();
      return;
    }

    if (voiceState === VOICE_STATE.SPEAKING) {
      onStopSpeaking?.();
      return;
    }

    if (voiceState === VOICE_STATE.IDLE) {
      onStartListening?.();
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 py-3">
      <div className="relative h-40 w-40 flex items-center justify-center">
        {voiceState === VOICE_STATE.LISTENING ? (
          <span className="absolute h-24 w-24 rounded-full border-2 border-red-300 animate-sonar" />
        ) : null}

        <AnimatePresence>
          {voiceState === VOICE_STATE.LISTENING && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {bars.map((height, idx) => {
                const angle = (idx / BAR_COUNT) * 360;
                return (
                  <div
                    // eslint-disable-next-line react/no-array-index-key
                    key={idx}
                    className="absolute w-[3px] rounded-full bg-red-400/80"
                    style={{
                      height,
                      transform: `rotate(${angle}deg) translateY(-64px)`,
                      transformOrigin: 'center 64px',
                    }}
                  />
                );
              })}
            </div>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          animate={{ scale: voiceState === VOICE_STATE.IDLE ? [1, 1.02, 1] : 1 }}
          transition={{ duration: 3, repeat: Infinity }}
          onClick={onTap}
          disabled={!isSupported || voiceState === VOICE_STATE.PROCESSING}
          className={`h-[72px] w-[72px] rounded-full text-white shadow-lg flex items-center justify-center ${meta.color} disabled:opacity-50`}
        >
          {voiceState === VOICE_STATE.PROCESSING ? (
            <div className="inline-flex items-center gap-1">
              {[0, 1, 2].map((n) => (
                <span
                  key={n}
                  className="h-2 w-2 rounded-full bg-white animate-dotBounce"
                  style={{ animationDelay: `${n * 0.15}s` }}
                />
              ))}
            </div>
          ) : null}

          {voiceState === VOICE_STATE.SPEAKING ? <Volume2 size={30} /> : null}
          {(voiceState === VOICE_STATE.IDLE || voiceState === VOICE_STATE.LISTENING) && <Mic size={30} />}
        </motion.button>
      </div>

      <div className="text-sm font-semibold text-[var(--text-secondary)]">{isSupported ? meta.label : 'Voice not supported'}</div>
    </div>
  );
}
