/**
 * Analytics – Physical usage heatmap
 * Shows which objects (tags) are used most, broken down by hour.
 */
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

interface HeatmapRow {
  tag_uid: string;
  hour:    number;
  count:   number;
}

interface Props {
  data:  HeatmapRow[];
  tags:  { uid: string; label: string }[];
}

const COLORS = [
  '#6366f1', '#22d3ee', '#34d399', '#f59e0b',
  '#f87171', '#a78bfa', '#38bdf8',
];

export default function Analytics({ data, tags }: Props) {
  // Aggregate per-tag totals
  const totals: Record<string, number> = {};
  data.forEach(row => {
    totals[row.tag_uid] = (totals[row.tag_uid] ?? 0) + row.count;
  });

  const tagTotals = Object.entries(totals)
    .map(([uid, count]) => ({
      uid,
      label: tags.find(t => t.uid === uid)?.label || uid,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // Build hourly breakdown for the top tag
  const topUid = tagTotals[0]?.uid;
  const hourly = Array.from({ length: 24 }, (_, h) => ({
    hour:  `${String(h).padStart(2, '0')}:00`,
    count: data.find(r => r.tag_uid === topUid && r.hour === h)?.count ?? 0,
  }));

  return (
    <section className="rounded-xl bg-gray-900 p-4 flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Analytics – Physical Usage</h2>

      {tagTotals.length === 0 ? (
        <p className="text-gray-500 text-sm">No usage data yet.</p>
      ) : (
        <>
          {/* Top-objects bar chart */}
          <div>
            <h3 className="text-sm text-gray-400 mb-2">Objects by Total Uses (7 days)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={tagTotals} margin={{ left: -20 }}>
                <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8 }}
                  cursor={{ fill: '#374151' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {tagTotals.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Hourly heatmap for top tag */}
          {topUid && (
            <div>
              <h3 className="text-sm text-gray-400 mb-2">
                Hourly Activity – {tagTotals[0].label}
              </h3>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={hourly} margin={{ left: -20 }}>
                  <XAxis dataKey="hour" tick={{ fill: '#9ca3af', fontSize: 9 }} interval={3} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8 }}
                    cursor={{ fill: '#374151' }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </section>
  );
}
