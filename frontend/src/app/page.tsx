"use client";

import { ChevronDown, Plus, Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import CreateFormModal from "@/components/dashboard/CreateFormModal";
import FormCard from "@/components/dashboard/FormCard";
import Button from "@/components/ui/Button";
import Logo from "@/components/ui/Logo";
import Modal from "@/components/ui/Modal";
import { api, ApiError } from "@/lib/api";
import { copyText, publicUrl } from "@/lib/format";
import type { FormSummary } from "@/lib/types";

type Sort = "updated" | "created" | "title";

export default function Dashboard() {
  const router = useRouter();
  const [forms, setForms] = useState<FormSummary[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<FormSummary | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleting, setDeleting] = useState<FormSummary | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("updated");

  const load = () =>
    api
      .listForms()
      .then(setForms)
      .catch((e: ApiError) => {
        setForms([]);
        toast.error(e.message);
      });

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    const list = (forms ?? []).filter((f) => f.title.toLowerCase().includes(query.toLowerCase()));
    return [...list].sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : sort === "created"
          ? b.created_at.localeCompare(a.created_at)
          : b.updated_at.localeCompare(a.updated_at),
    );
  }, [forms, query, sort]);

  const create = async (title: string) => {
    const f = await api.createForm(title);
    toast.success("Form created");
    router.push(`/forms/${f.id}/create`);
  };

  const rename = async () => {
    if (!renaming) return;
    const title = renameValue.trim() || "Untitled form";
    try {
      await api.updateForm(renaming.id, { title });
      setForms((fs) => fs?.map((f) => (f.id === renaming.id ? { ...f, title } : f)) ?? null);
      toast.success("Form renamed");
      setRenaming(null);
    } catch (e) {
      toast.error((e as ApiError).message);
    }
  };

  const duplicate = async (f: FormSummary) => {
    try {
      await api.duplicateForm(f.id);
      toast.success(`"${f.title}" duplicated`);
      void load();
    } catch (e) {
      toast.error((e as ApiError).message);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await api.deleteForm(deleting.id);
      setForms((fs) => fs?.filter((f) => f.id !== deleting.id) ?? null);
      toast.success("Form deleted");
      setDeleting(null);
    } catch (e) {
      toast.error((e as ApiError).message);
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-14 flex-none items-center justify-between border-b border-line px-4">
        <Logo />
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-ink-soft sm:inline">Default creator</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e2d6f7] text-sm font-semibold">S</div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <aside className="hidden w-60 flex-none flex-col gap-4 border-r border-line p-4 md:flex">
          <Button onClick={() => setCreating(true)} className="h-10 w-full">
            <Plus size={16} /> Create typeform
          </Button>
          <div>
            <div className="mb-1 flex items-center justify-between px-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Workspaces
              <Plus size={14} className="cursor-not-allowed opacity-50" />
            </div>
            <div className="flex items-center justify-between rounded-md bg-black/[0.05] px-2 py-1.5 text-sm font-medium">
              My workspace <span className="text-xs text-ink-soft">{forms?.length ?? ""}</span>
            </div>
          </div>
          <div className="mt-auto rounded-md border border-line p-3 text-xs text-ink-soft">
            <Users size={16} className="mb-1.5 text-ink" />
            <p className="font-medium text-ink">Team collaboration</p>
            Invite teammates to your workspace — coming soon.
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 overflow-y-auto bg-canvas">
          <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-2xl font-semibold">My workspace</h1>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={15} className="absolute left-2.5 top-2.5 text-ink-soft" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search"
                    className="h-9 w-40 rounded-md border border-line bg-white pl-8 pr-2 text-sm outline-none focus:border-ink sm:w-52"
                  />
                </div>
                <div className="relative">
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as Sort)}
                    className="h-9 appearance-none rounded-md border border-line bg-white pl-3 pr-8 text-sm outline-none"
                    aria-label="Sort forms"
                  >
                    <option value="updated">Date updated</option>
                    <option value="created">Date created</option>
                    <option value="title">Alphabetical</option>
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-3 text-ink-soft" />
                </div>
                <Button onClick={() => setCreating(true)} className="md:hidden">
                  <Plus size={16} />
                </Button>
              </div>
            </div>

            {forms === null ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="aspect-[16/14] animate-pulse rounded-lg bg-black/[0.05]" />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center rounded-lg border border-dashed border-line bg-white py-16 text-center">
                <p className="text-lg font-medium">{query ? "No forms match your search" : "No forms yet"}</p>
                <p className="mb-4 mt-1 text-sm text-ink-soft">Create your first typeform to start collecting responses.</p>
                <Button onClick={() => setCreating(true)}>
                  <Plus size={16} /> Create typeform
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                <button
                  onClick={() => setCreating(true)}
                  className="flex aspect-[16/14] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#bdbdbd] bg-white text-sm font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
                >
                  <Plus size={22} /> New form
                </button>
                {visible.map((f) => (
                  <FormCard
                    key={f.id}
                    form={f}
                    onRename={() => {
                      setRenaming(f);
                      setRenameValue(f.title);
                    }}
                    onDuplicate={() => duplicate(f)}
                    onDelete={() => setDeleting(f)}
                    onCopyLink={async () => {
                      await copyText(publicUrl(f.slug));
                      toast.success("Link copied");
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <CreateFormModal open={creating} onClose={() => setCreating(false)} onCreate={create} />

      <Modal
        open={!!renaming}
        onClose={() => setRenaming(null)}
        title="Rename form"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button onClick={rename}>Save</Button>
          </>
        }
      >
        <input
          autoFocus
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && rename()}
          className="h-10 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-ink"
        />
      </Modal>

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this form?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={remove}>
              Delete form
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">
          <b className="text-ink">{deleting?.title}</b> and all of its{" "}
          {deleting?.response_count ? `${deleting.response_count} responses` : "responses"} will be permanently deleted.
          This can&apos;t be undone.
        </p>
      </Modal>
    </div>
  );
}
