export default function Leaderboard({ entries }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-lg font-semibold">Top 5 (24h Karma)</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {entries.length === 0 ? (
          <li className="text-slate-400">No karma yet.</li>
        ) : (
          entries.map((entry, index) => (
            <li
              key={entry.id}
              className="flex items-center justify-between rounded-md bg-slate-950/40 px-3 py-2"
            >
              <span>
                {index + 1}. {entry.username}
              </span>
              <span className="font-semibold text-emerald-300">
                {entry.karma} karma
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
