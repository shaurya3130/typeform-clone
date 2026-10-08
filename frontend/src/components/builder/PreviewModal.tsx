"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Monitor, RotateCcw, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import FormRunner from "@/components/runner/FormRunner";
import { useFormEditor } from "./FormEditorContext";

/** Full-screen preview of the draft — runs the real respondent flow, never submits. */
export default function PreviewModal() {
  const { form, previewOpen, setPreviewOpen } = useFormEditor();
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (!previewOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPreviewOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewOpen, setPreviewOpen]);

  return (
    <AnimatePresence>
      {previewOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col bg-[#2b2b2b]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="flex h-12 flex-none items-center justify-between px-4 text-white">
            <span className="text-sm opacity-80">Preview · responses are not saved</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setDevice("desktop")}
                className={`rounded p-1.5 ${device === "desktop" ? "bg-white/20" : "opacity-70 hover:bg-white/10"}`}
                aria-label="Desktop preview"
              >
                <Monitor size={17} />
              </button>
              <button
                onClick={() => setDevice("mobile")}
                className={`rounded p-1.5 ${device === "mobile" ? "bg-white/20" : "opacity-70 hover:bg-white/10"}`}
                aria-label="Mobile preview"
              >
                <Smartphone size={17} />
              </button>
              <button onClick={() => setRun((r) => r + 1)} className="ml-2 rounded p-1.5 opacity-70 hover:bg-white/10" aria-label="Restart">
                <RotateCcw size={17} />
              </button>
              <button onClick={() => setPreviewOpen(false)} className="ml-2 rounded p-1.5 hover:bg-white/10" aria-label="Close preview">
                <X size={19} />
              </button>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-4">
            <div
              className="relative h-full overflow-hidden rounded-lg bg-white shadow-2xl transition-[width] duration-300"
              style={{ width: device === "mobile" ? 390 : "100%", maxHeight: device === "mobile" ? 760 : undefined }}
            >
              <FormRunner key={`${run}-${device}`} form={form} contained onSubmit={async () => {}} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
