"use client";

/**
 * Center panel: a live, themed preview of the selected item that you can edit
 * inline (title, description, choices, welcome/thank-you text) — like Typeform.
 */
import { ArrowRight, Check, ChevronDown, CornerDownLeft, Plus, X } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import QuestionAnswer from "@/components/runner/answers";
import { newKey } from "@/lib/api";
import { CHOICE_LETTERS } from "@/lib/questionTypes";
import { themeVars } from "@/lib/theme";
import type { Choice, Question } from "@/lib/types";
import { useFormEditor } from "./FormEditorContext";
import type { Selection } from "./QuestionList";

function AutoTextarea({
  value,
  onChange,
  className,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  className: string;
  placeholder: string;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      aria-label={ariaLabel}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`block w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-current placeholder:opacity-40 ${className}`}
    />
  );
}

function ChoiceEditor({ q }: { q: Question }) {
  const { updateQuestion } = useFormEditor();
  const set = (choices: Choice[]) => updateQuestion(q.id, { choices });

  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      {q.type === "dropdown" && (
        <div className="tf-input mb-2 flex items-center justify-between !text-[22px] opacity-60">
          Type or select an option <ChevronDown size={24} />
        </div>
      )}
      {q.choices.map((c, i) => (
        <div key={c.key} className="tf-choice group !cursor-text">
          <span className="tf-key">{q.type === "dropdown" ? i + 1 : CHOICE_LETTERS[i]}</span>
          <input
            aria-label={`Choice ${i + 1}`}
            value={c.label}
            placeholder={`Choice ${i + 1}`}
            onChange={(e) => set(q.choices.map((x) => (x.key === c.key ? { ...x, label: e.target.value } : x)))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const next = [...q.choices];
                next.splice(i + 1, 0, { key: newKey(), label: "" });
                set(next);
                setTimeout(() => {
                  const inputs = document.querySelectorAll<HTMLInputElement>("[data-choice-input] input");
                  inputs[i + 1]?.focus();
                }, 0);
              }
            }}
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:opacity-50"
          />
          {q.choices.length > 1 && (
            <button
              aria-label="Remove choice"
              onClick={() => set(q.choices.filter((x) => x.key !== c.key))}
              className="opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X size={18} />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={() => set([...q.choices, { key: newKey(), label: `Choice ${q.choices.length + 1}` }])}
        className="mt-1 inline-flex items-center gap-1 self-start text-[15px] underline-offset-2 hover:underline"
        style={{ color: "var(--tf-a)" }}
      >
        <Plus size={16} /> Add choice
      </button>
    </div>
  );
}

function QuestionCanvas({ q, index }: { q: Question; index: number }) {
  const { updateQuestion } = useFormEditor();
  const isChoice = q.type === "multiple_choice" || q.type === "dropdown";
  return (
    <div className="w-full max-w-[640px]">
      <div className="flex items-start gap-2.5">
        <span className="tf-qnum mt-[7px]">
          {index + 1} <ArrowRight size={14} strokeWidth={2.5} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start">
            <AutoTextarea
              ariaLabel="Question title"
              value={q.title}
              placeholder="Your question here."
              onChange={(title) => updateQuestion(q.id, { title })}
              className="tf-title"
            />
            {q.required && <span className="tf-title ml-1">*</span>}
          </div>
          <AutoTextarea
            ariaLabel="Question description"
            value={q.description}
            placeholder="Description (optional)"
            onChange={(description) => updateQuestion(q.id, { description })}
            className="tf-desc"
          />
          <div className="mt-7" data-choice-input>
            {isChoice ? (
              <ChoiceEditor q={q} />
            ) : (
              <div className="pointer-events-none">
                <QuestionAnswer question={q} value={undefined} onChange={() => {}} preview />
              </div>
            )}
          </div>
          <div className="mt-6 flex items-center gap-3">
            <span className="tf-btn">
              OK <Check size={18} strokeWidth={3} />
            </span>
            <span className="tf-hint inline-flex items-center gap-1">
              press <b>Enter</b> <CornerDownLeft size={12} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function WelcomeCanvas() {
  const { form, updateForm } = useFormEditor();
  return (
    <div className="w-full max-w-[600px] text-center">
      <AutoTextarea
        ariaLabel="Welcome title"
        value={form.welcome_title}
        placeholder="Say hi! Recall a warm welcome."
        onChange={(welcome_title) => updateForm({ welcome_title })}
        className="tf-title text-center !text-[32px] !leading-[42px]"
      />
      <AutoTextarea
        ariaLabel="Welcome description"
        value={form.welcome_description}
        placeholder="Description (optional)"
        onChange={(welcome_description) => updateForm({ welcome_description })}
        className="tf-desc text-center"
      />
      <input
        aria-label="Button text"
        value={form.welcome_button}
        onChange={(e) => updateForm({ welcome_button: e.target.value })}
        className="tf-btn mt-8 text-center outline-none"
        style={{ width: `${Math.max(5, form.welcome_button.length + 3)}ch` }}
      />
    </div>
  );
}

function EndingCanvas() {
  const { form, updateForm } = useFormEditor();
  return (
    <div className="w-full max-w-[600px] text-center">
      <div className="tf-btn mx-auto mb-6 !flex h-14 w-14 items-center justify-center !rounded-full !p-0">
        <Check size={28} strokeWidth={3} />
      </div>
      <AutoTextarea
        ariaLabel="Thank you title"
        value={form.thank_you_title}
        placeholder="Thanks for completing this typeform"
        onChange={(thank_you_title) => updateForm({ thank_you_title })}
        className="tf-title text-center !text-[28px] !leading-[38px]"
      />
      <AutoTextarea
        ariaLabel="Thank you description"
        value={form.thank_you_description}
        placeholder="Description (optional)"
        onChange={(thank_you_description) => updateForm({ thank_you_description })}
        className="tf-desc text-center"
      />
    </div>
  );
}

export default function Canvas({ selection, onAdd }: { selection: Selection | null; onAdd: () => void }) {
  const { form } = useFormEditor();
  const index = selection?.kind === "question" ? form.questions.findIndex((q) => q.id === selection.id) : -1;
  const q = index >= 0 ? form.questions[index] : null;

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-canvas p-4 lg:p-6">
      <div
        className="tf-root relative flex flex-1 items-center justify-center overflow-y-auto rounded-xl px-8 py-12 shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
        style={themeVars(form.theme)}
      >
        {selection?.kind === "welcome" ? (
          <WelcomeCanvas />
        ) : selection?.kind === "ending" ? (
          <EndingCanvas />
        ) : q ? (
          <QuestionCanvas key={q.id} q={q} index={index} />
        ) : (
          <div className="text-center">
            <p className="tf-title mb-4">Let&apos;s build your typeform</p>
            <button className="tf-btn" onClick={onAdd}>
              <Plus size={18} /> Add a question
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
