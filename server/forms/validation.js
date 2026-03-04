import { getFormSchema, getRequiredFieldKeys, getZodSchema } from './schemas.js';

function isEmpty(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

export function normalizeBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return false;
  const lowered = value.toLowerCase();
  return lowered === 'true' || lowered === 'yes' || lowered === '1';
}

export function validateForm(formType, formData = {}, schema = null, fieldConfidence = {}) {
  const resolvedSchema = schema || getFormSchema(formType);
  if (!resolvedSchema) {
    return {
      errors: [{ field: 'formType', message: `Unknown form type: ${formType}` }],
      warnings: [],
      zodIssues: [],
      canExport: false,
      completion: { requiredFilled: 0, requiredTotal: 0, ratio: 0 },
    };
  }

  const errors = [];
  const warnings = [];

  for (const [key, def] of Object.entries(resolvedSchema.fields)) {
    if (def.required && isEmpty(formData[key])) {
      errors.push({ field: key, message: `Missing required: ${def.label}` });
    }
  }

  if (formType === 'occurrence') {
    if (formData.vehicle_number && !/^\d{4}$/.test(String(formData.vehicle_number))) {
      warnings.push({ field: 'vehicle_number', message: 'Vehicle # should be 4 digits' });
    }

    if (formData.occurrence_type === 'Vehicle Related' && isEmpty(formData.vehicle_number)) {
      warnings.push({ field: 'vehicle_number', message: 'Vehicle-related incident requires vehicle #' });
    }
  }

  if (formType === 'teddybear') {
    if (formData.medic_number && !/^\d{5}$/.test(String(formData.medic_number))) {
      errors.push({ field: 'medic_number', message: 'Medic # must be 5 digits' });
    }

    if (formData.second_medic_number && !/^\d{5}$/.test(String(formData.second_medic_number))) {
      warnings.push({ field: 'second_medic_number', message: 'Second medic # should be 5 digits' });
    }

    if (!isEmpty(formData.recipient_age)) {
      const age = Number(formData.recipient_age);
      if (Number.isNaN(age) || age < 0 || age > 120) {
        warnings.push({ field: 'recipient_age', message: 'Age seems incorrect' });
      }
    }
  }

  for (const requiredField of getRequiredFieldKeys(formType)) {
    if (fieldConfidence?.[requiredField] === 'low' && !isEmpty(formData[requiredField])) {
      warnings.push({ field: requiredField, message: `Low confidence value for required field: ${requiredField}` });
    }
  }

  const zodSchema = getZodSchema(formType);
  const parsed = zodSchema ? zodSchema.safeParse(formData) : { success: true };
  const zodIssues = parsed.success
    ? []
    : parsed.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'unknown',
        message: issue.message,
      }));

  const requiredTotal = getRequiredFieldKeys(formType).length;
  const requiredFilled = getRequiredFieldKeys(formType).filter((key) => !isEmpty(formData[key])).length;

  return {
    errors,
    warnings,
    zodIssues,
    canExport: errors.length === 0,
    completion: {
      requiredFilled,
      requiredTotal,
      ratio: requiredTotal === 0 ? 1 : requiredFilled / requiredTotal,
    },
  };
}
