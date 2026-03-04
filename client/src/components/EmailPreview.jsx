import { AnimatePresence, motion } from 'framer-motion';
import { API_BASE } from '../utils/constants';

export default function EmailPreview({
  open,
  preview,
  artifacts,
  isSending,
  onClose,
  onSend,
  onToChange,
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 18 }}
            className="w-full max-w-3xl rounded-2xl border border-[var(--border)] bg-white p-5 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[var(--text)]">Email Preview</h3>
              {preview?.demoMode ? (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Simulated</span>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3">
              <label className="text-sm text-[var(--text-secondary)]">
                To
                <input
                  value={preview?.to || ''}
                  onChange={(event) => onToChange?.(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                />
              </label>

              <label className="text-sm text-[var(--text-secondary)]">
                Subject
                <input value={preview?.subject || ''} readOnly className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm bg-slate-50" />
              </label>

              <div>
                <p className="text-sm text-[var(--text-secondary)]">Body</p>
                <div className="mt-1 max-h-56 overflow-auto rounded-lg border border-[var(--border)] bg-slate-50 p-3 text-sm">
                  <div dangerouslySetInnerHTML={{ __html: preview?.htmlBody || '' }} />
                </div>
              </div>

              <div>
                <p className="text-sm text-[var(--text-secondary)]">Attachments</p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(preview?.attachments || []).map((item) => (
                    <div key={item.name} className="rounded-lg border border-[var(--border)] bg-white p-3 text-sm">
                      <div className="font-semibold text-[var(--text)]">{item.name}</div>
                      <div className="text-xs text-[var(--text-secondary)]">{item.type}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex gap-4 text-xs">
                  {artifacts?.pdfUrl ? (
                    <a href={`${API_BASE}${artifacts.pdfUrl}`} target="_blank" rel="noreferrer" className="text-[var(--primary)] underline">
                      View PDF
                    </a>
                  ) : null}
                  {artifacts?.xmlUrl ? (
                    <a href={`${API_BASE}${artifacts.xmlUrl}`} target="_blank" rel="noreferrer" className="text-[var(--primary)] underline">
                      View XML
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text)]"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSending}
                className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
                onClick={onSend}
              >
                {isSending ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
