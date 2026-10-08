"use client";

/**
 * Answer inputs for every question type. Shared by the public respondent flow
 * and the builder's live preview (with `preview` = true they render but are inert).
 */
import { Check, ChevronDown, Star, X } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CHOICE_LETTERS } from "@/lib/questionTypes";
import type { AnswerValue, Question } from "@/lib/types";

export interface AnswerProps {
  question: Question;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
  /** Called when an answer should auto-advance (choice click, rating click). */
  onPick?: (v: AnswerValue) => void;
  preview?: boolean;
  autoFocus?: boolean;
  /** Index of a choice that should blink (keyboard selection feedback). */
  blink?: number | null;
}

function TextAnswer({ question, value, onChange, preview, autoFocus }: AnswerProps) {
  const isNumber = question.type === "number";
  const placeholder =
    question.type === "email" ? "name@example.com" : isNumber ? "Type your answer here..." : "Type your answer here...";
  return (
    <input
      className="tf-input"
      type={question.type === "email" ? "email" : "text"}
      inputMode={isNumber ? "decimal" : question.type === "email" ? "email" : "text"}
      placeholder={placeholder}
      value={value === null || value === undefined ? "" : String(value)}
      readOnly={preview}
      tabIndex={preview ? -1 : 0}
      autoFocus={autoFocus}
      autoComplete={question.type === "email" ? "email" : "off"}
      onChange={(e) => {
        const v = e.target.value;
        if (isNumber && v !== "" && !/^-?\d*\.?\d*$/.test(v)) return; // digits only, like Typeform
        onChange(v);
      }}
    />
  );
}

function LongTextAnswer({ value, onChange, preview, autoFocus }: AnswerProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <div>
      <textarea
        ref={ref}
        rows={1}
        className="tf-input"
        placeholder="Type your answer here..."
        value={(value as string) ?? ""}
        readOnly={preview}
        tabIndex={preview ? -1 : 0}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="tf-hint mt-2">
        <b>Shift ⇧</b> + <b>Enter ↵</b> to make a line break
      </p>
    </div>
  );
}

export function ChoiceButton({
  letter,
  label,
  selected,
  blink,
  onClick,
  preview,
}: {
  letter: string;
  label: React.ReactNode;
  selected: boolean;
  blink?: boolean;
  onClick?: () => void;
  preview?: boolean;
}) {
  return (
    <button
      type="button"
      className="tf-choice"
      data-selected={selected}
      data-blink={blink ? "true" : undefined}
      onClick={onClick}
      tabIndex={preview ? -1 : 0}
    >
      <span className="tf-key">{letter}</span>
      <span className="flex-1 break-words">{label}</span>
      {selected && <Check size={20} className="flex-none" />}
    </button>
  );
}

function MultipleChoiceAnswer({ question, value, onPick, preview, blink }: AnswerProps) {
  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      {question.choices.map((c, i) => (
        <ChoiceButton
          key={c.key}
          letter={CHOICE_LETTERS[i] ?? "?"}
          label={c.label}
          selected={value !== undefined && value !== null && Number(value) === c.id}
          blink={blink === i}
          preview={preview}
          onClick={() => !preview && onPick?.(c.id!)}
        />
      ))}
    </div>
  );
}

function YesNoAnswer({ value, onPick, preview, blink }: AnswerProps) {
  return (
    <div className="flex w-full max-w-[220px] flex-col gap-2">
      {(["yes", "no"] as const).map((v, i) => (
        <ChoiceButton
          key={v}
          letter={v === "yes" ? "Y" : "N"}
          label={v === "yes" ? "Yes" : "No"}
          selected={value === v}
          blink={blink === i}
          preview={preview}
          onClick={() => !preview && onPick?.(v)}
        />
      ))}
    </div>
  );
}

function RatingAnswer({ question, value, onPick, preview }: AnswerProps) {
  const scale = question.settings.scale ?? 5;
  const [hover, setHover] = useState<number | null>(null);
  const active = hover ?? (value ? Number(value) : 0);
  return (
    <div className="flex flex-wrap gap-1 sm:gap-2" onMouseLeave={() => setHover(null)}>
      {Array.from({ length: scale }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          tabIndex={preview ? -1 : 0}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onMouseEnter={() => !preview && setHover(n)}
          onClick={() => !preview && onPick?.(n)}
          className="flex flex-col items-center gap-1"
          style={{ color: "var(--tf-a)" }}
        >
          <Star
            className="h-9 w-9 transition-transform hover:scale-110 sm:h-11 sm:w-11"
            strokeWidth={1.2}
            fill={n <= active ? "currentColor" : "transparent"}
            fillOpacity={hover !== null && n <= active && !(value && n <= Number(value)) ? 0.45 : 1}
          />
          <span className="text-sm">{n}</span>
        </button>
      ))}
    </div>
  );
}

function DropdownAnswer({ question, value, onChange, preview, autoFocus }: AnswerProps) {
  const selected = question.choices.find((c) => c.id !== undefined && c.id === Number(value));
  const [query, setQuery] = useState(selected?.label ?? "");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => setQuery(selected?.label ?? ""), [selected?.label]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || (selected && query === selected.label)) return question.choices;
    return question.choices.filter((c) => c.label.toLowerCase().includes(q));
  }, [query, question.choices, selected]);

  const choose = (idx: number) => {
    const c = filtered[idx];
    if (!c) return;
    onChange(c.id!);
    setQuery(c.label);
    setOpen(false);
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          className="tf-input pr-16"
          placeholder="Type or select an option"
          value={query}
          readOnly={preview}
          tabIndex={preview ? -1 : 0}
          autoFocus={autoFocus}
          onFocus={() => !preview && setOpen(true)}
          onClick={() => !preview && setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(0);
            if (selected) onChange(null);
          }}
          onKeyDown={(e) => {
            if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
              setOpen(true);
              e.stopPropagation();
              e.preventDefault();
              return;
            }
            if (!open) return; // let Enter bubble to the runner -> OK
            if (e.key === "ArrowDown") setHighlight((h) => Math.min(h + 1, filtered.length - 1));
            else if (e.key === "ArrowUp") setHighlight((h) => Math.max(h - 1, 0));
            else if (e.key === "Enter") choose(highlight);
            else if (e.key === "Escape") setOpen(false);
            else return;
            e.preventDefault();
            e.stopPropagation();
          }}
        />
        <div className="absolute right-0 top-1 flex items-center gap-1" style={{ color: "var(--tf-a)" }}>
          {selected && !preview && (
            <button
              type="button"
              aria-label="Clear"
              onClick={() => {
                onChange(null);
                setQuery("");
              }}
            >
              <X size={22} />
            </button>
          )}
          <button type="button" tabIndex={-1} aria-label="Toggle options" onClick={() => !preview && setOpen((o) => !o)}>
            <ChevronDown size={26} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>
      {open && !preview && (
        <div ref={listRef} className="tf-list absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded p-2">
          {filtered.length === 0 && <p className="tf-hint px-2 py-3">No suggestions found</p>}
          <div className="flex flex-col gap-1.5">
            {filtered.map((c, i) => (
              <button
                key={c.key}
                type="button"
                className="tf-choice"
                data-selected={c.id === selected?.id || i === highlight}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
              >
                <span className="flex-1">{c.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuestionAnswer(props: AnswerProps) {
  switch (props.question.type) {
    case "short_text":
    case "email":
    case "number":
      return <TextAnswer {...props} />;
    case "long_text":
      return <LongTextAnswer {...props} />;
    case "multiple_choice":
      return <MultipleChoiceAnswer {...props} />;
    case "dropdown":
      return <DropdownAnswer {...props} />;
    case "yes_no":
      return <YesNoAnswer {...props} />;
    case "rating":
      return <RatingAnswer {...props} />;
  }
}
