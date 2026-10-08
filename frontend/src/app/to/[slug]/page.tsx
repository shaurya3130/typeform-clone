"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import FormRunner from "@/components/runner/FormRunner";
import { api, ApiError } from "@/lib/api";
import type { Answers, PublicForm } from "@/lib/types";

/** Public, no-auth respondent page: /to/<slug> */
export default function PublicFormPage() {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<PublicForm | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getPublicForm(slug)
      .then((f) => {
        setForm(f);
        document.title = f.title;
        void api.registerView(slug);
      })
      .catch((e: ApiError) => setError(e.message));
  }, [slug]);

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="text-5xl">🔒</div>
        <h1 className="text-2xl font-semibold">This typeform isn&apos;t accepting responses</h1>
        <p className="text-ink-soft">It may have been unpublished or the link is incorrect.</p>
      </main>
    );
  }

  if (!form) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-1 w-40 overflow-hidden rounded bg-black/10">
          <div className="h-full w-1/3 animate-[loading_1s_ease-in-out_infinite] bg-ink" />
        </div>
        <style>{`@keyframes loading{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>
      </main>
    );
  }

  return <FormRunner form={form} onSubmit={async (answers: Answers) => void (await api.submit(slug, answers))} />;
}
