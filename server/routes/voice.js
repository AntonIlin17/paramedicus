import express from 'express';
import { config } from '../config.js';
import { transcribeWithDeepgram, speakWithDeepgram } from '../services/stt.js';

const router = express.Router();

router.post('/transcribe', async (req, res) => {
  const { audioBase64, mimeType } = req.body || {};

  if (!audioBase64) {
    res.status(400).json({ error: 'audioBase64 is required' });
    return;
  }

  if (!config.DEEPGRAM_API_KEY) {
    res.status(400).json({ error: 'Deepgram is not enabled on this server' });
    return;
  }

  try {
    const buffer = Buffer.from(audioBase64, 'base64');
    const result = await transcribeWithDeepgram(buffer, mimeType || 'audio/webm');
    res.json({
      ok: true,
      transcript: result.transcript,
      confidence: result.confidence,
    });
  } catch (err) {
    res.status(500).json({ error: 'Deepgram transcription failed', detail: err.message });
  }
});

router.post('/tts', async (req, res) => {
  const { text, model } = req.body || {};

  if (!text || !String(text).trim()) {
    res.status(400).json({ error: 'text is required' });
    return;
  }

  if (!config.DEEPGRAM_API_KEY) {
    res.status(400).json({ error: 'Deepgram is not enabled on this server' });
    return;
  }

  try {
    const result = await speakWithDeepgram(String(text).trim(), model || config.DEEPGRAM_TTS_MODEL);
    res.json({
      ok: true,
      audioBase64: result.audioBuffer.toString('base64'),
      mimeType: result.mimeType,
      provider: 'deepgram',
      model: result.model,
    });
  } catch (err) {
    res.status(500).json({ error: 'Deepgram TTS failed', detail: err.message });
  }
});

export default router;
