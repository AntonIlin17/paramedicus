import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callLLM } from './openrouter.js';
import { buildSystemPrompt, buildUserPrompt } from './prompts.js';
import { config } from '../config.js';
import { getScheduleData } from '../services/scraper.js';
import { getWeatherData } from '../services/weather.js';
import { FORM_SCHEMAS, getRequiredFieldKeys } from '../forms/schemas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATUS_PATH = path.resolve(__dirname, '../data/status-data.json');

function loadStatusData() {
  const raw = fs.readFileSync(STATUS_PATH, 'utf-8');
  return JSON.parse(raw);
}

const STATUS_DATA = loadStatusData();

function normalizeFormType(rawType, intent) {
  const type = rawType || '';
  if (type === 'occurrence_report') return 'occurrence';
  if (type === 'teddy_bear') return 'teddybear';
  if (type === 'teddybear') return 'teddybear';
  if (type === 'occurrence') return 'occurrence';

  if (intent === 'occurrence_report') return 'occurrence';
  if (intent === 'teddy_bear') return 'teddybear';

  return null;
}

function includesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function normalizeResponse(raw = {}) {
  const intent = raw.intent || raw.Intent || 'general_chat';
  const formType = normalizeFormType(raw.form_type || raw.formType, intent);

  return {
    cleanedText: raw.cleaned_text ?? raw.cleanedText ?? null,
    intent,
    intentConfidence: raw.intent_confidence ?? raw.intentConfidence ?? 'medium',
    formType,
    formUpdates: raw.form_updates ?? raw.formUpdates ?? null,
    fieldConfidence: raw.field_confidence ?? raw.fieldConfidence ?? {},
    missingRequired: raw.missing_required ?? raw.missingRequired ?? [],
    validationWarnings: raw.validation_warnings ?? raw.validationWarnings ?? [],
    responseText:
      raw.response_text ??
      raw.responseText ??
      'I captured that. I can keep filling your form or help with schedule, status, and weather.',
    followupQuestion: raw.followup_question ?? raw.followupQuestion ?? null,
    suggestedActions: raw.suggested_actions ?? raw.suggestedActions ?? [],
  };
}

function toDateString(date) {
  return date.toISOString().slice(0, 10);
}

function toTimeString(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function toDateTimeLocal(date) {
  return `${toDateString(date)}T${toTimeString(date)}`;
}

function localFallbackPipeline(session, userInput, context = {}) {
  const input = String(userInput || '').trim();
  const lower = input.toLowerCase();
  const profile = session.profile || {};
  const now = new Date();

  if (includesAny(lower, [/shift/, /schedule/, /roster/, /who'?s working/, /next shift/])) {
    const text = context.scheduleData?.text
      ? `From the current schedule: ${context.scheduleData.text.slice(0, 180)}`
      : 'I could not read the live schedule right now, but I can still help with forms.';
    return {
      cleanedText: input,
      intent: 'shift_query',
      intentConfidence: 'medium',
      formType: null,
      formUpdates: null,
      fieldConfidence: {},
      missingRequired: [],
      validationWarnings: [],
      responseText: text,
      followupQuestion: null,
      suggestedActions: ['View Schedule', 'Start New Form'],
    };
  }

  if (includesAny(lower, [/status/, /overdue/, /compliance/, /acr/, /cert/, /license/, /vaccin/])) {
    const statusData = context.statusData || {};
    const items = Array.isArray(statusData.items) ? statusData.items : [];
    const acrOverdue = items.find((item) => String(item.code || '').toUpperCase() === 'ACRC')?.issueCount ?? 0;
    const certVaIssue = items.find((item) => String(item.code || '').toUpperCase() === 'CERT-VA')?.issueCount ?? 0;
    const overallOutstanding = items
      .filter((item) => String(item.status || '').toUpperCase() === 'BAD')
      .reduce((sum, item) => sum + Number(item.issueCount || 0), 0);
    const text = `Status summary: A C R overdue ${acrOverdue}, certification issues ${certVaIssue}, overall outstanding ${overallOutstanding}.`;
    return {
      cleanedText: input,
      intent: 'status_query',
      intentConfidence: 'medium',
      formType: null,
      formUpdates: null,
      fieldConfidence: {},
      missingRequired: [],
      validationWarnings: [],
      responseText: text,
      followupQuestion: null,
      suggestedActions: ['Check Status', 'Start New Form'],
    };
  }

  if (includesAny(lower, [/weather/, /temperature/, /forecast/, /rain/, /snow/, /wind/])) {
    const weather = context.weatherData || {};
    const text = weather.temperatureC !== undefined
      ? `Current weather for ${weather.location || 'Toronto'} is about ${weather.temperatureC} degrees Celsius.`
      : 'I could not fetch weather right now.';
    return {
      cleanedText: input,
      intent: 'weather_query',
      intentConfidence: 'medium',
      formType: null,
      formUpdates: null,
      fieldConfidence: {},
      missingRequired: [],
      validationWarnings: [],
      responseText: text,
      followupQuestion: null,
      suggestedActions: ['Start New Form', 'Check Status'],
    };
  }

  if (includesAny(lower, [/teddy/, /bear/, /comfort/, /stuffed/])) {
    const formType = 'teddybear';
    const existing = session.activeForms?.[formType]?.fields || {};
    const updates = {
      date_time: toDateTimeLocal(now),
      form_number: existing.form_number || `TB-${Date.now()}`,
      first_name: profile.firstName || existing.first_name || '',
      last_name: profile.lastName || existing.last_name || '',
      medic_number: profile.medicNumber || existing.medic_number || '',
    };
    const confidence = {
      date_time: 'high',
      form_number: 'high',
      first_name: updates.first_name ? 'high' : 'low',
      last_name: updates.last_name ? 'high' : 'low',
      medic_number: updates.medic_number ? 'high' : 'low',
    };

    const ageMatch = lower.match(/(\d{1,3})\s*(year|yr)/);
    if (ageMatch) {
      updates.recipient_age = Number(ageMatch[1]);
      confidence.recipient_age = 'high';
    }
    if (/\bgirl|female\b/.test(lower)) {
      updates.recipient_gender = 'Female';
      confidence.recipient_gender = 'high';
    } else if (/\bboy|male\b/.test(lower)) {
      updates.recipient_gender = 'Male';
      confidence.recipient_gender = 'high';
    }
    if (/\bpatient\b/.test(lower)) {
      updates.recipient_type = 'Patient';
      confidence.recipient_type = 'high';
    } else if (/\bfamily\b/.test(lower)) {
      updates.recipient_type = 'Family';
      confidence.recipient_type = 'high';
    } else if (/\bbystander\b/.test(lower)) {
      updates.recipient_type = 'Bystander';
      confidence.recipient_type = 'high';
    }

    const missing = getRequiredFieldKeys(formType).filter((key) => {
      const value = updates[key] ?? existing[key];
      return value === undefined || value === null || String(value).trim() === '';
    });
    const nextMissing = missing[0];

    return {
      cleanedText: input,
      intent: 'teddy_bear',
      intentConfidence: 'medium',
      formType,
      formUpdates: updates,
      fieldConfidence: confidence,
      missingRequired: missing,
      validationWarnings: [],
      responseText: nextMissing
        ? `I started the Teddy Bear form and captured what I could. What is the ${nextMissing.replaceAll('_', ' ')}?`
        : 'I started the Teddy Bear form and captured the details. You can review and send it now.',
      followupQuestion: nextMissing ? `What is the ${nextMissing.replaceAll('_', ' ')}?` : null,
      suggestedActions: nextMissing ? ['Review Form', 'Start New Form'] : ['Review Form', 'Send Report'],
    };
  }

  if (includesAny(lower, [/occurrence/, /incident/, /accident/, /report/, /damage/, /backed into/, /near miss/])) {
    const formType = 'occurrence';
    const existing = session.activeForms?.[formType]?.fields || {};
    const updates = {
      date: toDateString(now),
      time: toTimeString(now),
      classification: /vehicle|ambulance|unit|backed/.test(lower) ? 'Vehicle Incident' : existing.classification || '',
      occurrence_type: /station|base|wall/.test(lower) ? 'Station Related' : /vehicle|ambulance|unit/.test(lower) ? 'Vehicle Related' : existing.occurrence_type || '',
      brief_description: input.slice(0, 180),
      observation: input,
      service: profile.service || existing.service || '',
      role: profile.role || existing.role || '',
      badge_number: profile.badgeNumber || existing.badge_number || '',
      vehicle_number: profile.vehicleNumber || existing.vehicle_number || '',
      report_creator: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || existing.report_creator || '',
    };
    const confidence = Object.fromEntries(Object.keys(updates).map((key) => [key, updates[key] ? 'medium' : 'low']));
    confidence.date = 'high';
    confidence.time = 'high';

    const missing = getRequiredFieldKeys(formType).filter((key) => {
      const value = updates[key] ?? existing[key];
      return value === undefined || value === null || String(value).trim() === '';
    });
    const nextMissing = missing[0];

    return {
      cleanedText: input,
      intent: 'occurrence_report',
      intentConfidence: 'medium',
      formType,
      formUpdates: updates,
      fieldConfidence: confidence,
      missingRequired: missing,
      validationWarnings: [],
      responseText: nextMissing
        ? `I started an Occurrence Report and captured core details. What is the ${nextMissing.replaceAll('_', ' ')}?`
        : 'I started the Occurrence Report and it looks complete enough to review.',
      followupQuestion: nextMissing ? `What is the ${nextMissing.replaceAll('_', ' ')}?` : null,
      suggestedActions: nextMissing ? ['Review Form', 'Start New Form'] : ['Review Form', 'Send Report'],
    };
  }

  return {
    cleanedText: input,
    intent: 'general_chat',
    intentConfidence: 'low',
    formType: null,
    formUpdates: null,
    fieldConfidence: {},
    missingRequired: [],
    validationWarnings: [],
    responseText: 'I can help with occurrence reports, teddy bear tracking, shift schedule, status, and weather. Tell me what you need.',
    followupQuestion: null,
    suggestedActions: ['Start New Form', 'View Schedule', 'Check Status'],
  };
}

function autoFillWithProfile(result, session) {
  const profile = session.profile || {};
  if (!result.formType) return result;

  const updates = { ...(result.formUpdates || {}) };
  const confidence = { ...(result.fieldConfidence || {}) };

  if (result.formType === 'occurrence') {
    if (!updates.date) {
      updates.date = toDateString(new Date());
      confidence.date = confidence.date || 'high';
    }
    if (!updates.time) {
      updates.time = toTimeString(new Date());
      confidence.time = confidence.time || 'high';
    }

    const profileMap = {
      badge_number: profile.badgeNumber,
      service: profile.service,
      role: profile.role,
      vehicle_number: profile.vehicleNumber,
      report_creator: `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
    };

    for (const [field, value] of Object.entries(profileMap)) {
      if (!updates[field] && value) {
        updates[field] = value;
        confidence[field] = confidence[field] || 'high';
      }
    }
  }

  if (result.formType === 'teddybear') {
    if (!updates.date_time) {
      updates.date_time = new Date().toISOString().slice(0, 16);
      confidence.date_time = confidence.date_time || 'high';
    }
    if (!updates.form_number) {
      updates.form_number = `TB-${Date.now()}`;
      confidence.form_number = confidence.form_number || 'high';
    }

    const profileMap = {
      first_name: profile.firstName,
      last_name: profile.lastName,
      medic_number: profile.medicNumber,
    };

    for (const [field, value] of Object.entries(profileMap)) {
      if (!updates[field] && value) {
        updates[field] = value;
        confidence[field] = confidence[field] || 'high';
      }
    }
  }

  return {
    ...result,
    formUpdates: Object.keys(updates).length > 0 ? updates : null,
    fieldConfidence: confidence,
  };
}

export async function runPipeline(session, userInput) {
  const inputLower = userInput.toLowerCase();
  const externalSections = [];
  let scheduleData = null;
  let weatherData = null;

  const wantsSchedule = includesAny(inputLower, [
    /shift/,
    /schedule/,
    /roster/,
    /who'?s working/,
    /who is working/,
    /next shift/,
  ]);
  const wantsStatus = includesAny(inputLower, [/status/, /overdue/, /compliance/, /acr/, /cert/, /license/, /vaccin/]);
  const wantsWeather = includesAny(inputLower, [/weather/, /temperature/, /forecast/, /rain/, /snow/, /wind/]);

  if (wantsSchedule) {
    scheduleData = await getScheduleData();
    externalSections.push(`## SHIFT SCHEDULE DATA\n${JSON.stringify(scheduleData).slice(0, 9000)}`);
  }

  if (wantsStatus) {
    externalSections.push(`## PARAMEDIC STATUS DATA\n${JSON.stringify(STATUS_DATA)}`);
  }

  if (wantsWeather) {
    weatherData = await getWeatherData();
    externalSections.push(`## WEATHER DATA\n${JSON.stringify(weatherData)}`);
  }

  const systemPrompt = `${buildSystemPrompt(session)}\n\n${externalSections.join('\n\n')}`;

  const conversation = (session.messages || [])
    .slice(-20)
    .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '') }));

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversation,
    { role: 'user', content: buildUserPrompt(userInput, session) },
  ];

  let normalized;
  try {
    const raw = await callLLM(messages, {
      model: config.OR_MODEL_FAST,
      temperature: 0.2,
      maxTokens: 2048,
    });
    normalized = normalizeResponse(raw);
  } catch (err) {
    console.error('[pipeline] LLM failure, switching to local fallback:', err.message);
    normalized = localFallbackPipeline(session, userInput, {
      scheduleData,
      weatherData,
      statusData: STATUS_DATA,
    });
  }

  const withProfile = autoFillWithProfile(normalized, session);

  if (withProfile.formType && !FORM_SCHEMAS[withProfile.formType]) {
    return {
      ...withProfile,
      formType: null,
      formUpdates: null,
      fieldConfidence: {},
    };
  }

  return withProfile;
}

export function getStatusData() {
  return STATUS_DATA;
}
