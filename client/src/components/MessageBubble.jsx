import { motion } from 'framer-motion';

function SourceTag({ source }) {
  if (!source) return null;
  return (
    <div className="mt-1 text-[11px] text-slate-500">
      {source === 'voice' ? '🎙 voice' : '⌨ typed'}
    </div>
  );
}

function FieldPills({ updates }) {
  if (!updates || Object.keys(updates).length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {Object.entries(updates)
        .slice(0, 8)
        .map(([field, value]) => (
          <span key={field} className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 border border-emerald-200">
            {field}: {String(value)}
          </span>
        ))}
    </div>
  );
}

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[86%] rounded-2xl px-4 py-3 shadow-sm ${
          isUser ? 'bg-[var(--primary)] text-white' : 'bg-white text-[var(--text)] border border-[var(--border)]'
        }`}
      >
        <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</div>
        {!isUser && <FieldPills updates={message.formUpdates} />}
        <SourceTag source={message.source} />
      </div>
    </motion.div>
  );
}
