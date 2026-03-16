/**
 * LiveFeed – Real-time event stream panel
 */
import { useLiveFeed } from '../hooks/useLiveFeed';

const INTENT_COLORS: Record<string, string> = {
  Productive: 'bg-green-700 text-green-100',
  Relaxed:    'bg-blue-700 text-blue-100',
  Neutral:    'bg-yellow-700 text-yellow-100',
};

export default function LiveFeed() {
  const { events, connected } = useLiveFeed('/ws');

  return (
    <section className="rounded-xl bg-gray-900 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Live Feed</h2>
        <span className={`text-xs px-2 py-0.5 rounded-full ${connected ? 'bg-green-600' : 'bg-red-700'}`}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      <ul className="flex flex-col gap-2 overflow-y-auto max-h-96">
        {events.length === 0 && (
          <li className="text-gray-500 text-sm">Waiting for events…</li>
        )}
        {events.map((ev, i) => (
          <li key={i} className="rounded-lg bg-gray-800 px-3 py-2 text-sm flex items-start gap-2">
            <span className="shrink-0 text-indigo-400 font-mono">{ev.event ?? ev.type}</span>
            {ev.uid && <span className="text-gray-300 font-mono">{ev.uid}</span>}
            {ev.intent && (
              <span className={`ml-auto text-xs px-1.5 rounded ${INTENT_COLORS[ev.intent] ?? 'bg-gray-600'}`}>
                {ev.intent}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
