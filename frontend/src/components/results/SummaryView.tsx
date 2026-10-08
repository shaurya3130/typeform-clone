import { Star } from "lucide-react";
import { TypeChip } from "@/components/builder/TypeChip";
import type { FormStats, QuestionSummary } from "@/lib/types";

function Bars({ s }: { s: QuestionSummary }) {
  const total = s.answered || 1;
  const max = Math.max(...(s.options ?? []).map((o) => o.count), 1);
  return (
    <div className="flex flex-col gap-2">
      {s.options!.map((o) => {
        const pct = Math.round((o.count / total) * 100);
        return (
          <div key={o.label} className="grid grid-cols-[minmax(80px,180px)_1fr_auto] items-center gap-3 text-sm">
            <span className="truncate">{o.label}</span>
            <div className="h-7 overflow-hidden rounded bg-[#f1f1f1]">
              <div
                className="h-full rounded transition-[width] duration-700"
                style={{ width: `${(o.count / max) * 100}%`, background: o.count === max && o.count > 0 ? "#191919" : "#bdbdbd" }}
              />
            </div>
            <span className="w-20 text-right tabular-nums text-ink-soft">
              <b className="text-ink">{pct}%</b> · {o.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md bg-[#f6f6f6] px-4 py-3">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="mt-0.5 text-xl font-semibold">{value ?? "–"}</p>
    </div>
  );
}

export default function SummaryView({ stats }: { stats: FormStats }) {
  if (stats.questions.length === 0) {
    return <p className="rounded-lg border border-line bg-white p-8 text-center text-ink-soft">This form has no questions yet.</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      {stats.questions.map((s, i) => (
        <section key={s.question_id} className="rounded-lg border border-line bg-white p-5">
          <div className="mb-1 flex items-start gap-2.5">
            <TypeChip type={s.type} number={i + 1} />
            <h3 className="font-medium leading-6">{s.title || "Untitled question"}</h3>
          </div>
          <p className="mb-4 text-xs text-ink-soft">
            {s.answered} out of {s.answered + s.skipped} people answered this question
          </p>

          {s.answered === 0 ? (
            <p className="text-sm text-ink-soft">No answers yet.</p>
          ) : s.type === "rating" ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="text-3xl font-semibold">{s.average}</span>
                <Star size={22} fill="#191919" />
                <span className="text-sm text-ink-soft">average rating</span>
              </div>
              <Bars s={s} />
            </div>
          ) : s.options ? (
            <Bars s={s} />
          ) : s.type === "number" ? (
            <div className="grid grid-cols-3 gap-3">
              <Tile label="Average" value={s.average} />
              <Tile label="Minimum" value={s.min} />
              <Tile label="Maximum" value={s.max} />
            </div>
          ) : (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-soft">Latest answers</p>
              <ul className="divide-y divide-line rounded-md border border-line">
                {(s.latest ?? []).map((a, j) => (
                  <li key={j} className="whitespace-pre-line px-3 py-2 text-sm">
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
