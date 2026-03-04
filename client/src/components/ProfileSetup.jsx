import { useState } from 'react';
import { User } from 'lucide-react';
import { ROLE_OPTIONS, SERVICE_OPTIONS } from '../utils/constants';

export default function ProfileSetup({ onSave }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    medicNumber: '',
    badgeNumber: '',
    role: '',
    service: '',
    vehicleNumber: '',
  });

  const [errors, setErrors] = useState({});

  function validate() {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.medicNumber.trim()) {
      newErrors.medicNumber = 'Medic number is required';
    } else if (!/^\d{5}$/.test(formData.medicNumber)) {
      newErrors.medicNumber = 'Must be exactly 5 digits';
    }

    if (!formData.badgeNumber.trim()) {
      newErrors.badgeNumber = 'Badge number is required';
    }

    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    if (!formData.service) {
      newErrors.service = 'Service is required';
    }

    if (!formData.vehicleNumber.trim()) {
      newErrors.vehicleNumber = 'Vehicle number is required';
    }

    return newErrors;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const newErrors = validate();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave(formData);
  }

  function handleChange(field, value) {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[var(--primary)] via-[var(--primary-light)] to-[var(--primary)] p-4">
      <div className="w-full max-w-md rounded-2xl bg-[var(--surface)] shadow-2xl p-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)]">
              <User className="h-6 w-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-[var(--primary)] mb-1">ParaHelper</h1>
          <p className="text-sm text-[var(--text-secondary)]">Welcome! Let's get you set up.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* First Name */}
          <div>
            <label className="block text-sm font-semibold text-[var(--text)] mb-1">
              First Name
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none transition-colors ${
                errors.firstName
                  ? 'border-red-500 bg-red-50 focus:border-red-600'
                  : 'border-[var(--border)] bg-white focus:border-[var(--primary-light)]'
              }`}
              placeholder="John"
            />
            {errors.firstName && (
              <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-semibold text-[var(--text)] mb-1">
              Last Name
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none transition-colors ${
                errors.lastName
                  ? 'border-red-500 bg-red-50 focus:border-red-600'
                  : 'border-[var(--border)] bg-white focus:border-[var(--primary-light)]'
              }`}
              placeholder="Doe"
            />
            {errors.lastName && (
              <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>
            )}
          </div>

          {/* Medic Number */}
          <div>
            <label className="block text-sm font-semibold text-[var(--text)] mb-1">
              Medic Number (5 digits)
            </label>
            <input
              type="text"
              value={formData.medicNumber}
              onChange={(e) => handleChange('medicNumber', e.target.value)}
              maxLength="5"
              className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none transition-colors ${
                errors.medicNumber
                  ? 'border-red-500 bg-red-50 focus:border-red-600'
                  : 'border-[var(--border)] bg-white focus:border-[var(--primary-light)]'
              }`}
              placeholder="12345"
            />
            {errors.medicNumber && (
              <p className="mt-1 text-xs text-red-600">{errors.medicNumber}</p>
            )}
          </div>

          {/* Badge Number */}
          <div>
            <label className="block text-sm font-semibold text-[var(--text)] mb-1">
              Badge Number
            </label>
            <input
              type="text"
              value={formData.badgeNumber}
              onChange={(e) => handleChange('badgeNumber', e.target.value)}
              className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none transition-colors ${
                errors.badgeNumber
                  ? 'border-red-500 bg-red-50 focus:border-red-600'
                  : 'border-[var(--border)] bg-white focus:border-[var(--primary-light)]'
              }`}
              placeholder="EMS-001"
            />
            {errors.badgeNumber && (
              <p className="mt-1 text-xs text-red-600">{errors.badgeNumber}</p>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-semibold text-[var(--text)] mb-1">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => handleChange('role', e.target.value)}
              className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none transition-colors ${
                errors.role
                  ? 'border-red-500 bg-red-50 focus:border-red-600'
                  : 'border-[var(--border)] bg-white focus:border-[var(--primary-light)]'
              }`}
            >
              <option value="">Select a role</option>
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            {errors.role && (
              <p className="mt-1 text-xs text-red-600">{errors.role}</p>
            )}
          </div>

          {/* Service */}
          <div>
            <label className="block text-sm font-semibold text-[var(--text)] mb-1">
              Service
            </label>
            <select
              value={formData.service}
              onChange={(e) => handleChange('service', e.target.value)}
              className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none transition-colors ${
                errors.service
                  ? 'border-red-500 bg-red-50 focus:border-red-600'
                  : 'border-[var(--border)] bg-white focus:border-[var(--primary-light)]'
              }`}
            >
              <option value="">Select a service</option>
              {SERVICE_OPTIONS.map((service) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>
            {errors.service && (
              <p className="mt-1 text-xs text-red-600">{errors.service}</p>
            )}
          </div>

          {/* Vehicle Number */}
          <div>
            <label className="block text-sm font-semibold text-[var(--text)] mb-1">
              Vehicle Number
            </label>
            <input
              type="text"
              value={formData.vehicleNumber}
              onChange={(e) => handleChange('vehicleNumber', e.target.value)}
              className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none transition-colors ${
                errors.vehicleNumber
                  ? 'border-red-500 bg-red-50 focus:border-red-600'
                  : 'border-[var(--border)] bg-white focus:border-[var(--primary-light)]'
              }`}
              placeholder="A-12"
            />
            {errors.vehicleNumber && (
              <p className="mt-1 text-xs text-red-600">{errors.vehicleNumber}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full rounded-lg bg-[var(--primary)] px-6 py-3 font-semibold text-white hover:bg-[var(--primary-light)] transition-colors mt-6"
          >
            Get Started
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-[var(--text-secondary)]">
          Your information is stored locally and securely.
        </p>
      </div>
    </div>
  );
}
