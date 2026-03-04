import { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { getSchedule } from '../utils/api';
import LoadingDots from './LoadingDots';

export default function ScheduleView() {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadSchedule() {
      try {
        setLoading(true);
        const result = await getSchedule();
        setSchedule(result);
        setError(null);
      } catch (err) {
        console.error('[schedule] error:', err);
        setError(err.message || 'Failed to load schedule');
      } finally {
        setLoading(false);
      }
    }

    loadSchedule();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
        <LoadingDots />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-lg border border-[var(--border)] bg-red-50 p-6">
        <div className="text-center">
          <Calendar className="mx-auto mb-3 h-8 w-8 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="text-center text-[var(--text-secondary)]">No schedule data available</p>
      </div>
    );
  }

  const { shifts = [], fetchedAt, source } = schedule;

  return (
    <div className="flex flex-1 flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-5 w-5 text-[var(--primary)]" />
          <h2 className="text-lg font-semibold text-[var(--text)]">Schedule</h2>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-[var(--text-secondary)]">
            {fetchedAt ? `Updated: ${new Date(fetchedAt).toLocaleString()}` : 'Not updated'}
          </p>
          {source && (
            <p className="text-xs text-[var(--text-secondary)]">
              Source: {source === 'live' ? '🟢 Live' : '⚠️ Fallback'}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {shifts.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <p className="text-[var(--text-secondary)]">No shifts scheduled</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shifts.map((shift, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-[var(--border)] bg-white p-4 space-y-2 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-[var(--text)]">
                      {shift.date || 'No date'}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {shift.startTime} - {shift.endTime || 'TBD'}
                    </p>
                  </div>
                  {shift.station && (
                    <div className="rounded-full bg-blue-100 px-3 py-1">
                      <p className="text-xs font-semibold text-blue-700">
                        {shift.station}
                      </p>
                    </div>
                  )}
                </div>

                {shift.notes && (
                  <p className="text-xs text-[var(--text-secondary)] border-t border-[var(--border)] pt-2">
                    {shift.notes}
                  </p>
                )}

                {shift.tasks && shift.tasks.length > 0 && (
                  <div className="space-y-1 border-t border-[var(--border)] pt-2">
                    <p className="text-xs font-semibold text-[var(--text)] uppercase">Tasks</p>
                    <ul className="space-y-0.5">
                      {shift.tasks.map((task, taskIdx) => (
                        <li
                          key={taskIdx}
                          className="text-xs text-[var(--text-secondary)] flex items-center gap-2"
                        >
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
                          {task}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
