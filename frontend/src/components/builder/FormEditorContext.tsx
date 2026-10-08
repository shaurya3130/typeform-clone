"use client";

/**
 * Holds the form being edited and every mutation the builder can make.
 *
 * Edits are applied to local state immediately (so the live preview updates on
 * every keystroke) and persisted to the API with a short debounce. Structural
 * changes (add / delete / reorder / change type) are saved immediately.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { api, ApiError, type FormPatch, type QuestionPatch } from "@/lib/api";
import type { FormDetail, Question, QuestionType } from "@/lib/types";

const DEBOUNCE_MS = 600;

export type SaveState = "idle" | "saving" | "saved" | "error";

interface Ctx {
  form: FormDetail;
  saveState: SaveState;
  previewOpen: boolean;
  setPreviewOpen: (v: boolean) => void;
  updateForm: (patch: FormPatch) => void;
  updateQuestion: (id: number, patch: QuestionPatch) => void;
  changeType: (id: number, type: QuestionType) => Promise<void>;
  addQuestion: (type: QuestionType, position?: number) => Promise<Question | null>;
  duplicateQuestion: (id: number) => Promise<Question | null>;
  deleteQuestion: (id: number) => Promise<void>;
  reorder: (ids: number[]) => Promise<void>;
  setStatus: (status: "draft" | "published") => Promise<boolean>;
}

const FormEditorContext = createContext<Ctx | null>(null);

export function useFormEditor() {
  const ctx = useContext(FormEditorContext);
  if (!ctx) throw new Error("useFormEditor must be used inside <FormEditorProvider>");
  return ctx;
}

export function FormEditorProvider({ initial, children }: { initial: FormDetail; children: React.ReactNode }) {
  const [form, setForm] = useState<FormDetail>(initial);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [previewOpen, setPreviewOpen] = useState(false);

  const inFlight = useRef(0);
  const formPatch = useRef<FormPatch>({});
  const formTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qPatches = useRef(new Map<number, QuestionPatch>());
  const qTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const formRef = useRef(form);
  formRef.current = form;

  /** Wrap every API call so the top bar can show Saving… / Saved. */
  const track = useCallback(async <T,>(p: Promise<T>): Promise<T | null> => {
    inFlight.current += 1;
    setSaveState("saving");
    try {
      const r = await p;
      return r;
    } catch (e) {
      setSaveState("error");
      toast.error((e as ApiError).message || "Couldn't save your changes");
      return null;
    } finally {
      inFlight.current -= 1;
      if (inFlight.current === 0) setSaveState((s) => (s === "error" ? s : "saved"));
    }
  }, []);

  // ---------- Form-level fields ----------
  const updateForm = useCallback(
    (patch: FormPatch) => {
      setForm((f) => ({ ...f, ...patch, theme: patch.theme ? { ...f.theme, ...patch.theme } : f.theme }));
      formPatch.current = {
        ...formPatch.current,
        ...patch,
        theme: patch.theme ? { ...(formPatch.current.theme ?? {}), ...patch.theme } : formPatch.current.theme,
      };
      if (formTimer.current) clearTimeout(formTimer.current);
      setSaveState("saving");
      formTimer.current = setTimeout(() => {
        const p = formPatch.current;
        formPatch.current = {};
        void track(api.updateForm(formRef.current.id, p)).then((saved) => {
          if (saved) setForm((f) => ({ ...f, updated_at: saved.updated_at }));
        });
      }, DEBOUNCE_MS);
    },
    [track],
  );

  // ---------- Questions ----------
  const replaceQuestion = (q: Question) =>
    setForm((f) => ({ ...f, questions: f.questions.map((x) => (x.id === q.id ? q : x)) }));

  const flushQuestion = useCallback(
    (id: number) => {
      const patch = qPatches.current.get(id);
      qPatches.current.delete(id);
      qTimers.current.delete(id);
      if (!patch) return;
      void track(api.updateQuestion(formRef.current.id, id, patch)).then((saved) => {
        if (!saved) return;
        // Give newly created choices their server ids (positional), keep local labels.
        setForm((f) => ({
          ...f,
          questions: f.questions.map((x) => {
            if (x.id !== id || x.choices.length !== saved.choices.length) return x;
            return {
              ...x,
              choices: x.choices.map((c, i) => (c.id === undefined ? { ...c, id: saved.choices[i].id } : c)),
            };
          }),
        }));
      });
    },
    [track],
  );

  const updateQuestion = useCallback(
    (id: number, patch: QuestionPatch) => {
      setForm((f) => ({
        ...f,
        questions: f.questions.map((q) =>
          q.id === id ? { ...q, ...patch, settings: patch.settings ? { ...q.settings, ...patch.settings } : q.settings } : q,
        ),
      }));
      const prev = qPatches.current.get(id) ?? {};
      qPatches.current.set(id, {
        ...prev,
        ...patch,
        settings: patch.settings ? { ...(prev.settings ?? {}), ...patch.settings } : prev.settings,
      });
      const t = qTimers.current.get(id);
      if (t) clearTimeout(t);
      setSaveState("saving");
      qTimers.current.set(id, setTimeout(() => flushQuestion(id), DEBOUNCE_MS));
    },
    [flushQuestion],
  );

  const cancelPending = (id: number) => {
    const t = qTimers.current.get(id);
    if (t) clearTimeout(t);
    qTimers.current.delete(id);
    qPatches.current.delete(id);
  };

  const changeType = useCallback(
    async (id: number, type: QuestionType) => {
      // Flush text edits first, then switch type and take the server's version.
      const pending = qPatches.current.get(id);
      cancelPending(id);
      const saved = await track(api.updateQuestion(formRef.current.id, id, { ...(pending ?? {}), type }));
      if (saved) replaceQuestion(saved);
    },
    [track],
  );

  const addQuestion = useCallback(
    async (type: QuestionType, position?: number) => {
      const q = await track(api.addQuestion(formRef.current.id, type, position));
      if (!q) return null;
      setForm((f) => {
        const qs = [...f.questions];
        qs.splice(position ?? qs.length, 0, q);
        return { ...f, questions: qs.map((x, i) => ({ ...x, position: i })) };
      });
      return q;
    },
    [track],
  );

  const duplicateQuestion = useCallback(
    async (id: number) => {
      const src = formRef.current.questions.find((q) => q.id === id);
      if (!src) return null;
      const created = await track(api.addQuestion(formRef.current.id, src.type, src.position + 1));
      if (!created) return null;
      const copy = await track(
        api.updateQuestion(formRef.current.id, created.id, {
          title: src.title,
          description: src.description,
          required: src.required,
          settings: src.settings,
          choices: src.type === "multiple_choice" || src.type === "dropdown" ? src.choices.map((c) => ({ ...c, id: undefined })) : undefined,
        }),
      );
      const q = copy ?? created;
      setForm((f) => {
        const qs = [...f.questions];
        qs.splice(src.position + 1, 0, q);
        return { ...f, questions: qs.map((x, i) => ({ ...x, position: i })) };
      });
      return q;
    },
    [track],
  );

  const deleteQuestion = useCallback(
    async (id: number) => {
      cancelPending(id);
      const before = formRef.current.questions;
      setForm((f) => ({
        ...f,
        questions: f.questions.filter((q) => q.id !== id).map((x, i) => ({ ...x, position: i })),
      }));
      const ok = await track(api.deleteQuestion(formRef.current.id, id).then(() => true));
      if (!ok) setForm((f) => ({ ...f, questions: before }));
    },
    [track],
  );

  const reorder = useCallback(
    async (ids: number[]) => {
      const before = formRef.current.questions;
      const byId = new Map(before.map((q) => [q.id, q]));
      setForm((f) => ({ ...f, questions: ids.map((id, i) => ({ ...byId.get(id)!, position: i })) }));
      const ok = await track(api.reorderQuestions(formRef.current.id, ids));
      if (!ok) setForm((f) => ({ ...f, questions: before }));
    },
    [track],
  );

  const setStatus = useCallback(
    async (status: "draft" | "published") => {
      // Make sure nothing is still waiting in a debounce before publishing.
      for (const id of [...qTimers.current.keys()]) {
        clearTimeout(qTimers.current.get(id)!);
        flushQuestion(id);
      }
      const saved = await track(status === "published" ? api.publish(form.id) : api.unpublish(form.id));
      if (!saved) return false;
      setForm((f) => ({ ...f, status: saved.status, published_at: saved.published_at }));
      return true;
    },
    [form.id, track, flushQuestion],
  );

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (saveState === "saving") e.preventDefault();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [saveState]);

  return (
    <FormEditorContext.Provider
      value={{
        form,
        saveState,
        previewOpen,
        setPreviewOpen,
        updateForm,
        updateQuestion,
        changeType,
        addQuestion,
        duplicateQuestion,
        deleteQuestion,
        reorder,
        setStatus,
      }}
    >
      {children}
    </FormEditorContext.Provider>
  );
}
