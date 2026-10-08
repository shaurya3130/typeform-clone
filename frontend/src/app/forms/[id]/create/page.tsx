"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import AddQuestionModal from "@/components/builder/AddQuestionModal";
import Canvas from "@/components/builder/Canvas";
import { useFormEditor } from "@/components/builder/FormEditorContext";
import QuestionList, { type Selection } from "@/components/builder/QuestionList";
import SettingsPanel from "@/components/builder/SettingsPanel";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import type { QuestionType } from "@/lib/types";

/** The builder: question list | live editable canvas | settings. */
export default function CreatePage() {
  const { form, addQuestion, deleteQuestion } = useFormEditor();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  // Select the first item on load.
  useEffect(() => {
    if (selection) return;
    if (form.questions[0]) setSelection({ kind: "question", id: form.questions[0].id });
    else if (form.welcome_enabled) setSelection({ kind: "welcome" });
  }, [form.questions, form.welcome_enabled, selection]);

  const add = async (type: QuestionType) => {
    setAdding(false);
    const currentIndex = selection?.kind === "question" ? form.questions.findIndex((q) => q.id === selection.id) : -1;
    const q = await addQuestion(type, currentIndex >= 0 ? currentIndex + 1 : undefined);
    if (q) setSelection({ kind: "question", id: q.id });
  };

  const remove = async (id: number) => {
    const idx = form.questions.findIndex((q) => q.id === id);
    const neighbor = form.questions[idx + 1] ?? form.questions[idx - 1];
    setConfirmDelete(null);
    await deleteQuestion(id);
    setSelection(neighbor ? { kind: "question", id: neighbor.id } : null);
    toast.success("Question deleted");
  };

  const toDelete = form.questions.find((q) => q.id === confirmDelete);

  return (
    <>
      <QuestionList selection={selection} onSelect={setSelection} onAdd={() => setAdding(true)} onDelete={setConfirmDelete} />
      <Canvas selection={selection} onAdd={() => setAdding(true)} />
      <SettingsPanel selection={selection} onDelete={setConfirmDelete} />

      <AddQuestionModal open={adding} onClose={() => setAdding(false)} onPick={add} />
      <Modal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Delete this question?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => confirmDelete !== null && remove(confirmDelete)}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">
          &ldquo;{toDelete?.title || "Untitled question"}&rdquo; will be removed from the form. Existing responses keep
          their answers.
        </p>
      </Modal>
    </>
  );
}
