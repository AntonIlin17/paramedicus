function Badge({ status }) {
  const style = status === 'BAD' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200';
  return <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${style}`}>{status}</span>;
}

export default function StatusDashboard({ data }) {
  if (!data) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-white p-4 text-sm text-[var(--text-secondary)]">
        Ask “What is my status?” to load compliance highlights.
      </div>
    );
  }

  const person = data.personalized || data.paramedics?.[0] || null;
  const items = person?.items || data.items || [];
  const badItems = items.filter((item) => item.status === 'BAD');
  const revision = data.summary?.revision;
  const scopeLabel = person?.name || data.summary?.paramedic || 'ALL';

  return (
    <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-[var(--text)]">Paramedic Status Report</h3>
          <div className="text-xs text-[var(--text-secondary)]">EffectiveAI Paramedic Services — Paramedic: {scopeLabel}</div>
        </div>
        {revision ? <div className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-[var(--text-secondary)]">Rev {revision}</div> : null}
      </div>

      {badItems.length > 0 ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          Attention required: {badItems.length} item(s) require attention.
        </div>
      ) : (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">No urgent status flags detected.</div>
      )}

      <div className="overflow-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left">Item</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Issues</th>
              <th className="px-3 py-2 text-left">Notes</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={`${item.code || item.item}-${idx}`} className={`border-t border-[var(--border)] ${item.status === 'BAD' ? 'bg-red-50/30' : ''}`}>
                <td className="px-3 py-2 font-mono">{item.code || item.item}</td>
                <td className="px-3 py-2 font-semibold">{item.type || '—'}</td>
                <td className="px-3 py-2">{item.description || item.desc || '—'}</td>
                <td className="px-3 py-2">
                  <Badge status={item.status} />
                </td>
                <td className="px-3 py-2">{item.issueCount ?? item.issues ?? 0}</td>
                <td className="px-3 py-2">{item.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-[var(--text)]">Critical Actions</h4>
        <ul className="mt-1 list-disc pl-5 text-sm text-[var(--text-secondary)]">
          {(data.criticalActions || []).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
