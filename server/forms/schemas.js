import { z } from 'zod';

export const FORM_SCHEMAS = {
  occurrence: {
    key: 'occurrence',
    displayName: 'EMS Occurrence Report',
    description: 'Incident documentation for non-patient, non-call events',
    emailSubjectTemplate: 'Occurrence Report - {occurrence_ref} - {report_creator}',
    sections: [
      'Incident Overview',
      'Service & Vehicle',
      'Personnel',
      'Report Details',
      'Submission Information',
    ],
    fields: {
      date: { label: 'Date', type: 'date', required: true, section: 'Incident Overview' },
      time: { label: 'Time', type: 'time', required: true, section: 'Incident Overview' },
      call_number: {
        label: 'Call Number',
        type: 'text',
        required: false,
        section: 'Incident Overview',
        placeholder: 'e.g. 2026-00412',
      },
      classification: {
        label: 'Classification',
        type: 'select',
        required: true,
        section: 'Incident Overview',
        options: ['Vehicle Incident', 'Equipment Failure', 'Workplace Injury', 'Patient Complaint', 'Near Miss', 'Other'],
      },
      classification_details: {
        label: 'Classification Details',
        type: 'text',
        required: false,
        section: 'Incident Overview',
      },
      occurrence_type: {
        label: 'Occurrence Type',
        type: 'select',
        required: true,
        section: 'Incident Overview',
        options: ['Call Related', 'Non-Call Related', 'Station Related', 'Vehicle Related'],
      },
      occurrence_ref: {
        label: 'Occurrence Reference #',
        type: 'text',
        required: false,
        section: 'Incident Overview',
        placeholder: 'e.g. OCC-2026-0087',
      },
      brief_description: { label: 'Brief Description', type: 'text', required: true, section: 'Incident Overview' },
      service: {
        label: 'Service',
        type: 'select',
        required: true,
        section: 'Service & Vehicle',
        options: ['EAI Ambulance Service', 'Muskoka Paramedic Services', 'County EMS'],
      },
      vehicle_number: {
        label: 'Vehicle #',
        type: 'text',
        required: true,
        section: 'Service & Vehicle',
        placeholder: '4-digit',
      },
      vehicle_description: {
        label: 'Vehicle Description',
        type: 'text',
        required: false,
        section: 'Service & Vehicle',
      },
      role: {
        label: 'Role',
        type: 'select',
        required: true,
        section: 'Personnel',
        options: ['Primary Care Paramedic', 'Advanced Care Paramedic', 'Supervisor', 'Driver'],
      },
      role_description: {
        label: 'Role Description',
        type: 'text',
        required: false,
        section: 'Personnel',
      },
      badge_number: {
        label: 'Badge #',
        type: 'text',
        required: true,
        section: 'Personnel',
        placeholder: 'e.g. B-3047',
      },
      fire_department: {
        label: 'Fire Department Involved',
        type: 'boolean',
        required: false,
        section: 'Personnel',
      },
      police: { label: 'Police Involved', type: 'boolean', required: false, section: 'Personnel' },
      observation: {
        label: 'Observation / Description of Event',
        type: 'textarea',
        required: true,
        section: 'Report Details',
      },
      action_taken: { label: 'Action Taken', type: 'textarea', required: false, section: 'Report Details' },
      suggested_resolution: {
        label: 'Suggested Resolution',
        type: 'textarea',
        required: false,
        section: 'Report Details',
      },
      management_notes: {
        label: 'Management Notes',
        type: 'textarea',
        required: false,
        section: 'Report Details',
      },
      requested_by: { label: 'Requested By', type: 'text', required: true, section: 'Submission Information' },
      requested_by_details: {
        label: 'Requested By - Details',
        type: 'text',
        required: false,
        section: 'Submission Information',
      },
      report_creator: { label: 'Report Creator', type: 'text', required: true, section: 'Submission Information' },
      creator_details: {
        label: 'Creator - Details',
        type: 'text',
        required: false,
        section: 'Submission Information',
      },
    },
  },
  teddybear: {
    key: 'teddybear',
    displayName: 'Teddy Bear Comfort Program',
    description: 'Track comfort bear distributions',
    emailSubjectTemplate: 'Teddy Bear Record - {form_number} - {first_name} {last_name}',
    outputFormats: ['pdf', 'xml'],
    sections: ['Date & Time', 'Primary Medic (Required)', 'Second Medic (Optional)', 'Teddy Bear Recipient'],
    fields: {
      form_number: { label: 'Form Number', type: 'text', required: false, section: 'Date & Time', auto: true },
      date_time: { label: 'Date / Time', type: 'datetime', required: true, section: 'Date & Time' },
      first_name: { label: 'First Name', type: 'text', required: true, section: 'Primary Medic (Required)' },
      last_name: { label: 'Last Name', type: 'text', required: true, section: 'Primary Medic (Required)' },
      medic_number: {
        label: 'Medic Number',
        type: 'text',
        required: true,
        section: 'Primary Medic (Required)',
        placeholder: '5-digit',
      },
      second_first_name: {
        label: 'First Name',
        type: 'text',
        required: false,
        section: 'Second Medic (Optional)',
      },
      second_last_name: { label: 'Last Name', type: 'text', required: false, section: 'Second Medic (Optional)' },
      second_medic_number: {
        label: 'Medic Number',
        type: 'text',
        required: false,
        section: 'Second Medic (Optional)',
      },
      recipient_age: { label: 'Age', type: 'number', required: false, section: 'Teddy Bear Recipient' },
      recipient_gender: {
        label: 'Gender',
        type: 'select',
        required: false,
        section: 'Teddy Bear Recipient',
        options: ['Male', 'Female', 'Other', 'Prefer not to say'],
      },
      recipient_type: {
        label: 'Recipient Type',
        type: 'select',
        required: false,
        section: 'Teddy Bear Recipient',
        options: ['Patient', 'Family', 'Bystander', 'Other'],
      },
    },
  },
};

const textOrEmpty = z.union([z.string(), z.literal('')]).optional();

export const FORM_ZOD_SCHEMAS = {
  occurrence: z.object({
    date: z.string().min(1),
    time: z.string().min(1),
    call_number: textOrEmpty,
    classification: z.string().min(1),
    classification_details: textOrEmpty,
    occurrence_type: z.string().min(1),
    occurrence_ref: textOrEmpty,
    brief_description: z.string().min(1),
    service: z.string().min(1),
    vehicle_number: z.string().min(1),
    vehicle_description: textOrEmpty,
    role: z.string().min(1),
    role_description: textOrEmpty,
    badge_number: z.string().min(1),
    fire_department: z.union([z.boolean(), z.string()]).optional(),
    police: z.union([z.boolean(), z.string()]).optional(),
    observation: z.string().min(1),
    action_taken: textOrEmpty,
    suggested_resolution: textOrEmpty,
    management_notes: textOrEmpty,
    requested_by: z.string().min(1),
    requested_by_details: textOrEmpty,
    report_creator: z.string().min(1),
    creator_details: textOrEmpty,
  }),
  teddybear: z.object({
    form_number: textOrEmpty,
    date_time: z.string().min(1),
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    medic_number: z.string().min(1),
    second_first_name: textOrEmpty,
    second_last_name: textOrEmpty,
    second_medic_number: textOrEmpty,
    recipient_age: z.union([z.number(), z.string()]).optional(),
    recipient_gender: textOrEmpty,
    recipient_type: textOrEmpty,
  }),
};

export function getFormSchema(formType) {
  return FORM_SCHEMAS[formType] || null;
}

export function getZodSchema(formType) {
  return FORM_ZOD_SCHEMAS[formType] || null;
}

export function getRequiredFieldKeys(formType) {
  const schema = getFormSchema(formType);
  if (!schema) return [];
  return Object.entries(schema.fields)
    .filter(([, def]) => def.required)
    .map(([key]) => key);
}

export function buildInitialFormValues(formType) {
  const schema = getFormSchema(formType);
  if (!schema) return {};
  return Object.keys(schema.fields).reduce((acc, key) => {
    acc[key] = '';
    return acc;
  }, {});
}
