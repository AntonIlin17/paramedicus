import dotenv from 'dotenv';

dotenv.config();

const isGoogleKey = (value) => /^AIza/.test(value || '');

const inferredGoogleKey =
  process.env.GOOGLE_API_KEY ||
  (isGoogleKey(process.env.OPENROUTER_API_KEY) ? process.env.OPENROUTER_API_KEY : null);

const normalizedOpenRouterKey = isGoogleKey(process.env.OPENROUTER_API_KEY)
  ? null
  : process.env.OPENROUTER_API_KEY || null;

if (!normalizedOpenRouterKey && !inferredGoogleKey) {
  throw new Error('Missing LLM key. Set OPENROUTER_API_KEY or GOOGLE_API_KEY.');
}

const optional = [
  'GOOGLE_API_KEY',
  'DEEPGRAM_API_KEY',
  'DEEPGRAM_TTS_MODEL',
  'ELEVENLABS_API_KEY',
  'OPENWEATHER_API_KEY',
  'RESEND_API_KEY',
  'SMTP_PASS',
];

for (const key of optional) {
  if (!process.env[key]) {
    console.warn(`[config] Optional env var not set: ${key}`);
  }
}

export const config = {
  OPENROUTER_API_KEY: normalizedOpenRouterKey,
  GOOGLE_API_KEY: inferredGoogleKey,
  LLM_PROVIDER: inferredGoogleKey ? 'google' : 'openrouter',
  OR_MODEL_FAST: process.env.OR_MODEL_FAST || 'google/gemini-2.5-flash',
  OR_MODEL_STRONG: process.env.OR_MODEL_STRONG || 'google/gemini-2.5-flash',
  DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY || null,
  DEEPGRAM_TTS_MODEL: process.env.DEEPGRAM_TTS_MODEL || 'aura-asteria-en',
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || null,
  OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY || null,
  RESEND_API_KEY: process.env.RESEND_API_KEY || null,
  PORT: parseInt(process.env.PORT || '3001', 10),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@medicos.app',
  DEFAULT_RECIPIENT: process.env.DEFAULT_RECIPIENT || 'Team07@EffectiveAI.net',
  DEMO_MODE: process.env.DEMO_MODE === 'true',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.resend.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || 'resend',
  SMTP_PASS: process.env.SMTP_PASS || process.env.RESEND_API_KEY || null,
};
