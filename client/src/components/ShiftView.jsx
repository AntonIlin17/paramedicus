import { useMemo, useState } from 'react';

function statusColor(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('active') || normalized.includes('on')) return 'bg-blue-100 text-blue-700';
  if (normalized.includes('complete')) return 'bg-green-100 text-green-700';
  if (normalized.includes('scheduled') || normalized.includes('stand')) return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

export default function ShiftView({ data }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const rows = data?.tables?.[0]?.rows || [];
  const header = rows[0] || [];
  const bodyRows = rows.slice(1);
  const statusIndex = Math.max(
    0,
    header.findIndex((col) => String(col || '').toLowerCase().includes('status')),
  );
  const statusValues = Array.from(
    new Set(
      bodyRows
        .map((row) => String(row[statusIndex] || '').trim())
        .filter(Boolean),
    ),
  );

  const filtered = useMemo(() => {
    return bodyRows.filter((row) => {
      const joined = row.join(' ').toLowerCase();
      const matchesQuery = !query || joined.includes(query.toLowerCase());
      const status = String(row[statusIndex] || '').toLowerCase();
      const matchesFilter = filter === 'all' || status === filter.toLowerCase();
      return matchesQuery && matchesFilter;
    });
  }, [bodyRows, filter, query, statusIndex]);

  if (!data) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-white p-4 text-sm text-[var(--text-secondary)]">
        Ask “Who is on shift tonight?” to load schedule data.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-[var(--text)]">Online Paramedic Shift Report</h3>
          <div className="text-xs text-[var(--text-secondary)]">EAI Ambulance Service</div>
        </div>
        <div className="inline-flex items-center gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, unit, or partner..."
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm"
          />
          <select className="rounded-lg border border-[var(--border)] px-2 py-1.5 text-sm" value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">All</option>
            {statusValues.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="text-xs text-[var(--text-secondary)]">Source: {data.source} • Fetched: {new Date(data.fetchedAt).toLocaleString()}</div>

      <div className="overflow-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {header.map((col) => (
                <th key={col} className="px-3 py-2 text-left">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, idx) => (
              // eslint-disable-next-line react/no-array-index-key
              <tr key={idx} className="border-t border-[var(--border)]">
                {row.map((cell, cellIdx) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <td key={cellIdx} className="px-3 py-2">
                    {cellIdx === statusIndex ? (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor(cell)}`}>{cell}</span>
                    ) : (
                      cell || '—'
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
