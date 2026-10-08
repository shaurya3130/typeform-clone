import { TYPE_META } from "@/lib/questionTypes";
import type { QuestionType } from "@/lib/types";

/** Color-coded type badge, optionally with the question number (as in Typeform's sidebar). */
export function TypeChip({ type, number }: { type: QuestionType; number?: number }) {
  const meta = TYPE_META[type];
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex h-6 flex-none items-center gap-1 rounded px-1.5 text-[11px] font-semibold text-ink"
      style={{ background: meta.color }}
    >
      <Icon size={13} strokeWidth={2.2} />
      {number !== undefined && <span>{number}</span>}
    </span>
  );
}
