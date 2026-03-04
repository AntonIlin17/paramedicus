import { useMemo } from 'react';
import { CONFIDENCE_CLASS } from '../utils/constants';

function normalizeInputValue(type, value) {
  if (value === undefined || value === null) return '';
  const raw = String(value);

  if (type !== 'datetime') {
    return raw;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) {
    return raw;
  }

  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) {
    return raw;
  }

  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

function InputByType({ fieldKey, def, value, onChange }) {
  const common = {
    id: fieldKey,
    name: fieldKey,
    value: normalizeInputValue(def.type, value),
    onChange,
    className: 'w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--primary-light)] focus:outline-none',
    placeholder: def.placeholder || '',
  };

  if (def.type === 'select') {
    return (
      <select {...common}>
        <option value="">Select</option>
        {(def.options || []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (def.type === 'textarea') {
    return <textarea {...common} rows={4} />;
  }

  if (def.type === 'boolean') {
    return (
      <select {...common}>
        <option value="">Unknown</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }

  const htmlTypeMap = {
    date: 'date',
    time: 'time',
    datetime: 'datetime-local',
    number: 'number',
  };

  return <input type={htmlTypeMap[def.type] || 'text'} {...common} />;
}

export default function FormField({ fieldKey, def, value, confidence, required, onChange, flash }) {
  const confidenceClass = useMemo(() => CONFIDENCE_CLASS[confidence] || 'bg-slate-300', [confidence]);

  return (
    <div className={`rounded-xl border border-[var(--border)] p-3 ${flash ? 'animate-fieldFlash' : ''}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <label htmlFor={fieldKey} className="text-sm font-semibold text-[var(--text)]">
          {def.label} {required ? <span className="text-red-600">*</span> : null}
        </label>
        <div className="inline-flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${confidenceClass}`} />
          {confidence || 'n/a'}
        </div>
      </div>
      <InputByType fieldKey={fieldKey} def={def} value={value} onChange={onChange} />
    </div>
  );
}
