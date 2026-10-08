"use client";

import { Check, CircleCheck, Eye, LoaderCircle, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Logo from "@/components/ui/Logo";
import { useFormEditor } from "./FormEditorContext";

const TABS = [
  { slug: "create", label: "Create" },
  { slug: "workflow", label: "Workflow" },
  { slug: "connect", label: "Connect" },
  { slug: "share", label: "Share" },
  { slug: "results", label: "Results" },
];

function InlineTitle() {
  const { form, updateForm } = useFormEditor();
  const [value, setValue] = useState(form.title);
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setValue(form.title);
  }, [form.title, editing]);

  const commit = () => {
    setEditing(false);
    const title = value.trim() || "Untitled form";
    setValue(title);
    if (title !== form.title) {
      updateForm({ title });
      toast.success("Form renamed");
    }
  };

  return (
    <span className="relative inline-grid min-w-0 max-w-[260px] items-center">
      {/* invisible sizer keeps the input exactly as wide as its text */}
      <span className="invisible col-start-1 row-start-1 whitespace-pre px-1.5 text-sm font-medium">{value || " "}</span>
      <input
        ref={ref}
        aria-label="Form title"
        value={value}
        onFocus={() => setEditing(true)}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") ref.current?.blur();
          if (e.key === "Escape") {
            setValue(form.title);
            setTimeout(() => ref.current?.blur());
          }
        }}
        className="col-start-1 row-start-1 w-full min-w-0 truncate rounded px-1.5 py-1 text-sm font-medium outline-none hover:bg-black/5 focus:bg-white focus:ring-2 focus:ring-ink"
      />
    </span>
  );
}

function SaveIndicator() {
  const { saveState } = useFormEditor();
  if (saveState === "idle") return null;
  return (
    <span className="hidden items-center gap-1 text-xs text-ink-soft lg:inline-flex">
      {saveState === "saving" && (
        <>
          <LoaderCircle size={13} className="animate-spin" /> Saving…
        </>
      )}
      {saveState === "saved" && (
        <>
          <Check size={13} /> Saved
        </>
      )}
      {saveState === "error" && (
        <span className="inline-flex items-center gap-1 text-[#c4122f]">
          <TriangleAlert size={13} /> Not saved
        </span>
      )}
    </span>
  );
}

export default function FormTopBar() {
  const { form, setStatus, setPreviewOpen } = useFormEditor();
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const live = form.status === "published";

  const publish = async () => {
    setBusy(true);
    const ok = await setStatus("published");
    setBusy(false);
    if (ok) {
      toast.success("Your form is live! 🎉");
      router.push(`/forms/${form.id}/share`);
    }
  };

  return (
    <header className="relative z-30 flex h-14 flex-none items-center gap-3 border-b border-line bg-white px-3 sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <Logo compact />
        <Link href="/" className="ml-1 hidden whitespace-nowrap rounded px-1.5 py-1 text-sm text-ink-soft hover:bg-black/5 md:inline">
          My workspace
        </Link>
        <span className="hidden text-ink-soft md:inline">/</span>
        <InlineTitle />
      </div>

      <nav className="flex h-full items-stretch overflow-x-auto" aria-label="Form sections">
        {TABS.map((t) => {
          const active = pathname?.endsWith(`/${t.slug}`);
          return (
            <Link
              key={t.slug}
              href={`/forms/${form.id}/${t.slug}`}
              className={`flex items-center border-b-2 px-2.5 text-sm transition-colors sm:px-3 ${
                active ? "border-ink font-medium text-ink" : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-1 items-center justify-end gap-2">
        <SaveIndicator />
        <Button variant="secondary" onClick={() => setPreviewOpen(true)} aria-label="Preview" className="!px-2.5">
          <Eye size={16} />
          <span className="hidden sm:inline">Preview</span>
        </Button>
        {live ? (
          <Button variant="secondary" onClick={() => router.push(`/forms/${form.id}/share`)} className="whitespace-nowrap">
            <CircleCheck size={16} className="text-[#1b8a3c]" />
            <span className="hidden sm:inline">Published</span>
          </Button>
        ) : (
          <Button onClick={publish} disabled={busy || form.questions.length === 0} title={form.questions.length === 0 ? "Add a question first" : undefined}>
            {busy ? "Publishing…" : "Publish"}
          </Button>
        )}
      </div>
    </header>
  );
}
