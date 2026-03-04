import { config } from '../config.js';

export async function transcribeWithDeepgram(audioBuffer, mimeType = 'audio/webm') {
  if (!config.DEEPGRAM_API_KEY) {
    throw new Error('Deepgram is not configured');
  }

  const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2-medical&smart_format=true', {
    method: 'POST',
    headers: {
      Authorization: `Token ${config.DEEPGRAM_API_KEY}`,
      'Content-Type': mimeType,
    },
    body: audioBuffer,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Deepgram ${response.status}: ${text}`);
  }

  const data = await response.json();
  const transcript =
    data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';

  return {
    transcript,
    confidence: data?.results?.channels?.[0]?.alternatives?.[0]?.confidence ?? null,
    raw: data,
  };
}

export async function speakWithDeepgram(text, model = config.DEEPGRAM_TTS_MODEL) {
  if (!config.DEEPGRAM_API_KEY) {
    throw new Error('Deepgram is not configured');
  }

  const response = await fetch(`https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${config.DEEPGRAM_API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Deepgram TTS ${response.status}: ${body}`);
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  return {
    audioBuffer,
    mimeType: response.headers.get('content-type') || 'audio/mpeg',
    model,
  };
}
