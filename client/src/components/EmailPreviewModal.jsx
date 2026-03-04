import { useState } from 'react';
import { X, Download, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

export default function EmailPreviewModal({
  open,
  preview,
  artifacts,
  isSending,
  onClose,
  onSend,
  onToChange,
}) {
  const [confirmSend, setConfirmSend] = useState(false);

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="w-full max-h-[90vh] max-w-2xl rounded-2xl bg-[var(--surface)] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-slate-50 px-6 py-4">
          <h2 className="text-lg font-bold text-[var(--text)]">Review & Send</h2>
          <button
            onClick={onClose}
            disabled={isSending}
            className="rounded-lg p-1 hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* To Address */}
          <div>
            <label className="block text-sm font-semibold text-[var(--text)] mb-2">
              Send to
            </label>
            <input
              type="email"
              value={preview?.to || ''}
              onChange={(e) => onToChange?.(e.target.value)}
              disabled={isSending}
              className="w-full rounded-lg border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--text)] focus:border-[var(--primary-light)] focus:outline-none transition-colors disabled:opacity-50"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-semibold text-[var(--text)] mb-2">
              Subject
            </label>
            <div className="rounded-lg border border-[var(--border)] bg-slate-50 px-4 py-2.5">
              <p className="text-sm text-[var(--text)]">{preview?.subject || 'No subject'}</p>
            </div>
          </div>

          {/* Email Body Preview */}
          <div>
            <label className="block text-sm font-semibold text-[var(--text)] mb-2">
              Message
            </label>
            <div className="rounded-lg border border-[var(--border)] bg-slate-50 p-4 max-h-64 overflow-y-auto">
              {preview?.htmlBody ? (
                <div
                  className="text-sm text-[var(--text)] prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: preview.htmlBody }}
                />
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">No message body</p>
              )}
            </div>
          </div>

          {/* Attachments */}
          {artifacts && (
            <div>
              <label className="block text-sm font-semibold text-[var(--text)] mb-2">
                Attachments
              </label>
              <div className="space-y-2">
                {artifacts.pdf && (
                  <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-slate-50 p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-red-100">
                        <span className="text-xs font-bold text-red-600">PDF</span>
                      </div>
                      <span className="text-sm text-[var(--text)]">{artifacts.pdfName || 'report.pdf'}</span>
                    </div>
                    <a
                      href={artifacts.pdf}
                      download
                      className="flex items-center gap-1 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--primary-light)] transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </a>
                  </div>
                )}

                {artifacts.xml && (
                  <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-slate-50 p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-100">
                        <span className="text-xs font-bold text-blue-600">XML</span>
                      </div>
                      <span className="text-sm text-[var(--text)]">{artifacts.xmlName || 'data.xml'}</span>
                    </div>
                    <a
                      href={artifacts.xml}
                      download
                      className="flex items-center gap-1 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--primary-light)] transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border)] bg-slate-50 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            disabled={isSending}
            className="flex-1 rounded-lg border border-[var(--border)] px-4 py-2.5 font-semibold text-[var(--text)] hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          {!confirmSend ? (
            <button
              onClick={() => setConfirmSend(true)}
              disabled={isSending || !preview?.to}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 font-semibold text-white hover:bg-red-600 disabled:bg-slate-300 transition-colors"
            >
              <Mail className="h-4 w-4" />
              Send Email
            </button>
          ) : (
            <button
              onClick={onSend}
              disabled={isSending}
              className="flex-1 rounded-lg bg-[var(--accent)] px-4 py-2.5 font-semibold text-white hover:bg-red-600 disabled:bg-slate-300 transition-colors"
            >
              {isSending ? 'Sending...' : 'Confirm Send'}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
