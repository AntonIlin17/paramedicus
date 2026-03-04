import { useState } from 'react';
import { ROLE_OPTIONS, SERVICE_OPTIONS } from '../utils/constants';

const initial = {
  firstName: '',
  lastName: '',
  medicNumber: '',
  badgeNumber: '',
  role: ROLE_OPTIONS[0],
  service: SERVICE_OPTIONS[0],
  vehicleNumber: '',
};

export default function WelcomeScreen({ onStart }) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState('');

  const update = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const submit = (event) => {
    event.preventDefault();
    if (!/^\d{5}$/.test(values.medicNumber)) {
      setError('Medic number must be 5 digits.');
      return;
    }
    if (!values.firstName || !values.lastName) {
      setError('First and last name are required.');
      return;
    }
    setError('');
    onStart?.(values);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-[var(--text)]">MedicOS Shift Start</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Set your profile once. Voice auto-fills forms from here.</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-[var(--text-secondary)]">
            First Name
            <input className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2" value={values.firstName} onChange={(e) => update('firstName', e.target.value)} />
          </label>
          <label className="text-sm text-[var(--text-secondary)]">
            Last Name
            <input className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2" value={values.lastName} onChange={(e) => update('lastName', e.target.value)} />
          </label>
          <label className="text-sm text-[var(--text-secondary)]">
            Medic # <span className="text-red-600">*</span>
            <input className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 font-mono" value={values.medicNumber} onChange={(e) => update('medicNumber', e.target.value)} placeholder="5-digit" />
          </label>
          <label className="text-sm text-[var(--text-secondary)]">
            Badge #
            <input className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2" value={values.badgeNumber} onChange={(e) => update('badgeNumber', e.target.value)} placeholder="B-3047" />
          </label>
          <label className="text-sm text-[var(--text-secondary)]">
            Role
            <select className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2" value={values.role} onChange={(e) => update('role', e.target.value)}>
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-[var(--text-secondary)]">
            Service
            <select className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2" value={values.service} onChange={(e) => update('service', e.target.value)}>
              {SERVICE_OPTIONS.map((service) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-[var(--text-secondary)] sm:col-span-2">
            Vehicle #
            <input className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 font-mono" value={values.vehicleNumber} onChange={(e) => update('vehicleNumber', e.target.value)} placeholder="4-digit" />
          </label>
        </div>

        {error ? <div className="mt-3 text-sm text-red-700">{error}</div> : null}

        <button type="submit" className="mt-5 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-light)]">
          Start Shift
        </button>
      </form>
    </div>
  );
}
