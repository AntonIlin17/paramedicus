import express from 'express';
import { getStatusData } from '../ai/pipeline.js';

const router = express.Router();

router.get('/', (req, res) => {
  const medicNumber = req.query.medicNumber;
  const data = getStatusData();
  const codes = data.codes || data.referenceGuide || {};
  const baseItems = Array.isArray(data.items) ? data.items : [];
  const mappedItems = baseItems.map((item) => ({
    code: item.code || item.item || '',
    type: item.type || '',
    description: item.description || item.desc || '',
    status: item.status || 'GOOD',
    issueCount: item.issueCount ?? item.issues ?? 0,
    notes: item.notes || '',
  }));
  const summary = data.summary || {};

  if (medicNumber) {
    const people = Array.isArray(data.paramedics) ? data.paramedics : [];
    const person = people.find((p) => p.medicNumber === String(medicNumber));
    const personalized =
      person ||
      (mappedItems.length > 0
        ? {
            medicNumber: String(medicNumber),
            name: `Medic ${medicNumber}`,
            items: mappedItems,
          }
        : null);

    res.json({
      ok: true,
      summary,
      codes,
      criticalActions: data.criticalActions,
      personalized,
    });
    return;
  }

  res.json({
    ok: true,
    summary,
    codes,
    criticalActions: data.criticalActions || [],
    items: mappedItems,
    paramedics: Array.isArray(data.paramedics) ? data.paramedics : [],
  });
});

export default router;
