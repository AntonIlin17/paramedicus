import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import VoiceButton from './VoiceButton';
import LoadingDots from './LoadingDots';

export default function ChatPanel({
  messages,
  typing,
  interimTranscript,
  input,
  onInputChange,
  onSubmit,
  voiceState,
  isVoiceSupported,
  onStartListening,
  onStopListening,
  onStopSpeaking,
  suggestedActions,
  onSuggestedAction,
  isConnected,
}) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing, interimTranscript]);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white shadow-sm">
      {!isConnected && (
        <div className="flex items-center gap-2 rounded-t-2xl bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-700">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          Connecting to server… responses will appear once connected.
        </div>
      )}
      <div ref={scrollRef} className="h-[62vh] overflow-auto border-b border-[var(--border)] px-4 py-4 space-y-3">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {typing ? (
          <div className="flex justify-start">
            <div className="rounded-xl border border-[var(--border)] bg-white px-3 py-2">
              <LoadingDots />
            </div>
          </div>
        ) : null}
        {interimTranscript ? (
          <div className="text-sm text-[var(--text-secondary)] italic">Listening: {interimTranscript}</div>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="p-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder="Type or use voice..."
            className="w-full rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm"
          />
          <button type="submit" className="rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--primary-light)]">
            Send
          </button>
        </div>

        <VoiceButton
          voiceState={voiceState}
          isSupported={isVoiceSupported}
          onStartListening={onStartListening}
          onStopListening={onStopListening}
          onStopSpeaking={onStopSpeaking}
        />

        {suggestedActions?.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestedActions.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => onSuggestedAction?.(action)}
                className="rounded-full border border-[var(--border)] bg-slate-50 px-3 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:bg-slate-100"
              >
                {action}
              </button>
            ))}
          </div>
        ) : null}
      </form>
    </div>
  );
}
