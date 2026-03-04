export const sourceDocuments = {
  challengeOutline: 'Hackathon Challenge Outline V07.pdf',
  checklist: 'Paramedic Checklist V01.pdf',
  extractedSummary: {
    checklistRevision: '20260225',
    criticalBadCodes: ['ACRc', 'CERT-Va', 'OVER'],
    taskFocus:
      'Voice-first paramedic assistant that fills occurrence/teddy-bear forms, then supports PDF/XML export and email send with manual review.',
  },
};

export const mockProfiles = [
  {
    id: 'profile-acp-01',
    firstName: 'Jamie',
    lastName: 'Adams',
    medicNumber: '10452',
    badgeNumber: 'B-3047',
    role: 'Advanced Care Paramedic',
    service: 'EAI Ambulance Service',
    vehicleNumber: '4012',
  },
  {
    id: 'profile-pcp-02',
    firstName: 'Lisa',
    lastName: 'Patel',
    medicNumber: '10789',
    badgeNumber: 'B-3182',
    role: 'Primary Care Paramedic',
    service: 'Muskoka Paramedic Services',
    vehicleNumber: '4022',
  },
];

export const occurrenceCases = [
  {
    id: 'occ-valid-vehicle-station',
    description: 'Fully valid vehicle incident at station',
    formData: {
      date: '2026-03-03',
      time: '14:30',
      classification: 'Vehicle Incident',
      occurrence_type: 'Station Related',
      brief_description: 'Minor backing incident at station bay wall',
      service: 'EAI Ambulance Service',
      vehicle_number: '4012',
      role: 'Advanced Care Paramedic',
      badge_number: 'B-3047',
      observation: 'Rear bumper contacted concrete wall. No injuries.',
      requested_by: 'Supervisor Chen',
      report_creator: 'Jamie Adams',
    },
    expected: {
      canExport: true,
      errorFields: [],
      warningFields: [],
    },
  },
  {
    id: 'occ-missing-required',
    description: 'Missing multiple required fields should block export',
    formData: {
      date: '2026-03-03',
      time: '14:30',
      classification: 'Near Miss',
      occurrence_type: 'Non-Call Related',
    },
    expected: {
      canExport: false,
      errorFields: ['brief_description', 'service', 'vehicle_number', 'role', 'badge_number', 'observation', 'requested_by', 'report_creator'],
      warningFields: [],
    },
  },
  {
    id: 'occ-invalid-vehicle-format',
    description: 'Invalid vehicle number format should warn but not block when all required are present',
    formData: {
      date: '2026-03-03',
      time: '14:30',
      classification: 'Equipment Failure',
      occurrence_type: 'Vehicle Related',
      brief_description: 'Monitor mount became loose during shift',
      service: 'County EMS',
      vehicle_number: '41',
      role: 'Driver',
      badge_number: 'B-3182',
      observation: 'Unit was taken out of service for inspection.',
      requested_by: 'Operations Lead',
      report_creator: 'Lisa Patel',
    },
    expected: {
      canExport: true,
      errorFields: [],
      warningFields: ['vehicle_number'],
    },
  },
];

export const teddyBearCases = [
  {
    id: 'tb-valid-minimal',
    description: 'Minimal required teddy bear fields',
    formData: {
      form_number: 'TB-1709500000000',
      date_time: '2026-03-03T14:30',
      first_name: 'Jamie',
      last_name: 'Adams',
      medic_number: '10452',
    },
    expected: {
      canExport: true,
      errorFields: [],
      warningFields: [],
    },
  },
  {
    id: 'tb-invalid-primary-medic',
    description: 'Invalid primary medic number should block export',
    formData: {
      form_number: 'TB-1709500000001',
      date_time: '2026-03-03T14:35',
      first_name: 'Jamie',
      last_name: 'Adams',
      medic_number: '1045',
      recipient_age: 7,
      recipient_gender: 'Female',
      recipient_type: 'Patient',
    },
    expected: {
      canExport: false,
      errorFields: ['medic_number'],
      warningFields: [],
    },
  },
  {
    id: 'tb-second-medic-warning-and-age-warning',
    description: 'Second medic and age warnings should not block export',
    formData: {
      form_number: 'TB-1709500000002',
      date_time: '2026-03-03T14:40',
      first_name: 'Lisa',
      last_name: 'Patel',
      medic_number: '10789',
      second_medic_number: '777',
      recipient_age: 130,
      recipient_gender: 'Other',
      recipient_type: 'Bystander',
    },
    expected: {
      canExport: true,
      errorFields: [],
      warningFields: ['second_medic_number', 'recipient_age'],
    },
  },
];

export const teddyBearXMLCases = [
  {
    id: 'xml-minimal',
    formData: {
      form_number: 'TB-XML-001',
      date_time: '2026-03-03T14:30:00',
      first_name: 'Jamie',
      last_name: 'Adams',
      medic_number: '10452',
    },
    expectedIncludes: ['<PrimaryMedic>', '<FormId>TB-XML-001</FormId>'],
    expectedExcludes: ['<SecondMedic>', '<Recipient>'],
  },
  {
    id: 'xml-full',
    formData: {
      form_number: 'TB-XML-002',
      date_time: '2026-03-03T14:30:00',
      first_name: 'Jamie',
      last_name: 'Adams',
      medic_number: '10452',
      second_first_name: 'Lisa',
      second_last_name: 'Patel',
      second_medic_number: '10789',
      recipient_age: 9,
      recipient_gender: 'Female',
      recipient_type: 'Patient',
    },
    expectedIncludes: ['<SecondMedic>', '<Recipient>', '<Age>9</Age>', '<Type>Patient</Type>'],
    expectedExcludes: [],
  },
];

export const statusSnapshot = {
  summary: {
    revision: '20260225',
    paramedic: 'ALL',
  },
  badItems: ['ACRc', 'CERT-Va', 'OVER'],
  criticalActionsCount: 3,
};

export const scheduleSnapshot = {
  source: 'fallback',
  activeUnits: ['4012', '4018', '4044'],
  scheduledNightUnits: ['4025', '4009', '4022'],
};

export const pipelineIntentPrompts = [
  {
    id: 'intent-occurrence',
    input: 'I backed unit 4012 into the station wall. No injuries.',
    expectedFormType: 'occurrence',
  },
  {
    id: 'intent-teddy',
    input: 'We gave a teddy bear to a 6 year old girl after treatment at the ER.',
    expectedFormType: 'teddybear',
  },
  {
    id: 'intent-status',
    input: 'What compliance items are overdue for me?',
    expectedIntent: 'status_query',
  },
  {
    id: 'intent-schedule',
    input: 'Who is on shift tonight?',
    expectedIntent: 'shift_query',
  },
];
