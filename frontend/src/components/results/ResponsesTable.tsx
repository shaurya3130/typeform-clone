"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Trash, X } from "lucide-react";
import { useState } from "react";
import { TypeChip } from "@/components/builder/TypeChip";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { formatDateTime } from "@/lib/format";
import type { FormDetail, ResponseRow } from "@/lib/types";

const show = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === "" ? "" : v === "yes" ? "Yes" : v === "no" ? "No" : String(v);

export default function ResponsesTable({
  form,
  rows,
  onDelete,
}: {
  form: FormDetail;
  rows: ResponseRow[];
  onDelete: (id: number) => Promise<void>;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);
  const open = openIdx !== null ? rows[openIdx] : null;

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-white p-10 text-center">
        <p className="font-medium">No responses yet</p>
        <p className="mt-1 text-sm text-ink-soft">Share your form to start collecting answers.</p>
      </div>
    );
  }

  const answerFor = (r: ResponseRow, qid: number) => r.answers.find((a) => a.question_id === qid)?.value;
  // Answers to questions that were later deleted still show in the detail view.
  const orphanAnswers = (r: ResponseRow) => r.answers.filter((a) => !form.questions.some((q) => q.id === a.question_id));

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-[#fafafa] text-xs text-ink-soft">
              <th className="whitespace-nowrap px-4 py-2.5 font-medium">Submitted</th>
              {form.questions.map((q) => (
                <th key={q.id} className="max-w-[220px] truncate px-4 py-2.5 font-medium" title={q.title}>
                  {q.title || "Untitled"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} onClick={() => setOpenIdx(i)} className="cursor-pointer border-b border-line last:border-0 hover:bg-[#f7f7f7]">
                <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{formatDateTime(r.submitted_at)}</td>
                {form.questions.map((q) => (
                  <td key={q.id} className="max-w-[220px] truncate px-4 py-3">
                    {show(answerFor(r, q.id))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Individual response drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpenIdx(null)}
            />
            <motion.aside
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.22 }}
            >
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <div>
                  <p className="font-medium">Response {rows.length - openIdx!}</p>
                  <p className="text-xs text-ink-soft">{formatDateTime(open.submitted_at)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    aria-label="Previous response"
                    disabled={openIdx === 0}
                    onClick={() => setOpenIdx((i) => i! - 1)}
                    className="rounded p-1.5 hover:bg-black/5 disabled:opacity-30"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    aria-label="Next response"
                    disabled={openIdx === rows.length - 1}
                    onClick={() => setOpenIdx((i) => i! + 1)}
                    className="rounded p-1.5 hover:bg-black/5 disabled:opacity-30"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <button aria-label="Close" onClick={() => setOpenIdx(null)} className="rounded p-1.5 hover:bg-black/5">
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {form.questions.map((q, i) => {
                  const v = show(answerFor(open, q.id));
                  return (
                    <div key={q.id} className="border-b border-line py-3.5 last:border-0">
                      <div className="mb-1.5 flex items-start gap-2">
                        <TypeChip type={q.type} number={i + 1} />
                        <p className="text-sm font-medium leading-6">{q.title || "Untitled"}</p>
                      </div>
                      <p className={`whitespace-pre-line text-[15px] ${v ? "" : "italic text-ink-soft"}`}>{v || "No answer"}</p>
                    </div>
                  );
                })}
                {orphanAnswers(open).map((a, i) => (
                  <div key={i} className="border-b border-line py-3.5 opacity-70">
                    <p className="mb-1 text-sm font-medium">
                      {a.question_title} <span className="text-xs text-ink-soft">(deleted question)</span>
                    </p>
                    <p className="text-[15px]">{show(a.value)}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-line px-5 py-3">
                <Button variant="secondary" className="text-[#c4122f]" onClick={() => setConfirm(true)}>
                  <Trash size={14} /> Delete response
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Delete this response?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (!open) return;
                setConfirm(false);
                setOpenIdx(null);
                await onDelete(open.id);
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">This permanently removes the response and its answers.</p>
      </Modal>
    </>
  );
}
