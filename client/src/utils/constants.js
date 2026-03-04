export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:42819';

export const ROLE_OPTIONS = [
  'Primary Care Paramedic',
  'Advanced Care Paramedic',
  'Supervisor',
  'Driver',
];

export const SERVICE_OPTIONS = ['EAI Ambulance Service', 'Muskoka Paramedic Services', 'County EMS'];

export const VOICE_STATE = {
  IDLE: 'idle',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  SPEAKING: 'speaking',
};

export const CONFIDENCE_CLASS = {
  high: 'bg-green-500',
  medium: 'bg-amber-500',
  low: 'bg-red-500',
};

export const FORM_LABELS = {
  occurrence: 'EMS Occurrence Report',
  teddybear: 'Teddy Bear Comfort Program',
};
