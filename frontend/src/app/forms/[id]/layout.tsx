"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FormEditorProvider } from "@/components/builder/FormEditorContext";
import FormTopBar from "@/components/builder/FormTopBar";
import PreviewModal from "@/components/builder/PreviewModal";
import { api, ApiError } from "@/lib/api";
import type { FormDetail } from "@/lib/types";

/** Shared shell for /forms/[id]/* — loads the form once, provides the editor context. */
export default function FormLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<FormDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getForm(Number(id))
      .then((f) => {
        setForm(f);
        document.title = `${f.title} · Typeform Clone`;
      })
      .catch((e: ApiError) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <p className="text-lg font-medium">{error}</p>
        <Link href="/" className="text-sm underline">
          Back to workspace
        </Link>
      </div>
    );
  }
  if (!form) {
    return (
      <div className="flex h-screen flex-col">
        <div className="h-14 border-b border-line" />
        <div className="flex flex-1 items-center justify-center bg-canvas text-sm text-ink-soft">Loading form…</div>
      </div>
    );
  }

  return (
    <FormEditorProvider initial={form}>
      <div className="flex h-screen flex-col">
        <FormTopBar />
        <div className="flex min-h-0 flex-1">{children}</div>
      </div>
      <PreviewModal />
    </FormEditorProvider>
  );
}
