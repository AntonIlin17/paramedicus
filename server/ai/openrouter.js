import { config } from '../config.js';

function stripJSONFences(text) {
  return String(text || '').replace(/```json\n?|```/g, '').trim();
}

function normalizeGeminiModel(model) {
  return String(model || 'gemini-2.5-flash').replace(/^google\//, '');
}

function toGeminiPayload(messages, { temperature, maxTokens }) {
  const systemText = messages
    .filter((m) => m.role === 'system')
    .map((m) => String(m.content || ''))
    .join('\n\n');

  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content || '') }],
    }));

  const safeContents =
    contents.length > 0
      ? contents
      : [
          {
            role: 'user',
            parts: [{ text: 'Respond with valid JSON.' }],
          },
        ];

  const payload = {
    contents: safeContents,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      responseMimeType: 'application/json',
    },
  };

  if (systemText) {
    payload.systemInstruction = {
      parts: [{ text: systemText }],
    };
  }

  return payload;
}

async function requestOpenRouter(messages, { model, temperature, maxTokens, signal }) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://medicos.app',
      'X-Title': 'MedicOS Paramedic Assistant',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    }),
    signal,
  });

  const requestId =
    response.headers.get('x-request-id') || response.headers.get('request-id') || response.headers.get('cf-ray');
  if (requestId) {
    console.log(`[openrouter] request id: ${requestId}`);
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Empty OpenRouter response');
  }

  return content;
}

async function requestGemini(messages, { model, temperature, maxTokens, signal }) {
  const geminiModel = normalizeGeminiModel(model);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${config.GOOGLE_API_KEY}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(toGeminiPayload(messages, { temperature, maxTokens })),
    signal,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const content =
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text || '')
      .join('\n')
      .trim() || '';

  if (!content) {
    throw new Error('Empty Gemini response');
  }

  return content;
}

function fallbackText(content) {
  return {
    intent: 'general_chat',
    response_text: content,
    form_type: null,
    form_updates: null,
    field_confidence: {},
    validation_warnings: [],
    suggested_actions: [],
    followup_question: null,
  };
}

export async function callLLM(messages, options = {}) {
  let mutableMessages = [...messages];
  const {
    model = config.OR_MODEL_FAST,
    temperature = 0.2,
    maxTokens = 2048,
    retries = 2,
    timeoutMs = 15000,
  } = options;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const content = config.GOOGLE_API_KEY
        ? await requestGemini(mutableMessages, {
            model,
            temperature,
            maxTokens,
            signal: controller.signal,
          })
        : await requestOpenRouter(mutableMessages, {
            model,
            temperature,
            maxTokens,
            signal: controller.signal,
          });

      clearTimeout(timer);

      try {
        return JSON.parse(stripJSONFences(content));
      } catch {
        if (attempt < retries) {
          mutableMessages = [
            ...mutableMessages,
            { role: 'assistant', content },
            {
              role: 'user',
              content:
                'Your previous response was not valid JSON. Please respond with ONLY valid JSON matching the required schema. No markdown, no backticks, no preamble.',
            },
          ];
          continue;
        }
        return fallbackText(content);
      }
    } catch (err) {
      if (attempt === retries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  throw new Error('Unexpected LLM execution state');
}
