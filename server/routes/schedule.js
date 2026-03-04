import express from 'express';
import { getScheduleData } from '../services/scraper.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const data = await getScheduleData();
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Failed to fetch schedule data', detail: err.message });
  }
});

export default router;
