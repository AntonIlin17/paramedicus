import { useMemo } from 'react';
import FormField from './FormField';
import { FORM_LABELS } from '../utils/constants';

export default function FormPreview({ formType, formState, onFieldChange, onReviewSend, lastUpdatedFields = [] }) {
  if (!formType || !formState?.schema) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white/70 p-6 text-center text-sm text-[var(--text-secondary)]">
        Start talking to auto-detect and fill a form. You can also type messages in chat.
      </div>
    );
  }

  const { schema, fields = {}, confidence = {}, validation } = formState;
  const requiredTotal = validation?.completion?.requiredTotal || 0;
  const requiredFilled = validation?.completion?.requiredFilled || 0;
  const completionPct = requiredTotal === 0 ? 0 : Math.round((requiredFilled / requiredTotal) * 100);

  const sections = useMemo(() => {
    const map = {};
    for (const section of schema.sections || []) {
      map[section] = [];
    }

    for (const [fieldKey, def] of Object.entries(schema.fields || {})) {
      if (!map[def.section]) {
        map[def.section] = [];
      }
      map[def.section].push({ fieldKey, def });
    }

    return map;
  }, [schema]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white border border-[var(--border)] p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--text)]">{FORM_LABELS[formType] || schema.displayName}</h2>
            <p className="text-sm text-[var(--text-secondary)]">{schema.description}</p>
          </div>
          <div className="text-right">
            <div className="font-mono text-sm text-[var(--text-secondary)]">
              {requiredFilled}/{requiredTotal} required
            </div>
            <div className="text-sm font-semibold text-[var(--text)]">{completionPct}%</div>
          </div>
        </div>

        <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
          <div className="h-2 rounded-full bg-[var(--primary)] transition-all" style={{ width: `${completionPct}%` }} />
        </div>

        {(validation?.errors?.length || validation?.warnings?.length) > 0 ? (
          <div className="mt-3 space-y-1 text-xs">
            {validation.errors.map((item) => (
              <div key={`err-${item.field}`} className="text-red-700">
                {item.message}
              </div>
            ))}
            {validation.warnings.map((item, idx) => (
              <div key={`warn-${item.field}-${idx}`} className="text-amber-700">
                {item.message}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {(schema.sections || []).map((section) => (
        <div key={section} className="rounded-2xl bg-white border border-[var(--border)] p-4 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--text-secondary)]">{section}</h3>
          <div className="space-y-2">
            {(sections[section] || []).map(({ fieldKey, def }) => (
              <FormField
                key={fieldKey}
                fieldKey={fieldKey}
                def={def}
                value={fields[fieldKey]}
                confidence={confidence[fieldKey]}
                required={def.required}
                flash={lastUpdatedFields.includes(fieldKey)}
                onChange={(event) => onFieldChange?.(formType, fieldKey, event.target.value)}
              />
            ))}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={onReviewSend}
        className="w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-white font-semibold hover:bg-[var(--primary-light)] transition"
      >
        Review & Send
      </button>
    </div>
  );
}
