/**
 * DeviceList – Discovered Aura Pucks
 */
interface Device {
  id:         string;
  name:       string;
  ip_address: string | null;
  last_seen:  number | null;
  paired:     number;
}

interface Props {
  devices: Device[];
  onPair:  (id: string) => void;
}

function timeAgo(ts: number | null): string {
  if (!ts) return 'never';
  const secs = Math.floor(Date.now() / 1000) - ts;
  if (secs < 60)  return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

export default function DeviceList({ devices, onPair }: Props) {
  return (
    <section className="rounded-xl bg-gray-900 p-4 flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Discovered Pucks</h2>
      {devices.length === 0 && (
        <p className="text-gray-500 text-sm">No pucks detected yet.</p>
      )}
      <ul className="flex flex-col gap-2">
        {devices.map(d => (
          <li key={d.id} className="flex items-center gap-3 bg-gray-800 rounded-lg px-3 py-2 text-sm">
            <span className={`w-2 h-2 rounded-full ${d.paired ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <div className="flex-1">
              <p className="font-medium">{d.name || d.id}</p>
              <p className="text-gray-500 text-xs">{d.ip_address ?? '–'} · last seen {timeAgo(d.last_seen)}</p>
            </div>
            {!d.paired && (
              <button
                onClick={() => onPair(d.id)}
                className="text-xs bg-indigo-600 hover:bg-indigo-500 px-2 py-1 rounded transition"
              >
                Pair
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
