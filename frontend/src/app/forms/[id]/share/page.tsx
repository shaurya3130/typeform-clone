"use client";

import { Code, Copy, ExternalLink, Mail, QrCode, Users } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useFormEditor } from "@/components/builder/FormEditorContext";
import Button from "@/components/ui/Button";
import Toggle from "@/components/ui/Toggle";
import { copyText, publicUrl } from "@/lib/format";

export default function SharePage() {
  const { form, setStatus } = useFormEditor();
  const [url, setUrl] = useState(`/to/${form.slug}`);
  const [busy, setBusy] = useState(false);
  const live = form.status === "published";

  useEffect(() => setUrl(publicUrl(form.slug)), [form.slug]);

  const toggle = async (on: boolean) => {
    setBusy(true);
    const ok = await setStatus(on ? "published" : "draft");
    setBusy(false);
    if (ok) toast.success(on ? "Form published — it's accepting responses" : "Form unpublished — the link is now closed");
  };

  return (
    <div className="flex-1 overflow-y-auto bg-canvas">
      <div className="mx-auto max-w-3xl px-5 py-8">
        <h1 className="text-2xl font-semibold">Share your form</h1>
        <p className="mt-1 text-sm text-ink-soft">Anyone with the link can respond — no login required.</p>

        <div className="mt-6 rounded-lg border border-line bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">{live ? "Your form is live" : "Your form is a draft"}</p>
              <p className="text-sm text-ink-soft">
                {live ? "The link below is open for responses." : "Publish it to open the link to respondents."}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-ink-soft">{live ? "Published" : "Unpublished"}</span>
              <Toggle label="Published" checked={live} onChange={(v) => !busy && toggle(v)} />
            </div>
          </div>

          <div className={`mt-5 flex flex-col gap-2 sm:flex-row ${live ? "" : "pointer-events-none opacity-50"}`}>
            <input
              readOnly
              value={url}
              aria-label="Public link"
              onFocus={(e) => e.target.select()}
              className="h-10 flex-1 rounded-md border border-line bg-canvas px-3 font-mono text-sm outline-none"
            />
            <Button
              className="h-10"
              onClick={async () => {
                await copyText(url);
                toast.success("Link copied to clipboard");
              }}
            >
              <Copy size={15} /> Copy link
            </Button>
            <a href={url} target="_blank" rel="noreferrer">
              <Button variant="secondary" className="h-10 w-full">
                <ExternalLink size={15} /> Open
              </Button>
            </a>
          </div>
        </div>

        <p className="mb-2 mt-8 text-sm font-medium">More ways to share</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: Code, label: "Embed in a web page" },
            { icon: Mail, label: "Send by email" },
            { icon: QrCode, label: "QR code" },
            { icon: Users, label: "Invite collaborators" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="relative rounded-lg border border-line bg-white p-4 text-sm text-ink-soft">
              <Icon size={20} className="mb-3 text-ink" />
              {label}
              <span className="absolute right-2 top-2 rounded bg-[#fbe5a6] px-1.5 text-[10px] font-semibold text-[#6b4e00]">
                Soon
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
