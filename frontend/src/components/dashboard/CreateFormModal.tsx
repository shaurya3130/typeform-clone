"use client";

import { Sparkles, Upload, LayoutGrid } from "lucide-react";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

export default function CreateFormModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (title: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setTitle("");
  }, [open]);

  const submit = async () => {
    setBusy(true);
    try {
      await onCreate(title.trim() || "My new form");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create a new form" width={560}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <p className="mb-2 text-sm font-medium">Start from scratch</p>
        <div className="flex gap-2">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your form a name"
            className="h-10 flex-1 rounded-md border border-line px-3 text-sm outline-none focus:border-ink"
          />
          <Button type="submit" disabled={busy} className="h-10">
            {busy ? "Creating…" : "Create"}
          </Button>
        </div>
      </form>
      <p className="mb-2 mt-6 text-sm font-medium text-ink-soft">More ways to start</p>
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: LayoutGrid, label: "Use a template" },
          { icon: Sparkles, label: "Create with AI" },
          { icon: Upload, label: "Import questions" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="relative rounded-md border border-dashed border-line p-3 text-sm text-ink-soft">
            <Icon size={18} className="mb-2" />
            {label}
            <span className="absolute right-2 top-2 rounded bg-[#fbe5a6] px-1.5 text-[10px] font-semibold text-[#6b4e00]">
              Soon
            </span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
