import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import { OutcomeBadge, formatDate } from '../../components/shared/Helpers';
import useSocket from '../../hooks/useSocket';

const EVENT_CONFIG = {
  'submission:processed': { icon: '📥', label: 'New submission screened' },
  'appeal:filed': { icon: '⚖', label: 'Appeal filed' },
};

export default function AdminLiveFeed() {
  const [events, setEvents] = useState([]);

  const handleEvent = useCallback((event, data) => {
    setEvents((prev) => [
      { id: `${event}-${Date.now()}`, event, data, receivedAt: new Date() },
      ...prev,
    ].slice(0, 50));
  }, []);

  const { connected, error } = useSocket(handleEvent);

  return (
    <div>
      <PageHeader
        title="Live feed"
        subtitle="Real-time stream of submissions and appeals as they happen across the platform."
      />

      <div className="card mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${connected ? 'bg-cleared animate-pulse' : 'bg-mist-dark'}`} />
          <span className="text-sm text-ink/60 dark:text-paper/55">
            {connected ? 'Connected — listening for events' : error ? `Connection failed: ${error}` : 'Connecting…'}
          </span>
          {events.length > 0 && (
            <button className="btn-secondary btn-sm ml-auto" onClick={() => setEvents([])}>Clear feed</button>
          )}
        </div>
        {error && (
          <p className="text-xs text-rose-500 dark:text-rose-400 mt-2">
            Make sure the backend is running on port 5000, then refresh this page.
          </p>
        )}
      </div>

      <div className="card">
        {events.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📡</div>
            <h3 className="font-display font-semibold text-ink/80 dark:text-paper/80 mb-1">No events yet</h3>
            <p className="text-sm text-ink/45 dark:text-paper/40 max-w-md mx-auto">
              New submissions and appeals will appear here instantly. Open another tab and submit an image to see it in action.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {events.map((item) => {
              const config = EVENT_CONFIG[item.event] || { icon: '•', label: item.event };
              const { data } = item;

              return (
                <div
                  key={item.id}
                  className="flex items-start gap-4 px-4 py-3.5 rounded-xl bg-paper-dim dark:bg-white/5 border border-mist dark:border-dusk-line"
                >
                  <span className="text-xl shrink-0 mt-0.5">{config.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold text-ink dark:text-paper">{config.label}</span>
                      {data.overallOutcome && <OutcomeBadge outcome={data.overallOutcome} />}
                    </div>
                    <div className="text-xs text-ink/50 dark:text-paper/45">
                      {data.username && <span className="font-medium">{data.username}</span>}
                      {data.imageCount != null && <span> · {data.imageCount} image{data.imageCount !== 1 ? 's' : ''}</span>}
                      {data.processingTimeMs != null && <span> · processed in {data.processingTimeMs}ms</span>}
                      {data.submissionId && <span> · submission {String(data.submissionId).slice(-6)}</span>}
                    </div>
                    <div className="text-[11px] text-ink/35 dark:text-paper/30 mt-1">{formatDate(item.receivedAt)}</div>
                  </div>
                  {data._id && item.event === 'submission:processed' && (
                    <Link to={`/admin/submissions/${data._id}`} className="btn-secondary btn-sm shrink-0">Review</Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
