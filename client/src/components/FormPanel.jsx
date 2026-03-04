import { useState } from 'react';
import { ChevronRight, AlertCircle } from 'lucide-react';
import { updateFormField, reviewForm } from '../utils/api';
import FormField from './FormField';
import { FORM_LABELS } from '../utils/constants';

export default function FormPanel({ formState, sessionId }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flashedFields, setFlashedFields] = useState(new Set());

  if (!formState) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="text-center text-[var(--text-secondary)]">No active form</p>
      </div>
    );
  }

  const { formType, schema, fields = {}, confidence = {} } = formState;
  const formLabel = FORM_LABELS[formType] || formType;

  if (!schema) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="text-center text-[var(--text-secondary)]">Loading form schema...</p>
      </div>
    );
  }

  // Count required fields
  const requiredFields = [];
  const filledFields = [];

  schema.sections?.forEach((section) => {
    section.fields?.forEach((field) => {
      if (field.required) {
        requiredFields.push(field.key);
        if (fields[field.key]) {
          filledFields.push(field.key);
        }
      }
    });
  });

  const progressPercent = requiredFields.length > 0 ? Math.round((filledFields.length / requiredFields.length) * 100) : 100;
  const isComplete = filledFields.length === requiredFields.length;

  async function handleFieldChange(fieldKey, newValue) {
    try {
      await updateFormField(sessionId, formType, fieldKey, newValue);
      // Flash the field
      setFlashedFields((prev) => new Set([...prev, fieldKey]));
      setTimeout(() => {
        setFlashedFields((prev) => {
          const next = new Set(prev);
          next.delete(fieldKey);
          return next;
        });
      }, 900);
    } catch (error) {
      console.error('[form] field update error:', error);
    }
  }

  async function handleReviewSend() {
    setIsSubmitting(true);
    try {
      const result = await reviewForm(sessionId, formType);
      // This would typically open an email preview modal
      // For now, we'll just notify success
      console.log('[form] review result:', result);
    } catch (error) {
      console.error('[form] review error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
      {/* Form Header */}
      <div className="border-b border-[var(--border)] bg-slate-50 px-4 py-3">
        <h2 className="mb-2 text-lg font-semibold text-[var(--text)]">{formLabel}</h2>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--text-secondary)]">Required fields</span>
            <span className="font-semibold text-[var(--text)]">
              {filledFields.length}/{requiredFields.length}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {progressPercent < 100 && (
            <p className="text-xs text-amber-600 mt-1">
              {requiredFields.length - filledFields.length} more required
            </p>
          )}
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {schema.sections?.map((section, sectionIdx) => (
          <div key={sectionIdx}>
            {section.title && (
              <h3 className="mb-3 text-sm font-semibold text-[var(--text)] uppercase tracking-wide">
                {section.title}
              </h3>
            )}
            <div className="space-y-3">
              {section.fields?.map((fieldDef) => (
                <FormField
                  key={fieldDef.key}
                  fieldKey={fieldDef.key}
                  def={fieldDef}
                  value={fields[fieldDef.key]}
                  confidence={confidence[fieldDef.key]}
                  required={fieldDef.required}
                  onChange={(e) => handleFieldChange(fieldDef.key, e.target.value)}
                  flash={flashedFields.has(fieldDef.key)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Form Actions */}
      <div className="border-t border-[var(--border)] bg-slate-50 p-4">
        {!isComplete && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <AlertCircle className="h-4 w-4 mt-0.5 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              Complete all required fields to review and send the form.
            </p>
          </div>
        )}

        <button
          onClick={handleReviewSend}
          disabled={!isComplete || isSubmitting}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 font-semibold text-white hover:bg-[var(--primary-light)] disabled:bg-slate-300 transition-colors"
        >
          Review & Send
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
