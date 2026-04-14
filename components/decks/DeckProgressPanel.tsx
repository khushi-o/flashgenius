import { formatStableDateTime } from "@/lib/datetime/format-stable";
import type { DeckCardStats } from "@/lib/library/card-buckets";

export type DeckProgressPanelProps = {
  stats: DeckCardStats;
  masteryPercent: number;
  dueNow: number;
  streakDays: number;
  reviewsLast7Days: number;
  lastStudiedAt: string | null;
};

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  const s = formatStableDateTime(iso);
  return s || "—";
}

export function DeckProgressPanel({
  stats,
  masteryPercent: mastery,
  dueNow,
  streakDays,
  reviewsLast7Days,
  lastStudiedAt,
}: DeckProgressPanelProps) {
  const total = stats.new + stats.learning + stats.mature;
  const r = 40;
  const c = 2 * Math.PI * r;
  const dash = total ? (mastery / 100) * c : 0;

  return (
    <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/35 p-6">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col items-center gap-3">
          <div className="relative h-[108px] w-[108px]">
            <svg className="-rotate-90" viewBox="0 0 100 100" aria-hidden>
              <circle
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke="rgb(39 39 42)"
                strokeWidth="10"
              />
              <circle
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke="rgb(52 211 153)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${c}`}
              />
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold text-white">{mastery}%</span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                mastery
              </span>
            </div>
          </div>
          <p className="max-w-xs text-center text-xs text-zinc-500 sm:text-left">
            Mature cards as a share of all scheduled cards in this deck.
          </p>
        </div>

        <div className="w-full flex-1 space-y-4 sm:max-w-md">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Buckets</p>
            <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-zinc-800">
              {total ? (
                <>
                  <span
                    className="h-full bg-orange-500/90"
                    style={{ width: `${(stats.new / total) * 100}%` }}
                  />
                  <span
                    className="h-full bg-amber-400/90"
                    style={{ width: `${(stats.learning / total) * 100}%` }}
                  />
                  <span
                    className="h-full bg-emerald-500/90"
                    style={{ width: `${(stats.mature / total) * 100}%` }}
                  />
                </>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-400">
              <span>
                <span className="font-semibold text-orange-300">{stats.new}</span> new
              </span>
              <span>
                <span className="font-semibold text-amber-200/90">{stats.learning}</span> learning
              </span>
              <span>
                <span className="font-semibold text-emerald-300">{stats.mature}</span> mature
              </span>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-4 py-3">
              <dt className="text-xs font-medium text-zinc-500">Due now</dt>
              <dd className="mt-1 text-lg font-semibold text-amber-200">{dueNow}</dd>
            </div>
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-4 py-3">
              <dt className="text-xs font-medium text-zinc-500">Study streak</dt>
              <dd className="mt-1 text-lg font-semibold text-lime-200">{streakDays} days</dd>
              <p className="mt-1 text-[11px] leading-snug text-zinc-600">
                Consecutive UTC days with a review, from your latest session.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-4 py-3">
              <dt className="text-xs font-medium text-zinc-500">Reviews (7 days)</dt>
              <dd className="mt-1 text-lg font-semibold text-zinc-100">{reviewsLast7Days}</dd>
            </div>
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-4 py-3">
              <dt className="text-xs font-medium text-zinc-500">Last studied</dt>
              <dd className="mt-1 text-sm font-medium text-zinc-200">{formatWhen(lastStudiedAt)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
