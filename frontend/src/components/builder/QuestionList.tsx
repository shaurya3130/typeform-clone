"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, Ellipsis, Flag, GripVertical, Hand, Plus, Trash } from "lucide-react";
import Dropdown from "@/components/ui/Dropdown";
import type { Question } from "@/lib/types";
import { useFormEditor } from "./FormEditorContext";
import { TypeChip } from "./TypeChip";

export type Selection = { kind: "question"; id: number } | { kind: "welcome" } | { kind: "ending" };

function SortableRow({
  q,
  index,
  selected,
  onSelect,
  onDuplicate,
  onDelete,
}: {
  q: Question;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: q.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group relative flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 ${
        selected ? "bg-[#ececec]" : "hover:bg-black/[0.04]"
      } ${isDragging ? "z-10 bg-white shadow-lg ring-1 ring-line" : ""}`}
      onClick={onSelect}
      {...attributes}
      {...listeners}
      aria-label={`Question ${index + 1}: ${q.title || "Untitled"}`}
    >
      <GripVertical size={14} className="-ml-1 flex-none text-ink-soft opacity-0 group-hover:opacity-100" />
      <TypeChip type={q.type} number={index + 1} />
      <span className={`min-w-0 flex-1 truncate text-[13px] ${q.title ? "" : "text-ink-soft"}`}>
        {q.title || "..."}
        {q.required && <span className="text-ink-soft"> *</span>}
      </span>
      <div className="opacity-0 group-hover:opacity-100" onPointerDown={(e) => e.stopPropagation()}>
        <Dropdown
          trigger={
            <span className="flex h-6 w-6 items-center justify-center rounded hover:bg-black/10" aria-label="Question actions">
              <Ellipsis size={15} />
            </span>
          }
          items={[
            { label: "Duplicate", icon: <Copy size={14} />, onClick: onDuplicate },
            { label: "Delete", icon: <Trash size={14} />, onClick: onDelete, danger: true },
          ]}
        />
      </div>
    </div>
  );
}

export default function QuestionList({
  selection,
  onSelect,
  onAdd,
  onDelete,
}: {
  selection: Selection | null;
  onSelect: (s: Selection) => void;
  onAdd: () => void;
  onDelete: (id: number) => void;
}) {
  const { form, reorder, duplicateQuestion, updateForm } = useFormEditor();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const ids = form.questions.map((q) => q.id);
    void reorder(arrayMove(ids, ids.indexOf(Number(active.id)), ids.indexOf(Number(over.id))));
  };

  return (
    <aside className="flex w-64 flex-none flex-col border-r border-line bg-white xl:w-72">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <span className="text-sm font-semibold">Content</span>
        <button
          onClick={onAdd}
          className="flex h-7 w-7 items-center justify-center rounded-md bg-ink text-white hover:bg-black"
          aria-label="Add question"
          title="Add question"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto px-2 pb-4">
        {/* Welcome screen */}
        {form.welcome_enabled ? (
          <button
            onClick={() => onSelect({ kind: "welcome" })}
            className={`mb-1 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[13px] ${
              selection?.kind === "welcome" ? "bg-[#ececec]" : "hover:bg-black/[0.04]"
            }`}
          >
            <span className="inline-flex h-6 items-center rounded bg-[#ececec] px-1.5">
              <Hand size={13} />
            </span>
            <span className="truncate">{form.welcome_title || "Welcome screen"}</span>
          </button>
        ) : (
          <button
            onClick={() => {
              updateForm({ welcome_enabled: true, welcome_title: form.welcome_title || form.title });
              onSelect({ kind: "welcome" });
            }}
            className="mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-ink-soft hover:bg-black/[0.04] hover:text-ink"
          >
            <Plus size={13} /> Add welcome screen
          </button>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={form.questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
            {form.questions.map((q, i) => (
              <SortableRow
                key={q.id}
                q={q}
                index={i}
                selected={selection?.kind === "question" && selection.id === q.id}
                onSelect={() => onSelect({ kind: "question", id: q.id })}
                onDuplicate={async () => {
                  const copy = await duplicateQuestion(q.id);
                  if (copy) onSelect({ kind: "question", id: copy.id });
                }}
                onDelete={() => onDelete(q.id)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {form.questions.length === 0 && (
          <button
            onClick={onAdd}
            className="mt-2 w-full rounded-md border border-dashed border-line px-3 py-6 text-center text-sm text-ink-soft hover:border-ink hover:text-ink"
          >
            <Plus size={16} className="mx-auto mb-1" />
            Add your first question
          </button>
        )}

        <p className="mt-5 px-2 pb-1 text-xs font-semibold text-ink-soft">Endings</p>
        <button
          onClick={() => onSelect({ kind: "ending" })}
          className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[13px] ${
            selection?.kind === "ending" ? "bg-[#ececec]" : "hover:bg-black/[0.04]"
          }`}
        >
          <span className="inline-flex h-6 items-center rounded bg-[#ececec] px-1.5">
            <Flag size={13} />
          </span>
          <span className="truncate">{form.thank_you_title || "Thank you screen"}</span>
        </button>
      </div>
    </aside>
  );
}
