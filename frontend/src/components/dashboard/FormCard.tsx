"use client";

import { ChartColumn, Copy, Ellipsis, Link as LinkIcon, Pencil, SquarePen, Trash } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Dropdown from "@/components/ui/Dropdown";
import { timeAgo } from "@/lib/format";
import { resolveTheme } from "@/lib/theme";
import type { FormSummary } from "@/lib/types";

interface Props {
  form: FormSummary;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onCopyLink: () => void;
}

export default function FormCard({ form, onRename, onDuplicate, onDelete, onCopyLink }: Props) {
  const router = useRouter();
  const theme = resolveTheme(form.theme);
  const live = form.status === "published";

  return (
    <Link
      href={`/forms/${form.id}/create`}
      className="group flex flex-col rounded-lg border border-line bg-white transition-shadow hover:shadow-[0_6px_18px_rgba(0,0,0,0.08)]"
    >
      {/* Thumbnail rendered with the form's own theme */}
      <div
        className="relative flex aspect-[16/11] items-center justify-center rounded-t-lg px-4 text-center"
        style={{ background: theme.background, color: theme.question, fontFamily: theme.font }}
      >
        <span className="line-clamp-3 text-[15px] leading-snug">{form.title}</span>
        <span className="absolute bottom-2.5 left-3 h-1.5 w-8 rounded-full" style={{ background: theme.button }} />
        <span
          className={`absolute right-2 top-2 rounded px-1.5 py-0.5 text-[11px] font-semibold ${
            live ? "bg-[#d3ebd8] text-[#1b5e2f]" : "bg-[#ececec] text-ink-soft"
          }`}
        >
          {live ? "Live" : "Draft"}
        </span>
      </div>
      <div className="flex items-start justify-between gap-2 border-t border-line px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{form.title}</p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {form.response_count === 0
              ? "No responses"
              : `${form.response_count} response${form.response_count === 1 ? "" : "s"}`}{" "}
            · Updated {timeAgo(form.updated_at)}
          </p>
        </div>
        <Dropdown
          trigger={
            <span className="flex h-7 w-7 items-center justify-center rounded text-ink-soft hover:bg-black/5" aria-label="Form actions">
              <Ellipsis size={18} />
            </span>
          }
          items={[
            { label: "Edit", icon: <SquarePen size={15} />, onClick: () => router.push(`/forms/${form.id}/create`) },
            { label: "Results", icon: <ChartColumn size={15} />, onClick: () => router.push(`/forms/${form.id}/results`) },
            { label: "Rename", icon: <Pencil size={15} />, onClick: onRename },
            { label: "Duplicate", icon: <Copy size={15} />, onClick: onDuplicate },
            ...(live ? [{ label: "Copy link", icon: <LinkIcon size={15} />, onClick: onCopyLink }] : []),
            { label: "Delete", icon: <Trash size={15} />, onClick: onDelete, danger: true },
          ]}
        />
      </div>
    </Link>
  );
}
