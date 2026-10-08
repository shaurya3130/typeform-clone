"use client";

import Modal from "@/components/ui/Modal";
import { COMING_SOON_TYPES, QUESTION_TYPES } from "@/lib/questionTypes";
import type { QuestionType } from "@/lib/types";
import { TypeChip } from "./TypeChip";

export default function AddQuestionModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (t: QuestionType) => void;
}) {
  const groups = [...new Set(QUESTION_TYPES.map((t) => t.group))];
  return (
    <Modal open={open} onClose={onClose} title="Add form elements" width={640}>
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
        {groups.map((g) => (
          <div key={g}>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">{g}</p>
            {QUESTION_TYPES.filter((t) => t.group === g).map((t) => (
              <button
                key={t.type}
                onClick={() => onPick(t.type)}
                className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-black/[0.04]"
              >
                <TypeChip type={t.type} />
                <span>
                  <span className="block text-sm font-medium">{t.label}</span>
                  <span className="block text-xs text-ink-soft">{t.description}</span>
                </span>
              </button>
            ))}
          </div>
        ))}
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">Coming soon</p>
          <div className="flex flex-wrap gap-1.5">
            {COMING_SOON_TYPES.map((t) => (
              <span key={t} className="cursor-not-allowed rounded border border-dashed border-line px-2 py-1 text-xs text-ink-soft">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
