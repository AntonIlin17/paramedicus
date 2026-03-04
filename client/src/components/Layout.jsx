import { Volume2, VolumeX } from 'lucide-react';

export default function Layout({
  profile,
  ttsEnabled,
  onToggleTts,
  sessionId,
  sessionHistory,
  onSwitchConversation,
  onNewConversation,
  rememberConversations,
  onToggleRemember,
  voiceOptions,
  selectedVoiceURI,
  onSelectVoice,
  left,
  right,
}) {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-lg font-bold text-[var(--primary)]">MedicOS</div>
            <div className="text-xs text-[var(--text-secondary)]">Talk. Auto-fill. Review. Send.</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sessionId}
              onChange={(event) => onSwitchConversation?.(event.target.value)}
              className="rounded-lg border border-[var(--border)] bg-white px-2 py-1.5 text-xs text-[var(--text)]"
              title="Switch conversation"
            >
              {(sessionHistory || []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={onNewConversation}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] hover:bg-slate-50"
            >
              New Chat
            </button>

            <label className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={rememberConversations}
                onChange={(event) => onToggleRemember?.(event.target.checked)}
              />
              Remember
            </label>

            <select
              value={selectedVoiceURI}
              onChange={(event) => onSelectVoice?.(event.target.value)}
              className="max-w-[220px] rounded-lg border border-[var(--border)] bg-white px-2 py-1.5 text-xs text-[var(--text)]"
              title="Speech voice"
            >
              <option value="">Auto voice</option>
              {(voiceOptions || []).map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={onToggleTts}
              className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] hover:bg-slate-50"
              title="Toggle speech"
            >
              {ttsEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            <div className="text-right text-sm">
              <div className="font-semibold text-[var(--text)]">
                {profile?.firstName} {profile?.lastName}
              </div>
              <div className="font-mono text-xs text-[var(--text-secondary)]">Medic {profile?.medicNumber}</div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1400px] gap-4 px-4 py-4 lg:grid-cols-[1.5fr_1fr]">
        <section>{left}</section>
        <section>{right}</section>
      </main>
    </div>
  );
}
