"use client";

/**
 * The Typeform respondent experience: one question per screen, animated
 * transitions, keyboard navigation, progress bar, client-side validation.
 * Used by the public /to/[slug] page and by the builder's Preview modal.
 */
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, ChevronDown, ChevronUp, CornerDownLeft, LoaderCircle, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { CHOICE_LETTERS } from "@/lib/questionTypes";
import { themeVars } from "@/lib/theme";
import type { Answers, AnswerValue, PublicForm, Question } from "@/lib/types";
import { isEmpty, validateAnswer } from "@/lib/validation";
import QuestionAnswer from "./answers";

const AUTO_ADVANCE_MS = 450;
const WELCOME = -1;

interface Props {
  form: PublicForm;
  /** Throws ApiError with fieldErrors to send the respondent back to a question. */
  onSubmit: (answers: Answers) => Promise<void>;
  /** Builder preview: fills the parent box instead of the whole viewport. */
  contained?: boolean;
}

const slide = {
  enter: (dir: number) => ({ y: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { y: 0, opacity: 1 },
  exit: (dir: number) => ({ y: dir > 0 ? -80 : 80, opacity: 0 }),
};

export default function FormRunner({ form, onSubmit, contained = false }: Props) {
  const questions = form.questions;
  const total = questions.length;
  const [step, setStep] = useState<number>(form.welcome_enabled ? WELCOME : 0);
  const [dir, setDir] = useState(1);
  const [answers, setAnswers] = useState<Answers>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [blink, setBlink] = useState<number | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q: Question | undefined = step >= 0 ? questions[step] : undefined;
  const isLast = step === total - 1;
  const answeredCount = questions.filter((x) => !isEmpty(answers[x.id])).length;

  const go = useCallback((to: number, direction: number) => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setDir(direction);
    setError(null);
    setBlink(null);
    setStep(to);
  }, []);

  const submit = useCallback(
    async (final: Answers) => {
      // Re-validate everything before sending (a respondent may have skipped ahead).
      const firstBad = questions.findIndex((x) => validateAnswer(x, final[x.id]));
      if (firstBad !== -1) {
        go(firstBad, -1);
        setError(validateAnswer(questions[firstBad], final[questions[firstBad].id]));
        return;
      }
      setSubmitting(true);
      try {
        await onSubmit(final);
        setDir(1);
        setDone(true);
      } catch (e) {
        const err = e as ApiError;
        const badId = Object.keys(err.fieldErrors ?? {})[0];
        const idx = badId ? questions.findIndex((x) => x.id === Number(badId)) : -1;
        if (idx !== -1) {
          go(idx, -1);
          setError(err.fieldErrors[badId]);
        } else {
          setError(err.message || "Something went wrong. Please try again.");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [questions, onSubmit, go],
  );

  /** Validate the current question and move forward (or submit on the last one). */
  const next = useCallback(
    (override?: { id: number; value: AnswerValue }) => {
      if (submitting || done) return;
      if (step === WELCOME) return go(0, 1);
      if (!q) return;
      const final = override ? { ...answers, [override.id]: override.value } : answers;
      const err = validateAnswer(q, final[q.id]);
      if (err) {
        setError(err);
        return;
      }
      if (isLast) void submit(final);
      else go(step + 1, 1);
    },
    [submitting, done, step, q, answers, isLast, go, submit],
  );

  const prev = useCallback(() => {
    if (step > 0) go(step - 1, -1);
  }, [step, go]);

  const setAnswer = useCallback(
    (v: AnswerValue) => {
      if (!q) return;
      setError(null);
      setAnswers((a) => ({ ...a, [q.id]: v }));
    },
    [q],
  );

  /** Choice / rating picks: select, blink, then auto-advance like Typeform. */
  const pick = useCallback(
    (v: AnswerValue, blinkIndex: number | null = null) => {
      if (!q) return;
      setAnswer(v);
      setBlink(blinkIndex);
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      advanceTimer.current = setTimeout(() => next({ id: q.id, value: v }), AUTO_ADVANCE_MS);
    },
    [q, setAnswer, next],
  );

  // Global keyboard handling
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || done) return;
      const el = e.target as HTMLElement;
      const typing = el.tagName === "INPUT" || el.tagName === "TEXTAREA";
      const inTextarea = el.tagName === "TEXTAREA";

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        next();
        return;
      }
      if (!inTextarea && e.key === "ArrowDown") {
        e.preventDefault();
        next();
        return;
      }
      if (!inTextarea && e.key === "ArrowUp") {
        e.preventDefault();
        prev();
        return;
      }
      if (typing || !q) return;

      const key = e.key.toUpperCase();
      if (q.type === "multiple_choice") {
        const i = CHOICE_LETTERS.indexOf(key);
        if (i >= 0 && i < q.choices.length) pick(q.choices[i].id!, i);
      } else if (q.type === "yes_no") {
        if (key === "Y") pick("yes", 0);
        if (key === "N") pick("no", 1);
      } else if (q.type === "rating" && /^[0-9]$/.test(e.key)) {
        const n = e.key === "0" ? 10 : Number(e.key);
        if (n <= (q.settings.scale ?? 5)) pick(n);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, pick, q, done]);

  useEffect(() => () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
  }, []);

  const progress = done ? 100 : total ? (answeredCount / total) * 100 : 0;
  const box = contained ? "absolute inset-0" : "fixed inset-0";
  const screenKey = done ? "thanks" : step === WELCOME ? "welcome" : `q-${q?.id}`;

  return (
    <div className={`tf-root ${box} overflow-hidden`} style={themeVars(form.theme)}>
      {/* Progress bar */}
      {!done && step !== WELCOME && (
        <div className="tf-progress-track absolute inset-x-0 top-0 z-10 h-1">
          <div className="tf-progress-fill h-full transition-[width] duration-500" style={{ width: `${progress}%` }} />
        </div>
      )}

      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <motion.div
          key={screenKey}
          custom={dir}
          variants={slide}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0 overflow-y-auto"
        >
          <div className="flex min-h-full items-center justify-center px-6 py-20 sm:px-10">
            {done ? (
              <EndScreen title={form.thank_you_title} description={form.thank_you_description} />
            ) : step === WELCOME ? (
              <WelcomeScreen form={form} onStart={() => next()} />
            ) : q ? (
              <div className="w-full max-w-[720px]">
                <div className="flex items-start gap-2.5">
                  <span className="tf-qnum mt-[7px]">
                    {step + 1} <ArrowRight size={14} strokeWidth={2.5} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h1 className="tf-title">
                      {q.title || "..."}
                      {q.required && <span className="tf-required"> *</span>}
                    </h1>
                    {q.description && <p className="tf-desc whitespace-pre-line">{q.description}</p>}

                    <div className="mt-8">
                      <QuestionAnswer
                        question={q}
                        value={answers[q.id]}
                        onChange={setAnswer}
                        onPick={(v) => {
                          const idx =
                            q.type === "yes_no"
                              ? v === "yes" ? 0 : 1
                              : q.choices.findIndex((c) => c.id === v);
                          pick(v, idx >= 0 ? idx : null);
                        }}
                        autoFocus
                        blink={blink}
                      />
                    </div>

                    <div className="mt-6 flex min-h-11 flex-wrap items-center gap-3">
                      {error ? (
                        <span className="tf-error" role="alert">
                          <TriangleAlert size={15} /> {error}
                        </span>
                      ) : (
                        <>
                          <button className="tf-btn" onClick={() => next()} disabled={submitting}>
                            {isLast ? "Submit" : "OK"}
                            {submitting ? (
                              <LoaderCircle size={18} className="animate-spin" />
                            ) : (
                              !isLast && <Check size={18} strokeWidth={3} />
                            )}
                          </button>
                          {q.type !== "long_text" && (
                            <span className="tf-hint hidden items-center gap-1 sm:inline-flex">
                              press <b>Enter</b> <CornerDownLeft size={12} />
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyForm />
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Bottom-right navigation */}
      {!done && step !== WELCOME && total > 0 && (
        <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2 sm:bottom-6 sm:right-6">
          <span className="tf-btn !hidden !px-2.5 !py-1 !text-xs !font-semibold sm:!inline-flex">
            Made with Typeform Clone
          </span>
          <div className="tf-nav">
            <button onClick={prev} disabled={step <= 0} aria-label="Previous question">
              <ChevronUp size={22} />
            </button>
            <button onClick={() => next()} disabled={submitting} aria-label="Next question">
              <ChevronDown size={22} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function WelcomeScreen({ form, onStart }: { form: PublicForm; onStart: () => void }) {
  return (
    <div className="max-w-[720px] text-center">
      <h1 className="tf-title !text-[32px] !leading-[42px] sm:!text-[36px]">{form.welcome_title || form.title}</h1>
      {form.welcome_description && <p className="tf-desc mx-auto mt-3 max-w-xl">{form.welcome_description}</p>}
      <div className="mt-8 flex items-center justify-center gap-3">
        <button className="tf-btn" onClick={onStart} autoFocus>
          {form.welcome_button || "Start"}
        </button>
        <span className="tf-hint hidden items-center gap-1 sm:inline-flex">
          press <b>Enter</b> <CornerDownLeft size={12} />
        </span>
      </div>
    </div>
  );
}

function EndScreen({ title, description }: { title: string; description: string }) {
  return (
    <div className="max-w-[720px] text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 18 }}
        className="tf-btn mx-auto mb-6 !flex h-14 w-14 items-center justify-center !rounded-full !p-0"
      >
        <Check size={28} strokeWidth={3} />
      </motion.div>
      <h1 className="tf-title !text-[28px] !leading-[38px]">{title || "Thanks for completing this typeform"}</h1>
      {description && <p className="tf-desc mx-auto mt-3 max-w-xl">{description}</p>}
    </div>
  );
}

function EmptyForm() {
  return (
    <div className="text-center">
      <h1 className="tf-title">This form has no questions yet.</h1>
      <p className="tf-desc">Add a question in the builder to see it here.</p>
    </div>
  );
}
