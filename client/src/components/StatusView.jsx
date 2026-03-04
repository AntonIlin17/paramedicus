import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Activity } from 'lucide-react';
import { getStatus } from '../utils/api';
import LoadingDots from './LoadingDots';

export default function StatusView({ medicNumber }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadStatus() {
      try {
        setLoading(true);
        const result = await getStatus(medicNumber);
        setStatus(result);
        setError(null);
      } catch (err) {
        console.error('[status] error:', err);
        setError(err.message || 'Failed to load status');
      } finally {
        setLoading(false);
      }
    }

    if (medicNumber) {
      loadStatus();
    }
  }, [medicNumber]);

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
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="text-center text-[var(--text-secondary)]">No status data available</p>
      </div>
    );
  }

  const { checklist = [], criticalActions = [] } = status;

  return (
    <div className="flex flex-1 flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="h-5 w-5 text-[var(--primary)]" />
          <h2 className="text-lg font-semibold text-[var(--text)]">Status Check</h2>
        </div>
        <p className="text-xs text-[var(--text-secondary)]">
          Last updated: {new Date().toLocaleTimeString()}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Critical Actions */}
        {criticalActions && criticalActions.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-red-600 uppercase">Critical Actions</h3>
            {criticalActions.map((action, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{action}</p>
              </div>
            ))}
          </div>
        )}

        {/* Checklist */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-[var(--text)] uppercase">Checklist</h3>
          {checklist.map((item, idx) => {
            const isGood = item.status === 'GOOD';
            const color = isGood ? 'green' : 'red';
            const bgColor = isGood ? 'bg-green-50' : 'bg-red-50';
            const borderColor = isGood ? 'border-green-200' : 'border-red-200';
            const textColor = isGood ? 'text-green-700' : 'text-red-700';
            const iconColor = isGood ? 'text-green-600' : 'text-red-600';

            return (
              <div
                key={idx}
                className={`rounded-lg border ${borderColor} ${bgColor} p-3 space-y-1`}
              >
                <div className="flex items-start gap-3">
                  <CheckCircle className={`h-4 w-4 mt-0.5 ${iconColor} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${textColor}`}>
                      {item.code} - {item.type}
                    </p>
                    <p className={`text-xs ${textColor} opacity-75`}>
                      {item.description}
                    </p>
                  </div>
                </div>
                {item.issueCount > 0 && (
                  <p className={`text-xs ${textColor} ml-7`}>
                    {item.issueCount} issue{item.issueCount !== 1 ? 's' : ''}
                    {item.notes && ` - ${item.notes}`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
