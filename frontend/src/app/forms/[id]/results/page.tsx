"use client";

import { Download } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useFormEditor } from "@/components/builder/FormEditorContext";
import ResponsesTable from "@/components/results/ResponsesTable";
import SummaryView from "@/components/results/SummaryView";
import { api, ApiError } from "@/lib/api";
import type { FormStats, ResponseRow } from "@/lib/types";

export default function ResultsPage() {
  const { form } = useFormEditor();
  const [tab, setTab] = useState<"summary" | "responses">("summary");
  const [stats, setStats] = useState<FormStats | null>(null);
  const [rows, setRows] = useState<ResponseRow[] | null>(null);

  const load = useCallback(() => {
    Promise.all([api.summary(form.id), api.listResponses(form.id)])
      .then(([s, r]) => {
        setStats(s);
        setRows(r);
      })
      .catch((e: ApiError) => toast.error(e.message));
  }, [form.id]);

  useEffect(load, [load]);

  const deleteRow = async (rid: number) => {
    try {
      await api.deleteResponse(form.id, rid);
      toast.success("Response deleted");
      load();
    } catch (e) {
      toast.error((e as ApiError).message);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-canvas">
      <div className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-3 px-5 pt-5">
          <div className="flex">
            {(["summary", "responses"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`border-b-2 px-3 pb-3 text-sm capitalize ${tab === t ? "border-ink font-medium" : "border-transparent text-ink-soft hover:text-ink"}`}
              >
                {t}
                {t === "responses" && rows ? <span className="ml-1.5 text-ink-soft">{rows.length}</span> : null}
              </button>
            ))}
          </div>
          <a href={api.csvUrl(form.id)} className="mb-2" download>
            <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-sm hover:bg-black/[0.03]">
              <Download size={14} /> Export CSV
            </span>
          </a>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-5 py-6">
        {/* Insight tiles */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            { label: "Views", value: stats?.views ?? "–" },
            { label: "Responses", value: stats?.response_count ?? "–" },
            { label: "Completion rate", value: stats?.completion_rate != null ? `${stats.completion_rate}%` : "–" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-line bg-white px-4 py-3">
              <p className="text-xs text-ink-soft">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold">{s.value}</p>
            </div>
          ))}
        </div>

        {!stats || !rows ? (
          <div className="h-40 animate-pulse rounded-lg bg-black/[0.04]" />
        ) : tab === "summary" ? (
          <SummaryView stats={stats} />
        ) : (
          <ResponsesTable form={form} rows={rows} onDelete={deleteRow} />
        )}
      </div>
    </div>
  );
}
