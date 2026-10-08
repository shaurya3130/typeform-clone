"use client";

import { ChevronDown, Trash } from "lucide-react";
import { useState } from "react";
import Toggle from "@/components/ui/Toggle";
import { FONTS, resolveTheme, THEME_PRESETS } from "@/lib/theme";
import { QUESTION_TYPES, TYPE_META } from "@/lib/questionTypes";
import type { Question, QuestionType, Theme } from "@/lib/types";
import { useFormEditor } from "./FormEditorContext";
import type { Selection } from "./QuestionList";

function Row({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="border-b border-line py-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium">{label}</span>
        {children}
      </div>
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

const inputCls = "h-8 rounded-md border border-line bg-white px-2 text-[13px] outline-none focus:border-ink";

function NumberSetting({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
}) {
  return (
    <Row label={label}>
      <input
        type="number"
        className={`${inputCls} w-24`}
        value={value ?? ""}
        placeholder="None"
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
    </Row>
  );
}

function QuestionSettings({ q, onDelete }: { q: Question; onDelete: () => void }) {
  const { updateQuestion, changeType } = useFormEditor();
  const Icon = TYPE_META[q.type].icon;

  return (
    <div>
      <div className="border-b border-line pb-3.5">
        <span className="mb-1.5 block text-[13px] font-medium">Question type</span>
        <div className="relative">
          <Icon size={15} className="pointer-events-none absolute left-2.5 top-2.5" />
          <select
            aria-label="Question type"
            value={q.type}
            onChange={(e) => void changeType(q.id, e.target.value as QuestionType)}
            className={`${inputCls} h-9 w-full appearance-none pl-8 pr-8`}
          >
            {QUESTION_TYPES.map((t) => (
              <option key={t.type} value={t.type}>
                {t.label}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-3 text-ink-soft" />
        </div>
      </div>

      <Row label="Required" hint="Respondents must answer before moving on.">
        <Toggle label="Required" checked={q.required} onChange={(required) => updateQuestion(q.id, { required })} />
      </Row>

      {q.type === "rating" && (
        <Row label="Steps">
          <select
            className={inputCls}
            value={q.settings.scale ?? 5}
            onChange={(e) => updateQuestion(q.id, { settings: { scale: Number(e.target.value) } })}
          >
            {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Row>
      )}

      {q.type === "number" && (
        <>
          <NumberSetting label="Min number" value={q.settings.min} onChange={(min) => updateQuestion(q.id, { settings: { min } })} />
          <NumberSetting label="Max number" value={q.settings.max} onChange={(max) => updateQuestion(q.id, { settings: { max } })} />
        </>
      )}

      {(q.type === "multiple_choice" || q.type === "dropdown") && (
        <Row label="Choices" hint="Edit choices directly on the canvas. Press Enter to add another.">
          <span className="text-xs text-ink-soft">{q.choices.length}</span>
        </Row>
      )}

      {q.type === "email" && <Row label="Validation" hint="Answers must be a valid email address."><span className="text-xs text-ink-soft">On</span></Row>}

      <Row label="Logic jumps" hint="Send respondents to different questions based on answers.">
        <span className="rounded bg-[#fbe5a6] px-1.5 py-0.5 text-[10px] font-semibold text-[#6b4e00]">Soon</span>
      </Row>

      <button
        onClick={onDelete}
        className="mt-4 inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] text-[#c4122f] hover:bg-[#c4122f]/5"
      >
        <Trash size={14} /> Delete question
      </button>
    </div>
  );
}

function WelcomeSettings() {
  const { form, updateForm } = useFormEditor();
  return (
    <div>
      <Row label="Show welcome screen">
        <Toggle label="Show welcome screen" checked={form.welcome_enabled} onChange={(welcome_enabled) => updateForm({ welcome_enabled })} />
      </Row>
      <div className="py-3.5">
        <span className="mb-1.5 block text-[13px] font-medium">Button text</span>
        <input
          className={`${inputCls} w-full`}
          value={form.welcome_button}
          maxLength={24}
          onChange={(e) => updateForm({ welcome_button: e.target.value })}
        />
      </div>
    </div>
  );
}

function EndingSettings() {
  return (
    <div className="py-3.5 text-[13px] text-ink-soft">
      Edit the thank-you title and message directly on the canvas.
      <div className="mt-4 rounded-md border border-dashed border-line p-3">
        <span className="mb-1 block font-medium text-ink">Redirect on completion</span>
        Send respondents to a URL after submitting — coming soon.
      </div>
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Row label={label}>
      <label className="flex items-center gap-2">
        <span className="font-mono text-xs uppercase text-ink-soft">{value}</span>
        <span className="relative h-7 w-7 overflow-hidden rounded-md border border-line" style={{ background: value }}>
          <input
            type="color"
            aria-label={label}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </span>
      </label>
    </Row>
  );
}

function DesignSettings() {
  const { form, updateForm } = useFormEditor();
  const t = resolveTheme(form.theme);
  const set = (patch: Theme) => updateForm({ theme: patch });

  return (
    <div>
      <p className="mb-2 text-[13px] font-medium">Themes</p>
      <div className="grid grid-cols-2 gap-2">
        {THEME_PRESETS.map((p) => {
          const active = (Object.keys(p.theme) as (keyof Theme)[]).every(
            (k) => String(t[k]).toLowerCase() === String(p.theme[k]).toLowerCase(),
          );
          return (
            <button
              key={p.name}
              onClick={() => set(p.theme)}
              className={`overflow-hidden rounded-md border text-left ${active ? "border-ink ring-1 ring-ink" : "border-line hover:border-ink-soft"}`}
            >
              <div className="flex h-14 flex-col justify-center px-2.5" style={{ background: p.theme.background, fontFamily: p.theme.font }}>
                <span className="text-[13px]" style={{ color: p.theme.question }}>
                  Question
                </span>
                <span className="text-[12px]" style={{ color: p.theme.answer }}>
                  Answer
                </span>
                <span className="mt-1 h-1.5 w-6 rounded-full" style={{ background: p.theme.button }} />
              </div>
              <span className="block px-2 py-1 text-xs">{p.name}</span>
            </button>
          );
        })}
      </div>

      <p className="mb-1 mt-5 text-[13px] font-medium">Customize</p>
      <Row label="Font">
        <select className={inputCls} value={t.font} onChange={(e) => set({ font: e.target.value })}>
          {FONTS.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
      </Row>
      <ColorRow label="Background" value={t.background} onChange={(background) => set({ background })} />
      <ColorRow label="Questions" value={t.question} onChange={(question) => set({ question })} />
      <ColorRow label="Answers" value={t.answer} onChange={(answer) => set({ answer })} />
      <ColorRow label="Buttons" value={t.button} onChange={(button) => set({ button })} />
      <ColorRow label="Button text" value={t.button_text} onChange={(button_text) => set({ button_text })} />
      <Row label="Background image" hint="Upload your own image or video — coming soon.">
        <span className="rounded bg-[#fbe5a6] px-1.5 py-0.5 text-[10px] font-semibold text-[#6b4e00]">Soon</span>
      </Row>
    </div>
  );
}

export default function SettingsPanel({ selection, onDelete }: { selection: Selection | null; onDelete: (id: number) => void }) {
  const { form } = useFormEditor();
  const [tab, setTab] = useState<"content" | "design">("content");
  const q = selection?.kind === "question" ? form.questions.find((x) => x.id === selection.id) : undefined;

  return (
    <aside className="hidden w-72 flex-none flex-col border-l border-line bg-white lg:flex">
      <div className="flex border-b border-line px-2">
        {(["content", "design"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 py-3 text-[13px] capitalize ${tab === t ? "border-ink font-medium" : "border-transparent text-ink-soft hover:text-ink"}`}
          >
            {t === "content" ? "Question" : "Design"}
          </button>
        ))}
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto px-4 py-4">
        {tab === "design" ? (
          <DesignSettings />
        ) : q ? (
          <QuestionSettings q={q} onDelete={() => onDelete(q.id)} />
        ) : selection?.kind === "welcome" ? (
          <WelcomeSettings />
        ) : selection?.kind === "ending" ? (
          <EndingSettings />
        ) : (
          <p className="text-[13px] text-ink-soft">Select a question to edit its settings.</p>
        )}
      </div>
    </aside>
  );
}
